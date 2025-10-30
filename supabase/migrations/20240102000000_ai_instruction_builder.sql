-- AI Instruction Builder Schema
-- This feature allows users to generate AI agent instruction files (sub-agents, skills, MCP connectors, etc.)

-- AI Platform registry (similar to platforms but for AI systems)
CREATE TABLE ai_platforms (
  id TEXT PRIMARY KEY,                   -- 'claude-code', 'cursor', 'aider', 'github-copilot', etc.
  label TEXT NOT NULL,
  description TEXT,
  ordering INT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  icon TEXT,                             -- icon name or URL
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instruction template types (what kind of instruction files can be generated)
CREATE TABLE instruction_templates (
  id TEXT PRIMARY KEY,                   -- 'sub-agent', 'skill', 'mcp-connector', 'system-prompt', 'slash-command'
  label TEXT NOT NULL,
  description TEXT,
  file_extension TEXT,                   -- '.md', '.json', '.yaml', etc.
  enabled BOOLEAN DEFAULT TRUE,
  ordering INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Platform parameters (dynamic configuration per platform)
CREATE TABLE ai_platform_params (
  id BIGSERIAL PRIMARY KEY,
  platform_id TEXT REFERENCES ai_platforms(id) ON DELETE CASCADE,
  key TEXT NOT NULL,                     -- e.g., 'model', 'tools', 'capabilities'
  label TEXT NOT NULL,
  type TEXT NOT NULL,                    -- 'text'|'textarea'|'select'|'multiselect'|'boolean'
  help TEXT,
  options JSONB,                         -- for select types
  required BOOLEAN DEFAULT FALSE,
  advanced BOOLEAN DEFAULT FALSE,
  ordering INT DEFAULT 0
);

-- Template parameters (configuration specific to each template type)
CREATE TABLE template_params (
  id BIGSERIAL PRIMARY KEY,
  template_id TEXT REFERENCES instruction_templates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,                     -- e.g., 'purpose', 'input_schema', 'output_format'
  label TEXT NOT NULL,
  type TEXT NOT NULL,                    -- 'text'|'textarea'|'select'|'multiselect'|'boolean'
  help TEXT,
  options JSONB,                         -- for select types
  required BOOLEAN DEFAULT FALSE,
  advanced BOOLEAN DEFAULT FALSE,
  ordering INT DEFAULT 0
);

-- Generated instruction documents
CREATE TABLE instruction_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform_id TEXT REFERENCES ai_platforms(id),
  template_id TEXT REFERENCES instruction_templates(id),
  title TEXT NOT NULL,
  body_content TEXT NOT NULL,            -- Generated instruction file content
  file_name TEXT,                        -- Suggested filename
  params JSONB NOT NULL DEFAULT '{}',    -- captured UI inputs
  version INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version history for instructions
CREATE TABLE instruction_versions (
  instruction_id UUID REFERENCES instruction_documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  body_content TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (instruction_id, version)
);

-- Platform-Template compatibility (which templates are available for which platforms)
CREATE TABLE platform_template_compatibility (
  platform_id TEXT REFERENCES ai_platforms(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES instruction_templates(id) ON DELETE CASCADE,
  recommended BOOLEAN DEFAULT FALSE,     -- Is this a recommended combination?
  notes TEXT,                            -- Special notes about this combination
  PRIMARY KEY (platform_id, template_id)
);

-- Create indexes for better performance
CREATE INDEX idx_instruction_documents_workspace ON instruction_documents(workspace_id);
CREATE INDEX idx_instruction_documents_platform ON instruction_documents(platform_id);
CREATE INDEX idx_instruction_documents_template ON instruction_documents(template_id);
CREATE INDEX idx_ai_platform_params_platform ON ai_platform_params(platform_id);
CREATE INDEX idx_template_params_template ON template_params(template_id);
CREATE INDEX idx_platform_template_compatibility_platform ON platform_template_compatibility(platform_id);
CREATE INDEX idx_platform_template_compatibility_template ON platform_template_compatibility(template_id);

-- Insert initial AI platforms
INSERT INTO ai_platforms (id, label, description, ordering, enabled) VALUES
  ('claude-code', 'Claude Code', 'Anthropic Claude for coding tasks with MCP support', 1, true),
  ('cursor', 'Cursor', 'AI-powered code editor with multi-file editing', 2, true),
  ('aider', 'Aider', 'AI pair programming in your terminal', 3, true),
  ('github-copilot', 'GitHub Copilot', 'AI code completion and chat', 4, true),
  ('windsurf', 'Windsurf', 'Codeium''s agentic IDE', 5, true),
  ('custom', 'Custom/Other', 'Custom AI platform or general purpose', 99, true);

-- Insert instruction template types
INSERT INTO instruction_templates (id, label, description, file_extension, ordering, enabled) VALUES
  ('system-prompt', 'System Prompt', 'Core system instructions for AI behavior', '.md', 1, true),
  ('sub-agent', 'Sub-Agent', 'Specialized agent for specific tasks', '.md', 2, true),
  ('skill', 'Skill/Tool', 'Reusable skill or tool definition', '.json', 3, true),
  ('mcp-connector', 'MCP Connector', 'Model Context Protocol server configuration', '.json', 4, true),
  ('slash-command', 'Slash Command', 'Custom slash command for IDE', '.md', 5, true),
  ('workflow', 'Workflow', 'Multi-step workflow or automation', '.yaml', 6, true),
  ('context-file', 'Context File', 'Project context and guidelines (CLAUDE.md, .cursorrules, etc.)', '.md', 7, true);

-- Insert Claude Code specific parameters
INSERT INTO ai_platform_params (platform_id, key, label, type, help, options, required, ordering) VALUES
  ('claude-code', 'model', 'Model', 'select', 'Choose the Claude model',
   '{"options": ["sonnet", "opus", "haiku"]}'::jsonb, true, 1),
  ('claude-code', 'mcp_servers', 'MCP Servers', 'multiselect', 'Available MCP servers',
   '{"options": ["filesystem", "github", "gitlab", "postgres", "sqlite", "puppeteer", "brave-search", "google-maps", "slack", "memory"]}'::jsonb, false, 2),
  ('claude-code', 'tools', 'Available Tools', 'multiselect', 'Tools the agent can use',
   '{"options": ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "WebFetch", "WebSearch"]}'::jsonb, false, 3),
  ('claude-code', 'capabilities', 'Agent Capabilities', 'textarea', 'Describe specific capabilities needed', NULL, false, 4);

-- Insert Cursor specific parameters
INSERT INTO ai_platform_params (platform_id, key, label, type, help, options, required, ordering) VALUES
  ('cursor', 'mode', 'Mode', 'select', 'Cursor interaction mode',
   '{"options": ["Composer", "Chat", "Inline Edit"]}'::jsonb, true, 1),
  ('cursor', 'rules_type', 'Rules Type', 'select', 'Type of cursor rules',
   '{"options": [".cursorrules", "Project rules", "User rules"]}'::jsonb, true, 2),
  ('cursor', 'context_sources', 'Context Sources', 'multiselect', 'Where to pull context from',
   '{"options": ["Codebase", "Docs", "Web", "Terminal"]}'::jsonb, false, 3);

-- Insert Aider specific parameters
INSERT INTO ai_platform_params (platform_id, key, label, type, help, options, required, ordering) VALUES
  ('aider', 'model_type', 'Model', 'select', 'LLM model for aider',
   '{"options": ["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]}'::jsonb, true, 1),
  ('aider', 'edit_format', 'Edit Format', 'select', 'Code editing format',
   '{"options": ["whole", "diff", "udiff"]}'::jsonb, true, 2),
  ('aider', 'features', 'Features', 'multiselect', 'Enabled features',
   '{"options": ["auto-commits", "auto-test", "lint", "voice"]}'::jsonb, false, 3);

-- Insert template parameters for system-prompt
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering) VALUES
  ('system-prompt', 'purpose', 'Purpose', 'textarea', 'What is the primary purpose of this AI agent?', NULL, true, false, 1),
  ('system-prompt', 'expertise', 'Expertise Areas', 'textarea', 'What domains/technologies should it be expert in?', NULL, true, false, 2),
  ('system-prompt', 'constraints', 'Constraints', 'textarea', 'What should it NOT do or avoid?', NULL, false, false, 3),
  ('system-prompt', 'tone', 'Tone & Style', 'select', 'Communication style',
   '{"options": ["Professional", "Casual", "Technical", "Friendly", "Concise"]}'::jsonb, false, false, 4),
  ('system-prompt', 'output_format', 'Output Format', 'select', 'Preferred output format',
   '{"options": ["Markdown", "Code blocks", "Structured JSON", "Plain text"]}'::jsonb, false, false, 5);

-- Insert template parameters for sub-agent
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering) VALUES
  ('sub-agent', 'agent_name', 'Agent Name', 'text', 'Name for this sub-agent', NULL, true, false, 1),
  ('sub-agent', 'specialization', 'Specialization', 'textarea', 'What specific task is this agent specialized for?', NULL, true, false, 2),
  ('sub-agent', 'tools_needed', 'Required Tools', 'multiselect', 'Tools this agent needs access to',
   '{"options": ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "WebFetch", "WebSearch", "Task"]}'::jsonb, false, false, 3),
  ('sub-agent', 'trigger_condition', 'Trigger Condition', 'textarea', 'When should this agent be invoked?', NULL, true, false, 4),
  ('sub-agent', 'success_criteria', 'Success Criteria', 'textarea', 'How do you know when the task is complete?', NULL, false, false, 5);

-- Insert template parameters for skill
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering) VALUES
  ('skill', 'skill_name', 'Skill Name', 'text', 'Name for this skill', NULL, true, false, 1),
  ('skill', 'description', 'Description', 'textarea', 'What does this skill do?', NULL, true, false, 2),
  ('skill', 'input_schema', 'Input Schema', 'textarea', 'Expected input parameters (JSON schema)', NULL, false, false, 3),
  ('skill', 'output_schema', 'Output Schema', 'textarea', 'Expected output format (JSON schema)', NULL, false, false, 4),
  ('skill', 'implementation', 'Implementation Notes', 'textarea', 'How should this be implemented?', NULL, false, false, 5);

-- Insert template parameters for mcp-connector
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering) VALUES
  ('mcp-connector', 'connector_name', 'Connector Name', 'text', 'Name for this MCP connector', NULL, true, false, 1),
  ('mcp-connector', 'service_type', 'Service Type', 'select', 'Type of service to connect',
   '{"options": ["Database", "API", "File System", "Cloud Storage", "Version Control", "Other"]}'::jsonb, true, false, 2),
  ('mcp-connector', 'capabilities', 'Capabilities', 'multiselect', 'What operations should it support?',
   '{"options": ["Read", "Write", "Search", "List", "Delete", "Update"]}'::jsonb, true, false, 3),
  ('mcp-connector', 'auth_method', 'Authentication', 'select', 'Authentication method',
   '{"options": ["API Key", "OAuth", "Basic Auth", "None"]}'::jsonb, false, false, 4),
  ('mcp-connector', 'config_details', 'Configuration Details', 'textarea', 'Specific configuration requirements', NULL, false, false, 5);

-- Insert template parameters for slash-command
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering) VALUES
  ('slash-command', 'command_name', 'Command Name', 'text', 'Name for the slash command (e.g., /review-code)', NULL, true, false, 1),
  ('slash-command', 'description', 'Description', 'textarea', 'What does this command do?', NULL, true, false, 2),
  ('slash-command', 'arguments', 'Arguments', 'textarea', 'What arguments does it accept?', NULL, false, false, 3),
  ('slash-command', 'workflow', 'Workflow Steps', 'textarea', 'Step-by-step workflow for this command', NULL, true, false, 4),
  ('slash-command', 'examples', 'Usage Examples', 'textarea', 'Example use cases', NULL, false, false, 5);

-- Insert template parameters for context-file
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering) VALUES
  ('context-file', 'project_type', 'Project Type', 'text', 'Type of project (e.g., Next.js app, Python API)', NULL, true, false, 1),
  ('context-file', 'tech_stack', 'Tech Stack', 'textarea', 'Main technologies and frameworks', NULL, true, false, 2),
  ('context-file', 'coding_standards', 'Coding Standards', 'textarea', 'Code style and conventions to follow', NULL, false, false, 3),
  ('context-file', 'architecture', 'Architecture Notes', 'textarea', 'Key architectural decisions and patterns', NULL, false, false, 4),
  ('context-file', 'gotchas', 'Common Gotchas', 'textarea', 'Things AI should watch out for', NULL, false, false, 5);

-- Set up platform-template compatibility
INSERT INTO platform_template_compatibility (platform_id, template_id, recommended, notes) VALUES
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
  ('custom', 'context-file', true, NULL);

-- Enable Row Level Security
ALTER TABLE ai_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_platform_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_template_compatibility ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public read access for AI platforms and templates
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

-- Instruction documents: users can only see instructions in their workspaces
CREATE POLICY "Users can view instructions in their workspaces" ON instruction_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = instruction_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Instruction documents: users can create instructions in their workspaces (if editor or above)
CREATE POLICY "Editors can create instructions" ON instruction_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = instruction_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

-- Instruction documents: users can update instructions in their workspaces (if editor or above)
CREATE POLICY "Editors can update instructions" ON instruction_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = instruction_documents.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'editor')
    )
  );

-- Similar policies for instruction_versions
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

-- Admin policies for managing AI platforms (TODO: add proper admin role check)
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

-- Apply updated_at trigger
CREATE TRIGGER update_ai_platforms_updated_at BEFORE UPDATE ON ai_platforms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instruction_documents_updated_at BEFORE UPDATE ON instruction_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
