# Supabase Setup Guide

This guide will walk you through setting up Supabase for ContextDB.

## Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign up"
3. Sign up with GitHub, Google, or email
4. Verify your email if required

## Step 2: Create a New Project

1. Once logged in, click "New Project"
2. Fill in the project details:
   - **Name**: `contextdb` (or your preferred name)
   - **Database Password**: Create a strong password (save this securely!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Select "Free" for MVP
3. Click "Create new project"
4. Wait 2-3 minutes for the project to be provisioned

## Step 3: Get Connection Credentials

1. In your project dashboard, go to **Settings** → **API**
2. You'll need these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long JWT token)
   - **service_role key**: `eyJhbGc...` (keep this secret!)

3. Copy these values - you'll need them for:
   - `web/.env` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - `mcp-server/.env` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

## Step 4: Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Open the migration file: `mcp-server/migrations/001_initial_schema.sql`
4. Copy the entire contents and paste into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

## Step 5: Verify Tables Were Created

1. Go to **Table Editor** in the left sidebar
2. You should see three tables:
   - `users`
   - `contexts`
   - `context_history`

## Step 6: Test Row-Level Security (RLS)

1. Go to **Authentication** → **Policies**
2. Verify that RLS is enabled for `contexts` and `context_history` tables
3. You should see policies:
   - `select_own_contexts` on `contexts`
   - `update_own_contexts` on `contexts`
   - `select_own_history` on `context_history`

## Step 7: Test Database Connection

You can test the connection using the Supabase SQL Editor:

```sql
-- Test insert (will use service role, bypassing RLS)
INSERT INTO users (email, name) 
VALUES ('test@example.com', 'Test User')
RETURNING *;

-- Test query
SELECT * FROM users WHERE email = 'test@example.com';
```

## Troubleshooting

### Migration Errors

If you see errors about policies already existing:
- The migration uses `DROP POLICY IF EXISTS` to handle this
- If you still get errors, manually drop policies in SQL Editor:
  ```sql
  DROP POLICY IF EXISTS select_own_contexts ON contexts;
  DROP POLICY IF EXISTS update_own_contexts ON contexts;
  DROP POLICY IF EXISTS select_own_history ON context_history;
  ```

### RLS Not Working

- Make sure RLS is enabled: `ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;`
- Verify policies exist in **Authentication** → **Policies**
- Test with a user session (not service role)

## Next Steps

Once Supabase is set up:
1. Add credentials to your `.env` files
2. Proceed to [Auth0 Setup](./setup-auth0.md)
3. Test the connection from your local development environment

