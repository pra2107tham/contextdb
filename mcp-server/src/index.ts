import express from 'express';
import cors from 'cors';
import { config } from './config';

const app = express();

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth discovery endpoint
app.get('/.well-known/oauth-protected-resource', (req, res) => {
  res.json({
    authorization_servers: [config.auth0.issuerBaseURL],
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`OAuth discovery: http://localhost:${PORT}/.well-known/oauth-protected-resource`);
});

