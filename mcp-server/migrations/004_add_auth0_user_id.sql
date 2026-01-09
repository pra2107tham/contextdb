-- Migration: Add auth0_user_id column to users table
-- This links Auth0 identities to Supabase users
-- Auth0 Actions (Post-User-Registration and Post-Login) will populate this field

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth0_user_id VARCHAR(255);

-- Create unique index on auth0_user_id (allows NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth0_user_id ON users(auth0_user_id) WHERE auth0_user_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.auth0_user_id IS 'Auth0 user subject (sub) - e.g., "auth0|123456" or "google-oauth2|123456". Set by Auth0 Actions during login/registration.';

