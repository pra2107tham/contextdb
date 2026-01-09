-- Add password_hash column for email/password authentication in web app

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;


