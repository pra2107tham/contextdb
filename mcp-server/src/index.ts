import express from 'express'
import cors from 'cors'
import path from 'path'
import { config } from './config'
import { checkJwt } from './auth'
import { createContextDbServer } from './mcpServer'
import { InvalidRequestError, UnauthorizedError } from 'express-oauth2-jwt-bearer'
import { syncAuth0UserToSupabase } from './auth/userSync'

// Import MCP SDK transports using require with resolved path since subpath exports aren't available
// require.resolve resolves to dist/cjs/package.json, so we go up 2 levels to get to SDK root
const sdkPath = require.resolve('@modelcontextprotocol/sdk/package.json')
const sdkRoot = path.dirname(path.dirname(path.dirname(sdkPath)))
const { SSEServerTransport } = require(path.join(sdkRoot, 'dist/cjs/server/sse'))
const { StreamableHTTPServerTransport } = require(
  path.join(sdkRoot, 'dist/cjs/server/streamableHttp'),
)

// Map of sessionId -> SSE transport
const transports: Record<string, InstanceType<typeof SSEServerTransport>> = {}
// Map of sessionId -> Auth0 user id (sub)
const sessionUserIds: Record<string, string> = {}

function getUserIdForSession(sessionId?: string): string | undefined {
  if (!sessionId) return undefined
  return sessionUserIds[sessionId]
}

const app = express()
app.use(express.json())

// Request logging middleware - log ALL incoming requests for debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'authorization': req.headers.authorization ? 'Bearer ***' : 'missing',
      'x-authorization': req.headers['x-authorization'] ? 'present' : 'missing',
      'content-type': req.headers['content-type'],
      'origin': req.headers.origin,
      'referer': req.headers.referer,
    },
    body: req.body ? (typeof req.body === 'object' ? JSON.stringify(req.body).substring(0, 200) : 'present') : 'none',
  })
  next()
})

// Basic CORS (can be tightened later)
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  }),
)

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// OAuth discovery endpoint for Claude
// Per RFC 8414 and MCP spec, this tells Claude where to authenticate
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  console.log('🔍 [OAUTH DISCOVERY] Request received:', {
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    referer: req.headers.referer,
    timestamp: new Date().toISOString(),
  })
  
  const response = {
    authorization_servers: [config.auth0.issuerBaseURL],
    // Include registration endpoint for Dynamic Client Registration (RFC 7591)
    registration_endpoint: `${config.auth0.issuerBaseURL}/oidc/register`,
  }
  
  console.log('🔍 [OAUTH DISCOVERY] Sending response:', response)
  res.setHeader('Content-Type', 'application/json')
  res.json(response)
})

// Resource-specific OAuth discovery endpoint
// Claude may query /.well-known/oauth-protected-resource/mcp for resource-specific config
app.get('/.well-known/oauth-protected-resource/:resource', (req, res) => {
  console.log('🔍 [OAUTH DISCOVERY] Resource-specific request received:', {
    resource: req.params.resource,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  })
  
  // Return same response as base discovery endpoint
  const response = {
    authorization_servers: [config.auth0.issuerBaseURL],
    registration_endpoint: `${config.auth0.issuerBaseURL}/oidc/register`,
  }
  
  console.log('🔍 [OAUTH DISCOVERY] Sending resource-specific response:', response)
  res.setHeader('Content-Type', 'application/json')
  res.json(response)
})

// OAuth Authorization Server Metadata endpoint (RFC 8414)
// Claude queries this to get OAuth server configuration
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  console.log('🔍 [OAUTH METADATA] Request received:', {
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  })
  
  // Return Auth0's authorization server metadata
  const metadata = {
    issuer: config.auth0.issuerBaseURL,
    authorization_endpoint: `${config.auth0.issuerBaseURL}/authorize`,
    token_endpoint: `${config.auth0.issuerBaseURL}/oauth/token`,
    registration_endpoint: `${config.auth0.issuerBaseURL}/oidc/register`,
    jwks_uri: `${config.auth0.issuerBaseURL}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    scopes_supported: ['openid', 'profile', 'email', 'contextdb:read', 'contextdb:write'],
  }
  
  console.log('🔍 [OAUTH METADATA] Sending response:', metadata)
  res.setHeader('Content-Type', 'application/json')
  res.json(metadata)
})

// Dynamic Client Registration endpoint (RFC 7591)
// Claude uses this to register itself as an OAuth client
// Note: Claude may register directly with Auth0, but we provide this as a fallback/proxy
app.post('/register', async (req, res) => {
  console.log('📝 [DCR] Dynamic Client Registration request received:', {
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString(),
  })
  
  try {
    // Proxy the registration request to Auth0's DCR endpoint
    const auth0RegisterUrl = `${config.auth0.issuerBaseURL}/oidc/register`
    
    console.log('📝 [DCR] Proxying to Auth0:', auth0RegisterUrl)
    console.log('📝 [DCR] Registration payload:', JSON.stringify(req.body, null, 2))
    
    const response = await fetch(auth0RegisterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
    })
    
    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { raw: responseText }
    }
    
    console.log('📝 [DCR] Auth0 response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    })
    
    // Forward Auth0's response headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })
    
    res.status(response.status).json(responseData)
  } catch (error: any) {
    console.error('❌ [DCR] Error proxying registration:', {
      error: error.message,
      stack: error.stack,
    })
    res.status(500).json({
      error: 'registration_failed',
      error_description: 'Failed to register client with Auth0',
    })
  }
})

// Handle GET requests to /mcp (Claude may check endpoint availability)
app.get('/mcp', (req: express.Request, res: express.Response) => {
  console.log('📨 [MCP ENDPOINT] GET request received:', {
    hasAuthHeader: !!req.headers.authorization,
    timestamp: new Date().toISOString(),
  })
  
  // Return endpoint information without requiring auth
  res.json({
    endpoint: '/mcp',
    method: 'POST',
    transport: 'streamable-http',
    authentication: 'oauth2',
    authorization_server: config.auth0.issuerBaseURL,
  })
})

// HTTP-based MCP endpoint (preferred for Claude) using Streamable HTTP transport
// Protect this with OAuth (checkJwt)
app.post(
  '/mcp',
  // Log BEFORE authentication check
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization
    const tokenPreview = authHeader 
      ? (authHeader.startsWith('Bearer ') 
          ? `Bearer ${authHeader.substring(7, 30)}...` 
          : authHeader.substring(0, 30) + '...')
      : 'missing'
    
    console.log('📨 [MCP ENDPOINT] Request received BEFORE auth check:', {
      hasAuthHeader: !!authHeader,
      authHeaderPreview: tokenPreview,
      authHeaderLength: authHeader?.length || 0,
      contentType: req.headers['content-type'],
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      timestamp: new Date().toISOString(),
    })
    
    // Log full token structure (safely) for debugging
    if (authHeader) {
      try {
        const parts = authHeader.replace(/^Bearer /, '').split('.')
        console.log('🔍 [MCP ENDPOINT] Token structure:', {
          hasBearerPrefix: authHeader.startsWith('Bearer '),
          tokenParts: parts.length,
          partLengths: parts.map(p => p.length),
          isJWT: parts.length === 3,
        })
      } catch (e) {
        console.log('🔍 [MCP ENDPOINT] Could not parse token structure')
      }
    }
    
    next()
  },
  // Authentication middleware
  checkJwt,
  // Log AFTER successful authentication and sync user
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth: any = (req as any).auth
    const auth0Sub = auth?.payload?.sub as string | undefined
    const auth0Email = auth?.payload?.email as string | undefined
    const auth0Name = auth?.payload?.name as string | undefined

    // Sync Auth0 user to Supabase and store Supabase user ID in request
    if (auth0Sub) {
      const supabaseUserId = await syncAuth0UserToSupabase(
        auth0Sub,
        auth0Email,
        auth0Name,
      )
      if (supabaseUserId) {
        // Store Supabase user ID in request for tool handlers to use
        ;(req as any).supabaseUserId = supabaseUserId
        console.log('✅ [MCP ENDPOINT] Authentication successful:', {
          auth0Sub,
          supabaseUserId,
          audience: auth?.payload?.aud || 'unknown',
          timestamp: new Date().toISOString(),
        })
      } else {
        console.error(`Failed to sync Auth0 user ${auth0Sub} to Supabase`)
      }
    }
    next()
  },
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      console.log('🚀 [MCP ENDPOINT] Processing MCP request')
      // sessionIdGenerator and enableJsonResponse are recommended settings
      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
      })

      // Get Supabase user ID from request (set by previous middleware)
      const supabaseUserId = (req as any).supabaseUserId

      // Connect our MCP server to the transport
      const server = createContextDbServer(() => {
        // For HTTP transport, return Supabase user ID directly
        return supabaseUserId
      })

      // Handle the HTTP request via MCP transport
      await server.connect(transport)
      await transport.handleRequest(req as any, res, (req as any).body)
      console.log('✅ [MCP ENDPOINT] Request processed successfully')
    } catch (err) {
      console.error('❌ [MCP ENDPOINT] Error handling request:', err)
      next(err)
    }
  },
)

// SSE endpoint for deprecated HTTP+SSE MCP transport (Claude-compatible)
app.get('/sse', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization
  const tokenPreview = authHeader 
    ? (authHeader.startsWith('Bearer ') 
        ? `Bearer ${authHeader.substring(7, 30)}...` 
        : authHeader.substring(0, 30) + '...')
    : 'missing'
  
  console.log('🔍 [SSE ENDPOINT] Request received BEFORE auth check:', {
    hasAuthHeader: !!authHeader,
    authHeaderPreview: tokenPreview,
    authHeaderLength: authHeader?.length || 0,
    'x-authorization': req.headers['x-authorization'] ? 'present' : 'missing',
    query: req.query,
    timestamp: new Date().toISOString(),
  })
  
  // Log full token structure (safely) for debugging
  if (authHeader) {
    try {
      const parts = authHeader.replace(/^Bearer /, '').split('.')
      console.log('🔍 [SSE ENDPOINT] Token structure:', {
        hasBearerPrefix: authHeader.startsWith('Bearer '),
        tokenParts: parts.length,
        partLengths: parts.map(p => p.length),
        isJWT: parts.length === 3,
      })
    } catch (e) {
      console.log('🔍 [SSE ENDPOINT] Could not parse token structure')
    }
  }
  
  next()
}, checkJwt, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const transport = new SSEServerTransport('/messages', res)
    const sessionId = transport.sessionId
    transports[sessionId] = transport

    // Capture Auth0 user info and sync to Supabase
    const auth: any = (req as any).auth
    const auth0Sub = auth?.payload?.sub as string | undefined
    const auth0Email = auth?.payload?.email as string | undefined
    const auth0Name = auth?.payload?.name as string | undefined

    if (auth0Sub) {
      // Sync Auth0 user to Supabase and get Supabase user ID
      const supabaseUserId = await syncAuth0UserToSupabase(
        auth0Sub,
        auth0Email,
        auth0Name,
      )

      if (supabaseUserId) {
        // Store Supabase user ID (not Auth0 sub) for this session
        sessionUserIds[sessionId] = supabaseUserId
        console.log(
          `Synced Auth0 user ${auth0Sub} to Supabase user ${supabaseUserId} for session ${sessionId}`,
        )
      } else {
        console.error(`Failed to sync Auth0 user ${auth0Sub} to Supabase`)
      }
    }

    transport.onclose = () => {
      console.log(`SSE transport closed for session ${sessionId}`)
      delete transports[sessionId]
      delete sessionUserIds[sessionId]
    }

    const server = createContextDbServer(getUserIdForSession)
    await server.connect(transport)
    console.log(`Established SSE stream with session ID: ${sessionId}`)
  } catch (error) {
    console.error('Error establishing SSE stream:', error)
    if (!res.headersSent) {
      res.status(500).send('Error establishing SSE stream')
    }
  }
})

// Messages endpoint for receiving client JSON-RPC requests
app.post('/messages', async (req, res) => {
  console.log('Received POST /messages from MCP client')
  const sessionId = req.query.sessionId as string | undefined
  if (!sessionId) {
    console.error('Missing sessionId in /messages request')
    res.status(400).send('Missing sessionId parameter')
    return
  }

  const transport = transports[sessionId]
  if (!transport) {
    console.error(`No active transport for session ${sessionId}`)
    res.status(404).send('Session not found')
    return
  }

  try {
    await transport.handlePostMessage(req as any, res, (req as any).body)
  } catch (error) {
    console.error('Error handling /messages request:', error)
    if (!res.headersSent) {
      res.status(500).send('Error handling request')
    }
  }
})

// Error handling middleware - must be registered after all routes
// express-oauth2-jwt-bearer sets err.status and err.headers per RFC 6750
// We use those properties to send proper responses
app.use(
  (
    err: Error & { status?: number; headers?: Record<string, string> },
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // Handle express-oauth2-jwt-bearer errors
    // The library sets err.status and err.headers automatically
    if (err instanceof InvalidRequestError || err instanceof UnauthorizedError) {
      const authHeader = req.headers.authorization
      const tokenPreview = authHeader 
        ? (authHeader.startsWith('Bearer ') 
            ? `Bearer ${authHeader.substring(7, 50)}...` 
            : authHeader.substring(0, 50) + '...')
        : 'missing'
      
      // Try to decode JWT header/payload for debugging (without verification)
      let tokenInfo: any = {}
      if (authHeader) {
        try {
          const token = authHeader.replace(/^Bearer /, '')
          const parts = token.split('.')
          if (parts.length === 3) {
            // Decode header and payload (base64url)
            const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString())
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
            tokenInfo = {
              header: { alg: header.alg, typ: header.typ, kid: header.kid },
              payload: {
                iss: payload.iss,
                aud: payload.aud,
                sub: payload.sub,
                exp: payload.exp,
                iat: payload.iat,
              },
              expectedIssuer: config.auth0.issuerBaseURL,
              expectedAudience: config.auth0.audience,
              issuerMatch: payload.iss === config.auth0.issuerBaseURL,
              audienceMatch: payload.aud === config.auth0.audience || (Array.isArray(payload.aud) && payload.aud.includes(config.auth0.audience)),
            }
          } else {
            tokenInfo = { error: 'Token is not a JWT (does not have 3 parts)' }
          }
        } catch (e: any) {
          tokenInfo = { error: `Could not decode token: ${e.message}` }
        }
      }
      
      console.log('🔒 [AUTH ERROR] Authentication failed:', {
        errorType: err instanceof InvalidRequestError ? 'InvalidRequestError' : 'UnauthorizedError',
        errorMessage: err.message,
        errorStatus: err.status,
        errorHeaders: err.headers,
        requestPath: req.path,
        requestMethod: req.method,
        hasAuthHeader: !!authHeader,
        authHeaderPreview: tokenPreview,
        authHeaderLength: authHeader?.length || 0,
        tokenInfo,
        timestamp: new Date().toISOString(),
      })
      
      if (!res.headersSent) {
        // Use the status code set by the library (defaults to 401 for UnauthorizedError, 400 for InvalidRequestError)
        const status = err.status || (err instanceof InvalidRequestError ? 400 : 401)
        
        // Apply headers set by the library (includes WWW-Authenticate per RFC 6750)
        const responseHeaders: Record<string, string> = {}
        if (err.headers) {
          Object.entries(err.headers).forEach(([key, value]) => {
            res.setHeader(key, value)
            responseHeaders[key] = value
          })
        }
        
        // Always set WWW-Authenticate header with proper authorization server info
        // This helps Claude know where to authenticate
        const authUrl = `${config.auth0.issuerBaseURL}/authorize`
        const tokenUrl = `${config.auth0.issuerBaseURL}/oauth/token`
        const wwwAuth = `Bearer realm="${config.auth0.issuerBaseURL}", authorization_uri="${authUrl}", token_uri="${tokenUrl}", scope="contextdb:read contextdb:write"`
        res.setHeader('WWW-Authenticate', wwwAuth)
        responseHeaders['WWW-Authenticate'] = wwwAuth
        
        const errorResponse = {
          error: err instanceof InvalidRequestError ? 'invalid_request' : 'invalid_token',
          error_description: err.message || 'Authentication required',
        }
        
        console.log('🔒 [AUTH ERROR] Sending error response:', {
          status,
          headers: responseHeaders,
          body: errorResponse,
        })
        
        res.status(status).json(errorResponse)
        return
      } else {
        console.log('⚠️ [AUTH ERROR] Response already sent, cannot send error response')
      }
    } else {
      // For other errors, pass to default Express error handler
      console.error('❌ [UNHANDLED ERROR]', {
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack,
        requestPath: req.path,
        requestMethod: req.method,
        timestamp: new Date().toISOString(),
      })
      
      if (!res.headersSent) {
        res.status(err.status || 500).json({ error: 'Internal server error' })
      }
    }
  },
)

const PORT = config.port
app.listen(PORT, (error?: unknown) => {
  if (error) {
    console.error('Failed to start MCP server:', error)
    process.exit(1)
  }
  console.log(`ContextDB MCP server listening on port ${PORT}`)
  console.log(`Health: http://localhost:${PORT}/health`)
  console.log(
    `OAuth discovery: http://localhost:${PORT}/.well-known/oauth-protected-resource`,
  )
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`)
})

