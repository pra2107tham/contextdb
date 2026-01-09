import express from 'express'
import cors from 'cors'
import path from 'path'
import { config } from './config'
import { checkJwt } from './auth'
import { createContextDbServer } from './mcpServer'
import { InvalidRequestError, UnauthorizedError } from 'express-oauth2-jwt-bearer'

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
  }
  
  console.log('🔍 [OAUTH DISCOVERY] Sending response:', response)
  res.setHeader('Content-Type', 'application/json')
  res.json(response)
})

// HTTP-based MCP endpoint (preferred for Claude) using Streamable HTTP transport
// Protect this with OAuth (checkJwt)
app.post(
  '/mcp',
  // Log BEFORE authentication check
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('📨 [MCP ENDPOINT] Request received BEFORE auth check:', {
      hasAuthHeader: !!req.headers.authorization,
      authHeaderPrefix: req.headers.authorization?.substring(0, 20) || 'none',
      contentType: req.headers['content-type'],
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      timestamp: new Date().toISOString(),
    })
    next()
  },
  // Authentication middleware
  checkJwt,
  // Log AFTER successful authentication
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth: any = (req as any).auth
    console.log('✅ [MCP ENDPOINT] Authentication successful:', {
      userId: auth?.payload?.sub || 'unknown',
      audience: auth?.payload?.aud || 'unknown',
      timestamp: new Date().toISOString(),
    })
    next()
  },
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      console.log('🚀 [MCP ENDPOINT] Processing MCP request')
      // sessionIdGenerator and enableJsonResponse are recommended settings
      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
      })

      // Connect our MCP server to the transport
      const server = createContextDbServer(() => {
        // For HTTP transport, we don't use session-based mapping, instead
        // we rely on req.auth from checkJwt middleware inside tool handlers if needed.
        // For now, tools use the Auth0 subject from SSE sessions only.
        return undefined
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
  console.log('Received GET /sse from MCP client', {
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      'x-authorization': req.headers['x-authorization'] ? 'present' : 'missing',
    },
    query: req.query,
  })
  next()
}, checkJwt, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const transport = new SSEServerTransport('/messages', res)
    const sessionId = transport.sessionId
    transports[sessionId] = transport

    // Capture user id from Auth0 token (sub claim)
    const auth: any = (req as any).auth
    const userId = auth?.payload?.sub as string | undefined
    if (userId) {
      sessionUserIds[sessionId] = userId
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
      console.log('🔒 [AUTH ERROR] Authentication failed:', {
        errorType: err instanceof InvalidRequestError ? 'InvalidRequestError' : 'UnauthorizedError',
        errorMessage: err.message,
        errorStatus: err.status,
        errorHeaders: err.headers,
        requestPath: req.path,
        requestMethod: req.method,
        hasAuthHeader: !!req.headers.authorization,
        authHeaderValue: req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'none',
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
        } else {
          // Fallback: set WWW-Authenticate header if library didn't
          const authUrl = `${config.auth0.issuerBaseURL}/authorize`
          const wwwAuth = `Bearer realm="${config.auth0.issuerBaseURL}", authorization_uri="${authUrl}"`
          res.setHeader('WWW-Authenticate', wwwAuth)
          responseHeaders['WWW-Authenticate'] = wwwAuth
        }
        
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

