# ContextDB

**Context Checkpointing for Claude Power Users**

ContextDB is an MCP (Model Context Protocol) server that allows you to save, load, and manage contexts for your Claude conversations. Never lose important context again - checkpoint your conversations and resume them anytime.

## Overview

ContextDB solves the problem of token usage compounding in long conversations with Claude. Instead of starting fresh each time, you can:

- **Save contexts** - Capture the current state of your conversation
- **Load contexts** - Resume previous conversations with full context
- **Manage contexts** - View, search, and organize your saved contexts
- **Version contexts** - Automatic history tracking for all changes

## Project Structure

```
contextdb/
├── web/                 # Next.js web application
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   ├── lib/             # Utilities (Supabase client, etc.)
│   └── package.json
├── mcp-server/          # Express.js MCP server
│   ├── src/             # TypeScript source files
│   ├── migrations/      # Database migrations
│   └── package.json
├── docs/                # Setup and documentation guides
└── README.md
```

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20+ installed
- **npm** or **pnpm** package manager
- Accounts for:
  - [Supabase](https://supabase.com) (free tier)
  - [Auth0](https://auth0.com) (free tier)
  - [Railway](https://railway.app) (for MCP server deployment)
  - [Vercel](https://vercel.com) (for web app deployment)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd contextdb

# Install web app dependencies
cd web
npm install

# Install MCP server dependencies
cd ../mcp-server
npm install
```

### 2. Set Up Infrastructure

Follow these guides in order:

1. **[Supabase Setup](./docs/setup-supabase.md)** - Database and authentication
2. **[Auth0 Setup](./docs/setup-auth0.md)** - OAuth provider configuration
3. **[Deployment Setup](./docs/setup-deployment.md)** - Railway and Vercel deployment

### 3. Configure Environment Variables

#### Web App (`web/.env`)

Create `web/.env` from `web/.env.example`:

```bash
cd web
cp .env.example .env
# Edit .env with your Supabase and Auth0 credentials
```

#### MCP Server (`mcp-server/.env`)

Create `mcp-server/.env` from `mcp-server/.env.example`:

```bash
cd mcp-server
cp .env.example .env
# Edit .env with your Supabase and Auth0 credentials
```

### 4. Run Database Migrations

1. Open Supabase SQL Editor
2. Copy contents of `mcp-server/migrations/001_initial_schema.sql`
3. Run the migration
4. Verify tables are created

### 5. Start Development Servers

#### Web App

```bash
cd web
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

#### MCP Server

```bash
cd mcp-server
npm run dev
```

Server runs on [http://localhost:3000](http://localhost:3000) (or PORT from .env)

## Development Workflow

### Web App Development

```bash
cd web
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### MCP Server Development

```bash
cd mcp-server
npm run dev      # Start with hot reload (tsx watch)
npm run build    # Compile TypeScript
npm start        # Run compiled JavaScript
npm run type-check  # Type check without building
```

## Architecture

### System Components

- **Web App (Next.js)**: User-facing dashboard for viewing and managing contexts
- **MCP Server (Express.js)**: Handles MCP protocol, OAuth, and database operations
- **Supabase**: PostgreSQL database with Row-Level Security
- **Auth0**: OAuth 2.1 provider with Dynamic Client Registration

### Data Flow

1. User connects ContextDB to Claude.ai via custom connector
2. Claude.ai authenticates with Auth0 (OAuth 2.1)
3. MCP server validates JWT tokens and handles tool calls
4. All data stored in Supabase with user isolation via RLS

## Features

### MVP Features (Current)

- ✅ Email/password and Google OAuth authentication
- ✅ Web dashboard for viewing contexts
- ✅ 6 MCP tools: create, get, list, append, update, delete contexts
- ✅ Context versioning and history
- ✅ Tag-based organization
- ✅ Search and filter contexts

### Coming in V1

- Admin dashboard with analytics
- Usage tracking
- Public launch features

### Coming in V2 (If Successful)

- Paid tiers (Free, Pro, Plus)
- Usage limits
- Stripe integration

## MCP Tools

The MCP server provides these tools for Claude:

1. **create_context** - Create a new context with background, assumptions, decisions, etc.
2. **get_context** - Load an existing context by name
3. **list_contexts** - List all contexts (names and summaries)
4. **append_context** - Add new information to an existing context
5. **update_context** - Replace/update fields in a context
6. **delete_context** - Remove a context

## Documentation

- **[Supabase Setup Guide](./docs/setup-supabase.md)** - Database configuration
- **[Auth0 Setup Guide](./docs/setup-auth0.md)** - OAuth configuration
- **[Deployment Guide](./docs/setup-deployment.md)** - Railway and Vercel setup
- **[Roadmap](./ContextDB_3_Stage_Roadmap.md)** - Full development roadmap

## Contributing

This is currently a personal project in MVP phase. Contributions welcome after public launch (V1).

## License

MIT

## Support

For issues and questions:
- Check the [documentation](./docs/)
- Review the [roadmap](./ContextDB_3_Stage_Roadmap.md)
- Open an issue on GitHub

---

**Built with:** Next.js, Express.js, TypeScript, Supabase, Auth0, Tailwind CSS

