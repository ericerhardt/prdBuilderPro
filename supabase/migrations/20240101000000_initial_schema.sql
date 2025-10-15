-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Multi-tenant workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT CHECK (role IN ('owner','admin','editor','viewer')) NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

-- PRD Documents
CREATE TABLE prd_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,                -- 'replit' | 'bolt' | 'leap' | 'lovable'
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',    -- captured UI inputs
  version INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prd_versions (
  prd_id UUID REFERENCES prd_documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  body_markdown TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (prd_id, version)
);

-- Platform registry (drives dynamic UI)
CREATE TABLE platforms (
  id TEXT PRIMARY KEY,                   -- 'replit','bolt','leap','lovable'
  label TEXT NOT NULL,
  ordering INT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE platform_params (
  id BIGSERIAL PRIMARY KEY,
  platform_id TEXT REFERENCES platforms(id) ON DELETE CASCADE,
  key TEXT NOT NULL,                     -- e.g., 'backend', 'mcp_connectors'
  label TEXT NOT NULL,
  type TEXT NOT NULL,                    -- 'text'|'textarea'|'select'|'multiselect'|'boolean'
  help TEXT,
  options JSONB,                         -- for select types
  required BOOLEAN DEFAULT FALSE,
  advanced BOOLEAN DEFAULT FALSE
);

-- Stripe billing
CREATE TABLE billing_customers (
  user_id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan_id TEXT,                          -- FK to internal plan catalog
  status TEXT,                           -- trialing, active, past_due, canceled, incomplete
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stripe_events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics snapshots
CREATE TABLE billing_metrics_daily (
  day DATE PRIMARY KEY,
  mrr_cents BIGINT NOT NULL,
  active_subscribers INT NOT NULL,
  trials INT NOT NULL,
  churn_rate NUMERIC(6,4),
  arpa_cents BIGINT,
  new_subs INT NOT NULL,
  cancels INT NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_prd_documents_workspace ON prd_documents(workspace_id);
CREATE INDEX idx_prd_documents_platform ON prd_documents(platform);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_subscriptions_workspace ON subscriptions(workspace_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_stripe_events_type ON stripe_events(type);
CREATE INDEX idx_stripe_events_received ON stripe_events(received_at);

-- Insert initial platform data
INSERT INTO platforms (id, label, ordering, enabled) VALUES
  ('replit', 'Replit', 1, true),
  ('bolt', 'Bolt.new', 2, true),
  ('leap', 'Leap.new', 3, true),
  ('lovable', 'Lovable', 4, true);

-- Insert platform parameters
-- Replit parameters
INSERT INTO platform_params (platform_id, key, label, type, help, options, required, advanced) VALUES
  ('replit', 'backend', 'Backend Framework', 'select', 'Choose your backend framework',
   '{"options": ["Node/Express", "FastAPI", "Flask"]}', true, false),
  ('replit', 'persistence', 'Persistence Layer', 'select', 'Choose your database solution',
   '{"options": ["Replit DB", "Supabase", "SQLite (dev)"]}', true, false),
  ('replit', 'deployment', 'Deployment Options', 'text', 'Deployment configuration (Replit Nix + secrets)', NULL, false, true),
  ('replit', 'template', 'Replit Template', 'text', 'Official template to use', NULL, false, true);

-- Bolt.new parameters
INSERT INTO platform_params (platform_id, key, label, type, help, options, required, advanced) VALUES
  ('bolt', 'codegen_target', 'Framework', 'select', 'Target framework for code generation',
   '{"options": ["Next.js", "Remix"]}', true, false),
  ('bolt', 'auth_source', 'Authentication', 'select', 'Choose authentication provider',
   '{"options": ["Supabase", "Clerk"]}', true, false),
  ('bolt', 'hosting', 'Hosting Assumptions', 'textarea', 'Hosting configuration and secret management', NULL, false, true);

-- Leap.new parameters
INSERT INTO platform_params (platform_id, key, label, type, help, options, required, advanced) VALUES
  ('leap', 'model_runtime', 'Model/Runtime', 'select', 'Choose the AI model runtime',
   '{"options": ["Claude", "OpenAI", "Custom"]}', true, false),
  ('leap', 'mcp_connectors', 'MCP Connectors', 'multiselect', 'Select Model Context Protocol connectors',
   '{"options": ["Filesystem", "GitHub", "Google Drive", "Notion", "Slack"]}', true, false),
  ('leap', 'tools_apis', 'Tools & APIs', 'textarea', 'Additional tools: vector DB, embeddings, validators', NULL, false, true),
  ('leap', 'guardrails', 'Guardrails', 'textarea', 'Safety measures: PII redaction, prompt-budget, eval hooks', NULL, false, true);

-- Lovable parameters
INSERT INTO platform_params (platform_id, key, label, type, help, options, required, advanced) VALUES
  ('lovable', 'project_type', 'Project Type', 'select', 'Type of project to build',
   '{"options": ["Web app", "Mobile", "Landing + backend"]}', true, false),
  ('lovable', 'source_control', 'Source Control', 'textarea', 'GitHub repo settings and configuration', NULL, false, true),
  ('lovable', 'integrations', 'Integrations', 'multiselect', 'Built-in integrations',
   '{"options": ["Supabase", "Stripe", "Upload service"]}', false, false),
  ('lovable', 'collaboration', 'Collaboration', 'textarea', 'PR flow assumptions and team settings', NULL, false, true);

-- Enable Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_metrics_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Workspaces: users can only see workspaces they're members of
CREATE POLICY "Users can view workspaces they are members of" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Workspace members: users can only see members of their workspaces
CREATE POLICY "Users can view members of their workspaces" ON workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- PRD documents: users can only see PRDs in their workspaces
CREATE POLICY "Users can view PRDs in their workspaces" ON prd_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = prd_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- PRD documents: users can create PRDs in their workspaces (if editor or above)
CREATE POLICY "Editors can create PRDs" ON prd_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = prd_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

-- PRD documents: users can update PRDs in their workspaces (if editor or above)
CREATE POLICY "Editors can update PRDs" ON prd_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = prd_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

-- Similar policies for prd_versions
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

-- Billing policies
CREATE POLICY "Users can view their billing info" ON billing_customers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view subscriptions for their workspaces" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Public read access for platforms and platform_params
CREATE POLICY "Anyone can view platforms" ON platforms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view platform params" ON platform_params
  FOR SELECT USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_prd_documents_updated_at BEFORE UPDATE ON prd_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
