# Auth0 Setup Guide

This guide will walk you through setting up Auth0 for OAuth 2.1 authentication with Dynamic Client Registration (DCR) for ContextDB.

## Step 1: Create Auth0 Account

1. Go to [https://auth0.com](https://auth0.com)
2. Click "Sign Up" (free tier available)
3. Sign up with email or social account
4. Verify your email

## Step 2: Create a Tenant

1. After signing up, you'll be prompted to create a tenant
2. Choose a tenant name: `contextdb` (or your preferred name)
3. Select a region (US, EU, or AU)
4. Click "Create"

## Step 3: Create an API

1. In the Auth0 Dashboard, go to **Applications** → **APIs**
2. Click "Create API"
3. Fill in the details:
   - **Name**: `ContextDB MCP Server`
   - **Identifier**: `https://contextdb.tech` (this is the audience)
   - **Signing Algorithm**: `RS256` (default)
4. Click "Create"

## Step 4: Enable Dynamic Client Registration (DCR)

1. In your API settings, scroll to "Settings"
2. Find "Enable Dynamic Client Registration"
3. Toggle it **ON**
4. Click "Save"

## Step 5: Configure Scopes

1. Still in your API settings, go to the "Scopes" tab
2. Add the following scopes:
   - **Name**: `contextdb:read`
     - **Description**: `Read access to contexts`
   - **Name**: `contextdb:write`
     - **Description**: `Write access to contexts`
3. Click "Add" for each scope
4. Click "Save"

> **Note:** APIs in Auth0 don't have callback URLs. With Dynamic Client Registration enabled, Claude.ai will dynamically register as a client and handle its own callback URLs during the OAuth flow.

## Step 6: Get Auth0 Credentials

1. Go to **Applications** → **APIs** → Your API
2. Note these values:
   - **Domain**: `your-tenant.auth0.com`
   - **Identifier (Audience)**: `https://contextdb.tech`
   - **Issuer Base URL**: `https://your-tenant.auth0.com`

3. You'll need these for `mcp-server/.env`:
   - `AUTH0_DOMAIN=your-tenant.auth0.com`
   - `AUTH0_AUDIENCE=https://contextdb.tech`
   - `AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com`

## Step 7: Test OAuth Discovery Endpoint

Once your MCP server is running, test the discovery endpoint:

```bash
curl http://localhost:3000/.well-known/oauth-protected-resource
```

You should see:
```json
{
  "authorization_servers": ["https://your-tenant.auth0.com"]
}
```

## Troubleshooting

### DCR Not Working

- Make sure "Enable Dynamic Client Registration" is toggled ON
- Verify you're using the correct API identifier as the audience
- Check that scopes are properly configured

### OAuth Flow Issues

- With Dynamic Client Registration, Claude.ai handles callback URLs automatically
- No callback URL configuration is needed in Auth0 for APIs
- If you encounter redirect errors, verify DCR is enabled and scopes are configured correctly

### Token Validation Issues

- Verify the audience matches exactly: `https://contextdb.tech`
- Check that the issuer base URL is correct
- Ensure your MCP server is using the correct environment variables

## Free Tier Limits

Auth0 free tier includes:
- Up to 7,500 active users per month
- Unlimited logins
- Social identity providers (Google, GitHub, etc.)

This is sufficient for MVP and V1. You may need to upgrade for V2 if you exceed 7,500 active users.

## Next Steps

Once Auth0 is configured:
1. Add credentials to `mcp-server/.env`
2. Test the OAuth discovery endpoint
3. Proceed to [Deployment Setup](./setup-deployment.md)
4. Test the full OAuth flow with Claude.ai

