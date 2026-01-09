import express from 'express'
import cors from 'cors'
import path from 'path'
import { config } from './config'
import { checkJwt, handleAuthError } from './auth'
import { createContextDbServer } from './mcpServer'

// Import SSEServerTransport using require with resolved path since the subpath export isn't available
// require.resolve resolves to dist/cjs/package.json, so we go up 2 levels to get to SDK root
const sdkPath = require.resolve('@modelcontextprotocol/sdk/package.json')
const sdkRoot = path.dirname(path.dirname(path.dirname(sdkPath)))
const { SSEServerTransport } = require(path.join(sdkRoot, 'dist/cjs/server/sse'))

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
app.get('/.well-known/oauth-protected-resource', (_req, res) => {
  res.json({
    authorization_servers: [config.auth0.issuerBaseURL],
  })
})

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
}, checkJwt, handleAuthError, async (req: express.Request, res: express.Response) => {
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

