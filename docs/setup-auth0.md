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

**CRITICAL: Ensure JWT Access Tokens are Enabled**

After creating the API, verify these settings:

1. In your API settings, go to the **Settings** tab
2. Scroll down to **"Token Endpoint Authentication Method"**
3. Ensure **"Enable JWT Access Tokens"** is checked/enabled (this should be the default)
4. The API should issue **signed JWT tokens (JWS)**, NOT opaque tokens or encrypted tokens (JWE)
5. Click "Save" if you made any changes

**Why this matters:** The MCP server uses `express-oauth2-jwt-bearer` which only validates **signed JWT tokens (JWS)**. If Auth0 issues encrypted tokens (JWE) or opaque tokens, validation will fail with "Invalid Compact JWS" error.

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

## Step 6: Promote Connections to Domain Level (REQUIRED for DCR)

**Important:** Dynamically registered clients (like Claude) are considered "third-party applications" and can **only** use connections that are promoted to domain level. This is why you're getting the "no connections enabled for the client" error.

### Option A: Using Auth0 Dashboard (Easier)

1. Go to **Authentication** → **Connections**
2. For each connection you want to use (Database, Google, etc.):
   - Click on the connection name
   - Go to the **Settings** tab
   - Scroll down to find **"Promote Connection to Domain Level"** or **"Domain Connection"**
   - Toggle it **ON** (or check the box)
   - Click **"Save"**

### Option B: Using Management API (If Dashboard Option Not Available)

If you can't find the option in the dashboard, use the Management API:

1. **Get your Management API token:**
   - Go to **Applications** → **APIs** → **Auth0 Management API**
   - Go to **Machine to Machine Applications** tab
   - Authorize your application (or create a new M2M app)
   - Grant `update:connections` scope
   - Copy the access token

2. **Get your Connection IDs:**
   ```bash
   curl -X GET "https://contextdb.us.auth0.com/api/v2/connections" \
     -H "Authorization: Bearer YOUR_MGMT_API_TOKEN"
   ```
   Look for connection IDs like `con_xxxxxxxxxxxxx` for Database, Google, etc.

3. **Promote each connection to domain level:**
   ```bash
   curl -X PATCH "https://contextdb.us.auth0.com/api/v2/connections/CONNECTION_ID" \
     -H "Authorization: Bearer YOUR_MGMT_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"is_domain_connection": true}'
   ```

   Replace `CONNECTION_ID` with each connection ID you want to promote.

> **Note:** APIs in Auth0 don't have callback URLs. With Dynamic Client Registration enabled, Claude.ai will dynamically register as a client and handle its own callback URLs during the OAuth flow.

## Step 7: Set Default Audience (CRITICAL for JWT Tokens)

**This is critical!** If the `audience` parameter is missing or incorrect, Auth0 will issue encrypted JWT tokens (JWE) or opaque tokens instead of signed JWT tokens (JWS).

### The Root Cause: "Opaque" JWE Tokens

Even though JWE encryption is disabled in your API settings, Auth0 may still send a 5-part encrypted token (starting with `eyJhbGciOiJkaXIiLCJlbmMi...`). This happens when Auth0 issues an **"Opaque" Access Token** instead of a JWT Access Token. 

In the Auth0 system, if a request doesn't explicitly state which API it wants to talk to, Auth0 provides a proprietary token (which looks like a 5-part JWE) that only Auth0's `/userinfo` endpoint can read. Your server fails because it expects a standard 3-part signed JWT.

### The Solution: Set Tenant Default Audience

Since the client (Claude/MCP) is the one initiating the request and might not be passing the audience parameter correctly in its internal fetch, you can force Auth0 to always issue a valid JWT for your API at the tenant level.

**Steps:**

1. **Get your API Identifier:**
   - Go to your Auth0 Dashboard → **Applications** → **APIs**
   - Find your API (e.g., `https://contextdb.tech` as seen in your logs)
   - Copy the **Identifier** string exactly

2. **Set the Default Audience:**
   - Go to Dashboard → **Settings** → **Tenant Settings** (the gear icon on the left sidebar)
   - Click the **General** tab
   - Scroll down to the **API Authorization Settings** section
   - Find the field labeled **Default Audience**
   - Paste your API Identifier there (e.g., `https://contextdb.tech`)
   - Click **Save**

This ensures that all access tokens are issued as signed JWTs by default, even if the client doesn't explicitly specify the audience parameter.

## Step 8: Get Auth0 Credentials

1. Go to **Applications** → **APIs** → Your API
2. Note these values:
   - **Domain**: `your-tenant.auth0.com`
   - **Identifier (Audience)**: `https://contextdb.tech`
   - **Issuer Base URL**: `https://your-tenant.auth0.com`

3. You'll need these for `mcp-server/.env`:
   - `AUTH0_DOMAIN=your-tenant.auth0.com`
   - `AUTH0_AUDIENCE=https://contextdb.tech`
   - `AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com`

## Step 9: Test OAuth Discovery Endpoint

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

### "No Connections Enabled for the Client" Error

This error occurs because dynamically registered clients are third-party applications and can only use **domain-level connections**.

**Solution:**
1. Go to **Authentication** → **Connections**
2. For each connection you want to use, promote it to domain level (see Step 6 above)
3. After promoting connections, try connecting Claude again

**Verify connections are domain-level:**
- In the Connections list, domain-level connections will show a special indicator
- Or check via API: `GET /api/v2/connections` - look for `"is_domain_connection": true`

### Token Validation Issues

- Verify the audience matches exactly: `https://contextdb.tech`
- Check that the issuer base URL is correct
- Ensure your MCP server is using the correct environment variables

### "Invalid Compact JWS" Error

This error means the token Claude is sending is not a valid **signed JWT (JWS)**. The most common cause is that Auth0 is issuing **encrypted JWT tokens (JWE)** instead of signed tokens.

**Symptoms:**
- Token starts with `eyJhbGciOiJkaXIiLCJlbmM...` (decodes to `{"alg":"dir","enc...`)
- Error message: "Invalid Compact JWS"
- Token has `alg: "dir"` and `enc` fields (indicates JWE, not JWS)

**Solution:**

1. **Verify Auth0 API Configuration:**
   - Go to **Applications** → **APIs** → Your API → **Settings**
   - Ensure **"Enable JWT Access Tokens"** is checked
   - Verify **"Signing Algorithm"** is set to `RS256` (not `HS256` or `none`)
   - The API must issue **signed JWT tokens (JWS)**, NOT encrypted tokens (JWE)

2. **Check Token Type:**
   - Decode the token Claude is sending (first part before the first dot)
   - If it contains `"alg":"dir"` and `"enc"`, it's a JWE (encrypted) - this is wrong
   - If it contains `"alg":"RS256"` and `"typ":"JWT"`, it's a JWS (signed) - this is correct

3. **If Auth0 is issuing JWE tokens even when encryption is disabled:**

   **The most common cause is missing or incorrect `audience` parameter!**
   
   **Root Cause:** Auth0 issues "Opaque" JWE tokens (5-part encrypted tokens) when the audience parameter is missing. These look like JWE tokens but are actually proprietary Auth0 tokens that only work with Auth0's `/userinfo` endpoint.
   
   a. **Set Default Audience in Tenant Settings (MOST IMPORTANT):**
      - Go to **Settings** → **Tenant Settings** → **General** tab
      - Scroll to **API Authorization Settings** section
      - Set **Default Audience** to your API Identifier: `https://contextdb.tech`
      - Click **Save**
      - This ensures Auth0 issues signed JWTs (3-part JWS tokens) even if client doesn't specify audience
      - **This is the definitive solution** - it forces Auth0 to always issue valid JWT tokens for your API
   
   b. **Verify API Settings:**
      - Go to **Applications** → **APIs** → Your API → **Settings**
      - Ensure **"Enable JWT Access Tokens"** is checked
      - Ensure **"Encrypt the signed access_token"** is **UNCHECKED** (disabled)
      - Verify **"Signing Algorithm"** is `RS256`
      - Click **"Save"** even if nothing changed
   
   c. **Check for Auth0 Actions:**
      - Go to **Actions** → **Flows** → **Login**
      - Check if any Actions are modifying tokens or forcing encryption
      - Temporarily disable Actions to test
   
   d. **Check Tenant Settings:**
      - Go to **Settings** → **Advanced** → **OAuth**
      - Look for any tenant-level token encryption policies
      - Check if there are any organization-level policies
   
   e. **Test Token Manually:**
      - Use Auth0's token endpoint with the correct `audience` parameter
      - Decode the token header to verify it's JWS (signed) not JWE (encrypted)
      - If test token is JWS but Claude's token is JWE, Claude isn't sending the audience
   
   f. **Recreate the API (Last Resort):**
      - Delete the existing API
      - Create a new API with the same identifier
      - Ensure JWT Access Tokens are enabled and encryption is disabled
      - Re-enable DCR and configure scopes
      - **Set Default Audience** in tenant settings
   
   g. **Check Dynamic Client Registration:**
      - When Claude registers via DCR, it might be requesting encrypted tokens
      - Check the DCR registration request in Auth0 logs
      - Verify Claude isn't requesting `token_endpoint_auth_method` that forces encryption

4. **Verify Token Claims:**
   - Check the token's `iss` claim matches your Auth0 issuer base URL
   - Verify `aud` claim matches your API identifier (`https://contextdb.tech`)
   - Ensure token is sent as `Bearer <token>` in Authorization header

**To debug:**
- Check MCP server logs for detailed token structure information
- Decode the JWT header: `echo "TOKEN_PART" | base64url -d | jq`
- Verify Auth0 API settings match your environment variables
- Test token manually using Auth0's token endpoint and check the response

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

