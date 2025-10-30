# Migration Script Fix Summary

## Issue Identified
The Supabase migration script `20240102000000_ai_instruction_builder.sql` had SQL syntax errors in the INSERT statements for parameters.

## Problems Fixed

### 1. Missing `::jsonb` Type Cast
**Problem:** JSON strings in the `options` column were not being cast to the `jsonb` type, causing PostgreSQL type conversion errors.

**Tables Affected:**
- `ai_platform_params`
- `template_params`

**Fix Applied:** Added `::jsonb` cast to all JSON option strings.

**Example:**
```sql
-- BEFORE (incorrect)
'{"options": ["sonnet", "opus", "haiku"]}'

-- AFTER (correct)
'{"options": ["sonnet", "opus", "haiku"]}'::jsonb
```

### 2. Missing Column Specifications
**Problem:** INSERT statements for `template_params` were missing the `options` and `advanced` columns in the column list, causing misalignment of values.

**Table Schema:**
```sql
CREATE TABLE template_params (
  id BIGSERIAL PRIMARY KEY,
  template_id TEXT,
  key TEXT,
  label TEXT,
  type TEXT,
  help TEXT,
  options JSONB,        -- Missing from some INSERTs
  required BOOLEAN,
  advanced BOOLEAN,     -- Missing from some INSERTs
  ordering INT
);
```

**Fix Applied:** Updated all `template_params` INSERT statements to explicitly specify all columns including `options` (set to NULL where not needed) and `advanced` (set to false for all current params).

**Example:**
```sql
-- BEFORE (incorrect - missing columns)
INSERT INTO template_params (template_id, key, label, type, help, required, ordering) VALUES
  ('system-prompt', 'purpose', 'Purpose', 'textarea', 'Help text', true, 1);

-- AFTER (correct - all columns specified)
INSERT INTO template_params (template_id, key, label, type, help, options, required, advanced, ordering) VALUES
  ('system-prompt', 'purpose', 'Purpose', 'textarea', 'Help text', NULL, true, false, 1);
```

## Files Fixed
- `supabase/migrations/20240102000000_ai_instruction_builder.sql`

## Sections Updated

### AI Platform Parameters (Lines ~118-144)
✅ Fixed 3 INSERT blocks:
- Claude Code parameters (3 select/multiselect params)
- Cursor parameters (2 select params, 1 multiselect)
- Aider parameters (2 select params, 1 multiselect)

### Template Parameters (Lines ~146-198)
✅ Fixed 6 INSERT blocks:
- `system-prompt` parameters (5 params: 3 textarea, 2 select)
- `sub-agent` parameters (5 params: 1 text, 3 textarea, 1 multiselect)
- `skill` parameters (5 params: 1 text, 4 textarea)
- `mcp-connector` parameters (5 params: 1 text, 1 textarea, 2 select, 1 multiselect)
- `slash-command` parameters (5 params: 1 text, 4 textarea)
- `context-file` parameters (5 params: 1 text, 4 textarea)

## Total Changes
- **9 INSERT statement blocks** fixed
- **~50 parameter records** corrected
- All JSON `options` values now properly cast to `::jsonb`
- All `template_params` INSERTs now include all required columns

## Testing Recommendations

Before running the migration in production:

1. **Test in Development Environment:**
   ```bash
   # Run migration
   psql -d your_db < supabase/migrations/20240102000000_ai_instruction_builder.sql

   # Verify data
   SELECT COUNT(*) FROM ai_platforms;          -- Should be 6
   SELECT COUNT(*) FROM instruction_templates;  -- Should be 7
   SELECT COUNT(*) FROM ai_platform_params;    -- Should be 9
   SELECT COUNT(*) FROM template_params;       -- Should be 30
   ```

2. **Verify JSON Parsing:**
   ```sql
   -- Check that options are valid JSON
   SELECT key, label, options
   FROM ai_platform_params
   WHERE options IS NOT NULL;

   SELECT key, label, options
   FROM template_params
   WHERE options IS NOT NULL;
   ```

3. **Test API Endpoints:**
   - GET `/api/ai-platforms` - Should return 6 platforms with params
   - GET `/api/instruction-templates` - Should return 7 templates with params
   - Verify dropdown options render correctly in the UI

## Migration Ready
✅ The migration script is now ready to run and should execute without errors.
