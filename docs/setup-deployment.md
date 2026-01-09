# Deployment Setup Guide

This guide covers deploying ContextDB to Railway (MCP server) and Vercel (web app).

## Railway Setup (MCP Server)

### Step 1: Create Railway Account

1. Go to [https://railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (recommended for easy deployment)

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo" (or "Empty Project" if you prefer manual setup)
3. If using GitHub:
   - Authorize Railway to access your repository
   - Select the `contextdb` repository
   - Select the `mcp-server` directory as the root

### Step 3: Configure Build Settings

1. In your Railway project, go to **Settings**
2. Set the following:
   - **Root Directory**: `mcp-server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: `20` (or latest LTS)

### Step 4: Set Environment Variables

1. Go to **Variables** tab
2. Add all required environment variables:

```
PORT=3000
CORS_ORIGIN=*

AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://contextdb.tech
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3. Click "Deploy" to start the deployment

### Step 5: Get Production URL

1. Once deployed, Railway will provide a URL like: `https://mcp-server-production.up.railway.app`
2. Configure custom domain `mcp.contextdb.tech` (see Custom Domain section below)
3. Copy the MCP server URL - you'll need it for:
   - Claude.ai connector configuration: `https://mcp.contextdb.tech`
   
> **Note:** No callback URL configuration is needed in Auth0. With Dynamic Client Registration enabled, Claude.ai will handle callback URLs automatically when connecting to your MCP server.

## Vercel Setup (Web App)

### Step 1: Create Vercel Account

1. Go to [https://vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with GitHub (recommended)

### Step 2: Import Project

1. Click "Add New" → "Project"
2. Import your GitHub repository
3. Select the `contextdb` repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### Step 3: Set Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Add all required variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXTAUTH_URL=https://contextdb.tech
NEXTAUTH_SECRET=generate_a_random_secret_here

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

3. For `NEXTAUTH_SECRET`, generate a random string:
   ```bash
   openssl rand -base64 32
   ```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at: `https://contextdb.tech` (after configuring custom domain)

### Step 5: Update Production URLs

1. Update `NEXTAUTH_URL` in Vercel environment variables to your production URL
2. Update any hardcoded URLs in your code to use environment variables

## Environment Variables Checklist

### MCP Server (Railway)

- [ ] `PORT` (default: 3000)
- [ ] `CORS_ORIGIN` (use `*` for development, specific domain for production)
- [ ] `AUTH0_DOMAIN`
- [ ] `AUTH0_AUDIENCE`
- [ ] `AUTH0_ISSUER_BASE_URL`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Web App (Vercel)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXTAUTH_URL` (production URL: `https://contextdb.tech`)
- [ ] `NEXTAUTH_SECRET` (random 32+ character string)
- [ ] `GOOGLE_CLIENT_ID` (if using Google OAuth)
- [ ] `GOOGLE_CLIENT_SECRET` (if using Google OAuth)

## Testing Deployment

### Test MCP Server

1. Health check:
   ```bash
   curl https://mcp.contextdb.tech/health
   ```

2. OAuth discovery:
   ```bash
   curl https://mcp.contextdb.tech/.well-known/oauth-protected-resource
   ```

### Test Web App

1. Visit `https://contextdb.tech` (after configuring custom domain)
2. Verify the landing page loads
3. Test authentication flows (once implemented)

## Custom Domain (Optional)

### Railway Custom Domain (MCP Server)

1. Go to Railway project → **Settings** → **Networking**
2. Add custom domain: `mcp.contextdb.tech`
3. Update DNS records as instructed (add CNAME record pointing to Railway)

### Vercel Custom Domain (Web App)

1. Go to Vercel project → **Settings** → **Domains**
2. Add your domain: `contextdb.tech`
3. Update DNS records as instructed (add A/CNAME records pointing to Vercel)

## Monitoring & Logs

### Railway Logs

- View logs in Railway dashboard under **Deployments** → **View Logs**
- Set up alerts for deployment failures

### Vercel Logs

- View logs in Vercel dashboard under **Deployments**
- Use Vercel Analytics for performance monitoring (optional)

## Troubleshooting

### Build Failures

- Check build logs for errors
- Verify all dependencies are in `package.json`
- Ensure Node version matches (20+)

### Environment Variable Issues

- Double-check variable names (case-sensitive)
- Verify values are correct (no extra spaces)
- Redeploy after changing environment variables

### Connection Issues

- Verify CORS settings allow your frontend domain
- Check that Auth0 callback URLs are correct
- Ensure Supabase allows connections from your deployment IPs

## Next Steps

After deployment:
1. Test the full OAuth flow with Claude.ai
2. Verify database connections work
3. Test all MCP tools
4. Monitor logs for any errors
5. Set up error tracking (Sentry, etc.) if desired

