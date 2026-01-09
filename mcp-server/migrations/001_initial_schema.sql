-- ContextDB Initial Schema Migration
-- This migration creates all core tables, indexes, and RLS policies

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Contexts table (canonical)
CREATE TABLE IF NOT EXISTS contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version INTEGER DEFAULT 1,
  summary TEXT,
  content JSONB NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_contexts_user ON contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_contexts_name ON contexts(user_id, name);
CREATE INDEX IF NOT EXISTS idx_contexts_tags ON contexts USING GIN(tags);

-- Context history table (immutable snapshots)
CREATE TABLE IF NOT EXISTS context_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID REFERENCES contexts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_context ON context_history(context_id);
CREATE INDEX IF NOT EXISTS idx_history_version ON context_history(context_id, version);

-- Row-level security
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS select_own_contexts ON contexts;
DROP POLICY IF EXISTS update_own_contexts ON contexts;
DROP POLICY IF EXISTS select_own_history ON context_history;

-- RLS Policies for contexts
CREATE POLICY select_own_contexts ON contexts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY update_own_contexts ON contexts
  FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for context_history
CREATE POLICY select_own_history ON context_history
  FOR SELECT
  USING (
    context_id IN (
      SELECT id FROM contexts WHERE user_id = auth.uid()
    )
  );

