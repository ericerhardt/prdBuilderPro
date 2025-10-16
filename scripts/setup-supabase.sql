-- PRD Builder Pro - Supabase Database Setup
-- Run this script in your Supabase SQL Editor if tables don't exist
-- https://app.supabase.com/project/YOUR_PROJECT/sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Multi-tenant workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT CHECK (role IN ('owner','admin','editor','viewer')) NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

-- PRD Documents
CREATE TABLE IF NOT EXISTS prd_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prd_versions (
  prd_id UUID REFERENCES prd_documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  body_markdown TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (prd_id, version)
);

-- Platform registry
CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  ordering INT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS platform_params (
  id BIGSERIAL PRIMARY KEY,
  platform_id TEXT REFERENCES platforms(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  help TEXT,
  options JSONB,
  required BOOLEAN DEFAULT FALSE,
  advanced BOOLEAN DEFAULT FALSE
);

-- Stripe billing
CREATE TABLE IF NOT EXISTS billing_customers (
  user_id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan_id TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_metrics_daily (
  day DATE PRIMARY KEY,
  mrr_cents BIGINT NOT NULL,
  active_subscribers INT NOT NULL,
  trials INT NOT NULL,
  churn_rate NUMERIC(6,4),
  arpa_cents BIGINT,
  new_subs INT NOT NULL,
  cancels INT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prd_documents_workspace ON prd_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_prd_documents_platform ON prd_documents(platform);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_received ON stripe_events(received_at);

-- Insert platform data (only if empty)
INSERT INTO platforms (id, label, ordering, enabled)
SELECT 'replit', 'Replit', 1, true
WHERE NOT EXISTS (SELECT 1 FROM platforms WHERE id = 'replit');

INSERT INTO platforms (id, label, ordering, enabled)
SELECT 'bolt', 'Bolt.new', 2, true
WHERE NOT EXISTS (SELECT 1 FROM platforms WHERE id = 'bolt');

INSERT INTO platforms (id, label, ordering, enabled)
SELECT 'leap', 'Leap.new', 3, true
WHERE NOT EXISTS (SELECT 1 FROM platforms WHERE id = 'leap');

INSERT INTO platforms (id, label, ordering, enabled)
SELECT 'lovable', 'Lovable', 4, true
WHERE NOT EXISTS (SELECT 1 FROM platforms WHERE id = 'lovable');

-- Insert platform parameters (only if empty)
-- Note: You may need to delete and re-insert if you want to update these

-- Enable Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Users can view PRDs in their workspaces" ON prd_documents;
DROP POLICY IF EXISTS "Editors can create PRDs" ON prd_documents;
DROP POLICY IF EXISTS "Editors can update PRDs" ON prd_documents;
DROP POLICY IF EXISTS "Users can view PRD versions in their workspaces" ON prd_versions;
DROP POLICY IF EXISTS "Editors can create PRD versions" ON prd_versions;
DROP POLICY IF EXISTS "Users can view their billing info" ON billing_customers;
DROP POLICY IF EXISTS "Users can create their billing info" ON billing_customers;
DROP POLICY IF EXISTS "Users can update their billing info" ON billing_customers;
DROP POLICY IF EXISTS "Users can view subscriptions for their workspaces" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert subscriptions for their workspaces" ON subscriptions;
DROP POLICY IF EXISTS "Users can update subscriptions for their workspaces" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can view platforms" ON platforms;
DROP POLICY IF EXISTS "Anyone can view platform params" ON platform_params;

-- RLS Policies
CREATE POLICY "Users can view workspaces they are members of" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view members of their workspaces" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
  );

CREATE POLICY "Users can view PRDs in their workspaces" ON prd_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = prd_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create PRDs" ON prd_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = prd_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Editors can update PRDs" ON prd_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = prd_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can view PRD versions in their workspaces" ON prd_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM prd_documents pd
      JOIN workspace_members wm ON wm.workspace_id = pd.workspace_id
      WHERE pd.id = prd_versions.prd_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create PRD versions" ON prd_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM prd_documents pd
      JOIN workspace_members wm ON wm.workspace_id = pd.workspace_id
      WHERE pd.id = prd_versions.prd_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can view their billing info" ON billing_customers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their billing info" ON billing_customers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their billing info" ON billing_customers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view subscriptions for their workspaces" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert subscriptions for their workspaces" ON subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update subscriptions for their workspaces" ON subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Anyone can view platforms" ON platforms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view platform params" ON platform_params
  FOR SELECT USING (true);

-- Helper function to get user's workspace IDs (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION get_user_workspace_ids(check_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT workspace_id
  FROM workspace_members
  WHERE user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_prd_documents_updated_at ON prd_documents;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- Apply triggers
CREATE TRIGGER update_prd_documents_updated_at BEFORE UPDATE ON prd_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database setup complete! All tables, policies, and triggers have been created.' AS message;
