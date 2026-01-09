import { auth, UnauthorizedError, InvalidRequestError } from 'express-oauth2-jwt-bearer'
import { Request, Response, NextFunction } from 'express'
import { config } from './config'

export const checkJwt = auth({
  audience: config.auth0.audience,
  issuerBaseURL: config.auth0.issuerBaseURL,
  tokenSigningAlg: 'RS256',
})

// Error handling middleware for JWT errors
export const handleAuthError = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof InvalidRequestError) {
    console.error('JWT Auth Error (InvalidRequest):', {
      message: err.message,
      code: (err as any).code,
      status: err.status,
      authorizationHeader: req.headers.authorization ? 'present' : 'missing',
      queryParams: Object.keys(req.query),
      path: req.path,
    })
    
    // Return 401 with WWW-Authenticate header pointing to Auth0
    // Per RFC 6750 and MCP spec, this tells Claude where to authenticate
    // Claude should then initiate OAuth flow with Auth0
    const authUrl = `${config.auth0.issuerBaseURL}/authorize`
    const tokenUrl = `${config.auth0.issuerBaseURL}/oauth/token`
    
    // Set WWW-Authenticate header per RFC 6750
    res.setHeader('WWW-Authenticate', `Bearer realm="${config.auth0.issuerBaseURL}", authorization_uri="${authUrl}", token_uri="${tokenUrl}"`)
    
    // Return 401 with error details per OAuth 2.1 spec
    return res.status(401).json({
      error: 'invalid_request',
      error_description: 'Missing or invalid access token. Please complete OAuth flow.',
      authorization_uri: authUrl,
      token_uri: tokenUrl,
    })
  }
  if (err instanceof UnauthorizedError) {
    console.error('JWT Auth Error (Unauthorized):', {
      message: err.message,
      status: err.status,
      authorizationHeader: req.headers.authorization ? 'present' : 'missing',
    })
    
    // Return 401 with WWW-Authenticate header
    const authUrl = `${config.auth0.issuerBaseURL}/authorize`
    res.setHeader('WWW-Authenticate', `Bearer realm="${config.auth0.issuerBaseURL}", authorization_uri="${authUrl}"`)
    
    return res.status(err.status || 401).json({
      error: 'invalid_token',
      error_description: err.message || 'Invalid or expired access token',
      authorization_uri: authUrl,
    })
  }
  next(err)
}


