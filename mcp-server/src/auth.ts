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
    })
    return res.status(err.status || 400).json({
      error: 'InvalidRequest',
      message: err.message,
      code: (err as any).code,
    })
  }
  if (err instanceof UnauthorizedError) {
    console.error('JWT Auth Error (Unauthorized):', {
      message: err.message,
      status: err.status,
      authorizationHeader: req.headers.authorization ? 'present' : 'missing',
    })
    return res.status(err.status || 401).json({
      error: 'Unauthorized',
      message: err.message,
    })
  }
  next(err)
}


