import { auth } from 'express-oauth2-jwt-bearer'
import { config } from './config'

export const checkJwt = auth({
  audience: config.auth0.audience,
  issuerBaseURL: config.auth0.issuerBaseURL,
  tokenSigningAlg: 'RS256',
  // Additional options for better error handling
  // The library will automatically fetch JWKS from Auth0
})


