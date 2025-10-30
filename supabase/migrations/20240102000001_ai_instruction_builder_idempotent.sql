-- AI Instruction Builder Schema (Idempotent Version)
-- This feature allows users to generate AI agent instruction files (sub-agents, skills, MCP connectors, etc.)
-- This version can be run multiple times safely - it checks if objects exist before creating them

-- AI Platform registry (similar to platforms but for AI systems)
CREATE TABLE IF NOT EXISTS ai_platforms (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  ordering INT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instruction template types (what kind of instruction files can be generated)
CREATE TABLE IF NOT EXISTS instruction_templates (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  file_extension TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  ordering INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Platform parameters (dynamic configuration per platform)
CREATE TABLE IF NOT EXISTS ai_platform_params (
  id BIGSERIAL PRIMARY KEY,
  platform_id TEXT REFERENCES ai_platforms(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  help TEXT,
  options JSONB,
  required BOOLEAN DEFAULT FALSE,
  advanced BOOLEAN DEFAULT FALSE,
  ordering INT DEFAULT 0
);

-- Template parameters (configuration specific to each template type)
CREATE TABLE IF NOT EXISTS template_params (
  id BIGSERIAL PRIMARY KEY,
  template_id TEXT REFERENCES instruction_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  help TEXT,
  options JSONB,
  required BOOLEAN DEFAULT FALSE,
  advanced BOOLEAN DEFAULT FALSE,
  ordering INT DEFAULT 0
);

-- Generated instruction documents
CREATE TABLE IF NOT EXISTS instruction_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform_id TEXT REFERENCES ai_platforms(id),
  template_id TEXT REFERENCES instruction_templates(id),
  title TEXT NOT NULL,
  body_content TEXT NOT NULL,
  file_name TEXT,
  params JSONB NOT NULL DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version history for instructions
CREATE TABLE IF NOT EXISTS instruction_versions (
  instruction_id UUID REFERENCES instruction_documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  body_content TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (instruction_id, version)
);

-- Platform-Template compatibility (which templates are available for which platforms)
CREATE TABLE IF NOT EXISTS platform_template_compatibility (
  platform_id TEXT REFERENCES ai_platforms(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES instruction_templates(id) ON DELETE CASCADE,
  recommended BOOLEAN DEFAULT FALSE,
  notes TEXT,
  PRIMARY KEY (platform_id, template_id)
);

-- Create indexes (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_instruction_documents_workspace') THEN
    CREATE INDEX idx_instruction_documents_workspace ON instruction_documents(workspace_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_instruction_documents_platform') THEN
    CREATE INDEX idx_instruction_documents_platform ON instruction_documents(platform_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_instruction_documents_template') THEN
    CREATE INDEX idx_instruction_documents_template ON instruction_documents(template_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_platform_params_platform') THEN
    CREATE INDEX idx_ai_platform_params_platform ON ai_platform_params(platform_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_template_params_template') THEN
    CREATE INDEX idx_template_params_template ON template_params(template_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_template_compatibility_platform') THEN
    CREATE INDEX idx_platform_template_compatibility_platform ON platform_template_compatibility(platform_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_platform_template_compatibility_template') THEN
    CREATE INDEX idx_platform_template_compatibility_template ON platform_template_compatibility(template_id);
  END IF;
END $$;

-- Insert initial AI platforms (only if they don't exist)
INSERT INTO ai_platforms (id, label, description, ordering, enabled)
SELECT * FROM (VALUES
  ('claude-code', 'Claude Code', 'Anthropic Claude for coding tasks with MCP support', 1, true),
  ('cursor', 'Cursor', 'AI-powered code editor with multi-file editing', 2, true),
  ('aider', 'Aider', 'AI pair programming in your terminal', 3, true),
  ('github-copilot', 'GitHub Copilot', 'AI code completion and chat', 4, true),
  ('windsurf', 'Windsurf', 'Codeium''s agentic IDE', 5, true),
  ('custom', 'Custom/Other', 'Custom AI platform or general purpose', 99, true)
) AS v(id, label, description, ordering, enabled)
WHERE NOT EXISTS (SELECT 1 FROM ai_platforms WHERE ai_platforms.id = v.id);

-- Insert instruction template types (only if they don't exist)
INSERT INTO instruction_templates (id, label, description, file_extension, ordering, enabled)
SELECT * FROM (VALUES
  ('system-prompt', 'System Prompt', 'Core system instructions for AI behavior', '.md', 1, true),
  ('sub-agent', 'Sub-Agent', 'Specialized agent for specific tasks', '.md', 2, true),
  ('skill', 'Skill/Tool', 'Reusable skill or tool definition', '.json', 3, true),
  ('mcp-connector', 'MCP Connector', 'Model Context Protocol server configuration', '.json', 4, true),
  ('slash-command', 'Slash Command', 'Custom slash command for IDE', '.md', 5, true),
  ('workflow', 'Workflow', 'Multi-step workflow or automation', '.yaml', 6, true),
  ('context-file', 'Context File', 'Project context and guidelines (CLAUDE.md, .cursorrules, etc.)', '.md', 7, true)
) AS v(id, label, description, file_extension, ordering, enabled)
WHERE NOT EXISTS (SELECT 1 FROM instruction_templates WHERE instruction_templates.id = v.id);

-- Insert Claude Code specific parameters (only if they don't exist)
INSERT INTO ai_platform_params (platform_id, key, label, type, help, options, required, ordering)
SELECT v.platform_id, v.key, v.label, v.type, v.help, v.options::jsonb, v.required, v.ordering
FROM (VALUES
  ('claude-code', 'model', 'Model', 'select', 'Choose the Claude model',
   '{"options": ["sonnet", "opus", "haiku"]}', true, 1),
  ('claude-code', 'mcp_servers', 'MCP Servers', 'multiselect', 'Available MCP servers',
   '{"options": ["filesystem", "github", "gitlab", "postgres", "sqlite", "puppeteer", "brave-search", "google-maps", "slack", "memory"]}', false, 2),
  ('claude-code', 'tools', 'Available Tools', 'multiselect', 'Tools the agent can use',
   '{"options": ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "WebFetch", "WebSearch"]}', false, 3),
  ('claude-code', 'capabilities', 'Agent Capabilities', 'textarea', 'Describe specific capabilities needed', NULL, false, 4)
) AS v(platform_id, key, label, type, help, options, required, ordering)
WHERE NOT EXISTS (
  SELECT 1 FROM ai_platform_params
  WHERE ai_platform_params.platform_id = v.platform_id
  AND ai_platform_params.key = v.key
);

-- Insert Cursor specific parameters (only if they don't exist)
INSERT INTO ai_platform_params (platform_id, key, label, type, help, options, required, ordering)
SELECT v.platform_id, v.key, v.label, v.type, v.help, v.options::jsonb, v.required, v.ordering
FROM (VALUES
  ('cursor', 'mode', 'Mode', 'select', 'Cursor interaction mode',
   '{"options": ["Composer", "Chat", "Inline Edit"]}', true, 1),
  ('cursor', 'rules_type', 'Rules Type', 'select', 'Type of cursor rules',
   '{"options": [".cursorrules", "Project rules", "User rules"]}', true, 2),
  ('cursor', 'context_sources', 'Context Sources', 'multiselect', 'Where to pull context from',
   '{"options": ["Codebase", "Docs", "Web", "Terminal"]}', false, 3)
) AS v(platform_id, key, label, type, help, options, required, ordering)
WHERE NOT EXISTS (
  SELECT 1 FROM ai_platform_params
  WHERE ai_platform_params.platform_id = v.platform_id
  AND ai_platform_params.key = v.key
);

-- Insert Aider specific parameters (only if they don't exist)
INSERT INTO ai_platform_params (platform_id, key, label, type, help, options, required, ordering)
SELECT v.platform_id, v.key, v.label, v.type, v.help, v.options::jsonb, v.required, v.ordering
FROM (VALUES
  ('aider', 'model_type', 'Model', 'select', 'LLM model for aider',
   '{"options": ["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]}', true, 1),
  ('aider', 'edit_format', 'Edit Format', 'select', 'Code editing format',
   '{"options": ["whole", "diff", "udiff"]}', true, 2),
  ('aider', 'features', 'Features', 'multiselect', 'Enabled features',
   '{"options": ["auto-commits", "auto-test", "lint", "voice"]}', false, 3)
) AS v(platform_id, key, label, type, help, options, required, ordering)
WHERE NOT EXISTS (
  SELECT 1 FROM ai_platform_params
  WHERE ai_platform_params.platform_id = v.platform_id
  AND ai_platform_params.key = v.key
);

-- Insert template parameters for system-prompt (only if they don't exist)
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering)
SELECT v.template_id, v.key, v.label, v.type, v.help, v.options::jsonb, v.required, v.advanced, v.ordering
FROM (VALUES
  ('system-prompt', 'purpose', 'Purpose', 'textarea', 'What is the primary purpose of this AI agent?', NULL, true, false, 1),
  ('system-prompt', 'expertise', 'Expertise Areas', 'textarea', 'What domains/technologies should it be expert in?', NULL, true, false, 2),
  ('system-prompt', 'constraints', 'Constraints', 'textarea', 'What should it NOT do or avoid?', NULL, false, false, 3),
  ('system-prompt', 'tone', 'Tone & Style', 'select', 'Communication style',
   '{"options": ["Professional", "Casual", "Technical", "Friendly", "Concise"]}', false, false, 4),
  ('system-prompt', 'output_format', 'Output Format', 'select', 'Preferred output format',
   '{"options": ["Markdown", "Code blocks", "Structured JSON", "Plain text"]}', false, false, 5)
) AS v(template_id, key, label, type, help, options, required, advanced, ordering)
WHERE NOT EXISTS (
  SELECT 1 FROM template_params
  WHERE template_params.template_id = v.template_id
  AND template_params.key = v.key
);

-- Insert template parameters for sub-agent (only if they don't exist)
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering)
SELECT v.template_id, v.key, v.label, v.type, v.help, v.options::jsonb, v.required, v.advanced, v.ordering
FROM (VALUES
  ('sub-agent', 'agent_name', 'Agent Name', 'text', 'Name for this sub-agent', NULL, true, false, 1),
  ('sub-agent', 'specialization', 'Specialization', 'textarea', 'What specific task is this agent specialized for?', NULL, true, false, 2),
  ('sub-agent', 'tools_needed', 'Required Tools', 'multiselect', 'Tools this agent needs access to',
   '{"options": ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "WebFetch", "WebSearch", "Task"]}', false, false, 3),
  ('sub-agent', 'trigger_condition', 'Trigger Condition', 'textarea', 'When should this agent be invoked?', NULL, true, false, 4),
  ('sub-agent', 'success_criteria', 'Success Criteria', 'textarea', 'How do you know when the task is complete?', NULL, false, false, 5)
) AS v(template_id, key, label, type, help, options, required, advanced, ordering)
WHERE NOT EXISTS (
  SELECT 1 FROM template_params
  WHERE template_params.template_id = v.template_id
  AND template_params.key = v.key
);

-- Insert template parameters for skill (only if they don't exist)
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering)
SELECT v.template_id, v.key, v.label, v.type, v.help, v.options::jsonb, v.required, v.advanced, v.ordering
FROM (VALUES
  ('skill', 'skill_name', 'Skill Name', 'text', 'Name for this skill', NULL, true, false, 1),
  ('skill', 'description', 'Description', 'textarea', 'What does this skill do?', NULL, true, false, 2),
  ('skill', 'input_schema', 'Input Schema', 'textarea', 'Expected input parameters (JSON schema)', NULL, false, false, 3),
  ('skill', 'output_schema', 'Output Schema', 'textarea', 'Expected output format (JSON schema)', NULL, false, false, 4),
  ('skill', 'implementation', 'Implementation Notes', 'textarea', 'How should this be implemented?', NULL, false, false, 5)
) AS v(template_id, key, label, type, help, options, required, advanced, ordering)
WHERE NOT EXISTS (
  SELECT 1 FROM template_params
  WHERE template_params.template_id = v.template_id
  AND template_params.key = v.key
);

-- Insert template parameters for mcp-connector (only if they don't exist)
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering)
SELECT v.template_id, v.key, v.label, v.type, v.help, v.options::jsonb, v.required, v.advanced, v.ordering
FROM (VALUES
  ('mcp-connector', 'connector_name', 'Connector Name', 'text', 'Name for this MCP connector', NULL, true, false, 1),
  ('mcp-connector', 'service_type', 'Service Type', 'select', 'Type of service to connect',
   '{"options": ["Database", "API", "File System", "Cloud Storage", "Version Control", "Other"]}', true, false, 2),
  ('mcp-connector', 'capabilities', 'Capabilities', 'multiselect', 'What operations should it support?',
   '{"options": ["Read", "Write", "Search", "List", "Delete", "Update"]}', true, false, 3),
  ('mcp-connector', 'auth_method', 'Authentication', 'select', 'Authentication method',
   '{"options": ["API Key", "OAuth", "Basic Auth", "None"]}', false, false, 4),
  ('mcp-connector', 'config_details', 'Configuration Details', 'textarea', 'Specific configuration requirements', NULL, false, false, 5)
) AS v(template_id, key, label, type, help, options, required, advanced, ordering)
WHERE NOT EXISTS (
  SELECT 1 FROM template_params
  WHERE template_params.template_id = v.template_id
  AND template_params.key = v.key
);

-- Insert template parameters for slash-command (only if they don't exist)
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering)
SELECT v.template_id, v.key, v.label, v.type, v.help, v.options::jsonb, v.required, v.advanced, v.ordering
FROM (VALUES
  ('slash-command', 'command_name', 'Command Name', 'text', 'Name for the slash command (e.g., /review-code)', NULL, true, false, 1),
  ('slash-command', 'description', 'Description', 'textarea', 'What does this command do?', NULL, true, false, 2),
  ('slash-command', 'arguments', 'Arguments', 'textarea', 'What arguments does it accept?', NULL, false, false, 3),
  ('slash-command', 'workflow', 'Workflow Steps', 'textarea', 'Step-by-step workflow for this command', NULL, true, false, 4),
  ('slash-command', 'examples', 'Usage Examples', 'textarea', 'Example use cases', NULL, false, false, 5)
) AS v(template_id, key, label, type, help, options, required, advanced, ordering)
WHERE NOT EXISTS (
  SELECT 1 FROM template_params
  WHERE template_params.template_id = v.template_id
  AND template_params.key = v.key
);

-- Insert template parameters for context-file (only if they don't exist)
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering)
SELECT v.template_id, v.key, v.label, v.type, v.help, v.options::jsonb, v.required, v.advanced, v.ordering
FROM (VALUES
  ('context-file', 'project_type', 'Project Type', 'text', 'Type of project (e.g., Next.js app, Python API)', NULL, true, false, 1),
  ('context-file', 'tech_stack', 'Tech Stack', 'textarea', 'Main technologies and frameworks', NULL, true, false, 2),
  ('context-file', 'coding_standards', 'Coding Standards', 'textarea', 'Code style and conventions to follow', NULL, false, false, 3),
  ('context-file', 'architecture', 'Architecture Notes', 'textarea', 'Key architectural decisions and patterns', NULL, false, false, 4),
  ('context-file', 'gotchas', 'Common Gotchas', 'textarea', 'Things AI should watch out for', NULL, false, false, 5)
) AS v(template_id, key, label, type, help, options, required, advanced, ordering)
WHERE NOT EXISTS (
  SELECT 1 FROM template_params
  WHERE template_params.template_id = v.template_id
  AND template_params.key = v.key
);

-- Set up platform-template compatibility (only if they don't exist)
INSERT INTO platform_template_compatibility (platform_id, template_id, recommended, notes)
SELECT * FROM (VALUES
  -- Claude Code compatibilities
  ('claude-code', 'system-prompt', true, 'Claude Code uses system prompts for agent behavior'),
  ('claude-code', 'sub-agent', true, 'Sub-agents are core to Claude Code''s Task tool'),
  ('claude-code', 'skill', true, 'Skills extend Claude Code capabilities'),
  ('claude-code', 'mcp-connector', true, 'Native MCP support'),
  ('claude-code', 'slash-command', true, 'Custom slash commands in .claude/commands/'),
  ('claude-code', 'context-file', true, 'CLAUDE.md provides project context'),

  -- Cursor compatibilities
  ('cursor', 'system-prompt', false, 'Use .cursorrules instead'),
  ('cursor', 'context-file', true, '.cursorrules file for project context'),
  ('cursor', 'workflow', true, 'Composer mode supports workflows'),

  -- Aider compatibilities
  ('aider', 'system-prompt', true, 'Custom system prompts via config'),
  ('aider', 'context-file', true, 'Project context in .aider.conf.yml'),

  -- GitHub Copilot compatibilities
  ('github-copilot', 'context-file', true, 'Use .github/copilot-instructions.md'),
  ('github-copilot', 'workflow', false, 'Limited workflow support'),

  -- Windsurf compatibilities
  ('windsurf', 'system-prompt', true, 'Custom instructions for Cascade'),
  ('windsurf', 'context-file', true, 'Project rules and context'),
  ('windsurf', 'workflow', true, 'Flows support multi-step tasks'),

  -- Custom/Other (all compatible)
  ('custom', 'system-prompt', true, NULL),
  ('custom', 'sub-agent', true, NULL),
  ('custom', 'skill', true, NULL),
  ('custom', 'mcp-connector', true, NULL),
  ('custom', 'slash-command', true, NULL),
  ('custom', 'workflow', true, NULL),
  ('custom', 'context-file', true, NULL)
) AS v(platform_id, template_id, recommended, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_template_compatibility
  WHERE platform_template_compatibility.platform_id = v.platform_id
  AND platform_template_compatibility.template_id = v.template_id
);

-- Enable Row Level Security (idempotent)
ALTER TABLE ai_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_platform_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_template_compatibility ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies
DO $$
BEGIN
  -- Drop existing policies if they exist (so we can recreate them)
  DROP POLICY IF EXISTS "Anyone can view AI platforms" ON ai_platforms;
  DROP POLICY IF EXISTS "Anyone can view instruction templates" ON instruction_templates;
  DROP POLICY IF EXISTS "Anyone can view AI platform params" ON ai_platform_params;
  DROP POLICY IF EXISTS "Anyone can view template params" ON template_params;
  DROP POLICY IF EXISTS "Anyone can view platform-template compatibility" ON platform_template_compatibility;
  DROP POLICY IF EXISTS "Users can view instructions in their workspaces" ON instruction_documents;
  DROP POLICY IF EXISTS "Editors can create instructions" ON instruction_documents;
  DROP POLICY IF EXISTS "Editors can update instructions" ON instruction_documents;
  DROP POLICY IF EXISTS "Users can view instruction versions in their workspaces" ON instruction_versions;
  DROP POLICY IF EXISTS "Editors can create instruction versions" ON instruction_versions;
  DROP POLICY IF EXISTS "Admins can insert AI platforms" ON ai_platforms;
  DROP POLICY IF EXISTS "Admins can update AI platforms" ON ai_platforms;
  DROP POLICY IF EXISTS "Admins can delete AI platforms" ON ai_platforms;
  DROP POLICY IF EXISTS "Admins can insert AI platform params" ON ai_platform_params;
  DROP POLICY IF EXISTS "Admins can update AI platform params" ON ai_platform_params;
  DROP POLICY IF EXISTS "Admins can delete AI platform params" ON ai_platform_params;
END $$;

-- Create policies
CREATE POLICY "Anyone can view AI platforms" ON ai_platforms
  FOR SELECT USING (enabled = true);

CREATE POLICY "Anyone can view instruction templates" ON instruction_templates
  FOR SELECT USING (enabled = true);

CREATE POLICY "Anyone can view AI platform params" ON ai_platform_params
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view template params" ON template_params
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view platform-template compatibility" ON platform_template_compatibility
  FOR SELECT USING (true);

CREATE POLICY "Users can view instructions in their workspaces" ON instruction_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = instruction_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create instructions" ON instruction_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = instruction_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Editors can update instructions" ON instruction_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = instruction_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can view instruction versions in their workspaces" ON instruction_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instruction_documents id
      JOIN workspace_members wm ON wm.workspace_id = id.workspace_id
      WHERE id.id = instruction_versions.instruction_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create instruction versions" ON instruction_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM instruction_documents id
      JOIN workspace_members wm ON wm.workspace_id = id.workspace_id
      WHERE id.id = instruction_versions.instruction_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Admins can insert AI platforms" ON ai_platforms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update AI platforms" ON ai_platforms
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete AI platforms" ON ai_platforms
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert AI platform params" ON ai_platform_params
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update AI platform params" ON ai_platform_params
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete AI platform params" ON ai_platform_params
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create or replace triggers
DROP TRIGGER IF EXISTS update_ai_platforms_updated_at ON ai_platforms;
CREATE TRIGGER update_ai_platforms_updated_at BEFORE UPDATE ON ai_platforms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_instruction_documents_updated_at ON instruction_documents;
CREATE TRIGGER update_instruction_documents_updated_at BEFORE UPDATE ON instruction_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'AI Instruction Builder migration completed successfully!';
  RAISE NOTICE 'Tables created/verified: 7';
  RAISE NOTICE 'Platforms: % rows', (SELECT COUNT(*) FROM ai_platforms);
  RAISE NOTICE 'Templates: % rows', (SELECT COUNT(*) FROM instruction_templates);
  RAISE NOTICE 'Platform params: % rows', (SELECT COUNT(*) FROM ai_platform_params);
  RAISE NOTICE 'Template params: % rows', (SELECT COUNT(*) FROM template_params);
END $$;
