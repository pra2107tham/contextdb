import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  auth0: {
    domain: process.env.AUTH0_DOMAIN || '',
    audience: process.env.AUTH0_AUDIENCE || '',
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

// Validate required environment variables
const requiredVars = [
  'AUTH0_DOMAIN',
  'AUTH0_AUDIENCE',
  'AUTH0_ISSUER_BASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.warn(`Warning: ${varName} is not set`);
  }
}

