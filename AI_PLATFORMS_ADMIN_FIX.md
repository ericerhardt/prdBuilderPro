# AI Platforms Admin Page - Issue Fix

## Changes Made

### 1. **Improved Error Handling**
**File:** `src/app/(app)/admin/ai-platforms/page.tsx`

Added better error messages that show the actual API error response instead of generic "Failed to fetch platforms". This will help identify the exact issue.

**Changes:**
- Extract error message from API response
- Show HTTP status codes
- Display more helpful error messages in toast notifications

### 2. **Diagnostic Endpoint Created**
**File:** `src/app/api/admin/diagnostics/route.ts` (NEW)

Created a diagnostic endpoint to check the state of all AI Instruction Builder tables.

**Usage:**
```
GET /api/admin/diagnostics
```

**What it checks:**
- Authentication status
- Existence of all 7 tables
- Row counts for each table
- Sample data from ai_platforms
- Specific error messages if tables are missing

### 3. **Troubleshooting Guide Created**
**File:** `TROUBLESHOOTING_AI_PLATFORMS.md` (NEW)

Comprehensive troubleshooting guide with:
- Common error messages and solutions
- SQL queries to check database state
- Step-by-step debugging process
- Migration instructions
- RLS policy verification

## Most Likely Root Cause

**The database migration hasn't been run yet.**

The tables `ai_platforms`, `ai_platform_params`, `instruction_templates`, etc. don't exist in your Supabase database.

## How to Fix

### Step 1: Run Diagnostics

Navigate to:
```
http://localhost:3000/api/admin/diagnostics
```

Or use curl:
```bash
curl http://localhost:3000/api/admin/diagnostics
```

This will show you exactly which tables are missing.

### Step 2: Run the Migration

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the entire contents of `supabase/migrations/20240102000000_ai_instruction_builder.sql`
4. Paste into the SQL editor
5. Click "Run"

**Option B: Via Supabase CLI** (if installed)
```bash
supabase db push
```

### Step 3: Verify Migration Ran Successfully

Run these SQL queries in Supabase SQL Editor:

```sql
-- Should return 6
SELECT COUNT(*) FROM ai_platforms;

-- Should return 9
SELECT COUNT(*) FROM ai_platform_params;

-- Should return 7
SELECT COUNT(*) FROM instruction_templates;

-- Should return 30
SELECT COUNT(*) FROM template_params;

-- View the platforms
SELECT id, label, ordering FROM ai_platforms ORDER BY ordering;
```

### Step 4: Test the Admin Page

1. Navigate to `/admin/ai-platforms`
2. You should now see 6 AI platforms listed:
   - Claude Code
   - Cursor
   - Aider
   - GitHub Copilot
   - Windsurf
   - Custom/Other

## Common Errors and Solutions

### Error: "relation 'ai_platforms' does not exist"
**Cause:** Migration not run
**Solution:** Follow Step 2 above to run the migration

### Error: "Unauthorized" (401)
**Cause:** Not logged in
**Solution:** Make sure you're logged in to the application

### Error: "new row violates row-level security policy"
**Cause:** RLS policies blocking insert
**Solution:** Check RLS policies in migration match the schema

### Error: HTTP 500 with no specific message
**Cause:** Server error (check server console)
**Solution:**
1. Check terminal where `npm run dev` is running
2. Look for detailed error stack trace
3. Usually related to missing tables or Supabase connection issues

## Verification Checklist

After running the migration, verify:

- [ ] Can access `/admin/ai-platforms` without errors
- [ ] See 6 platforms in the table
- [ ] Can click "Add Platform" and modal opens
- [ ] Can edit existing platforms
- [ ] Can see parameter counts in the table
- [ ] Diagnostic endpoint shows all tables exist

## Additional Debug Tools

### Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Navigate to `/admin/ai-platforms`
4. Look for:
   - Network errors (red in Network tab)
   - Console errors (red in Console tab)
   - Failed API requests

### Network Tab
1. Open DevTools → Network tab
2. Navigate to `/admin/ai-platforms`
3. Find the request to `/api/admin/ai-platforms`
4. Click on it to see:
   - Request headers
   - Response headers
   - Response body (error details)
   - Status code

### Server Logs
Check your terminal where `npm run dev` is running for:
```
Error fetching AI platforms: [detailed error message]
```

This will show the actual database error or Supabase error.

## If Migration Fails

If the migration script fails to run:

1. **Check for syntax errors** - Make sure you copied the entire file
2. **Check for existing tables** - Run DROP TABLE commands first if re-running
3. **Check Supabase connection** - Verify environment variables are set
4. **Run in sections** - Try running one CREATE TABLE at a time to isolate the issue

### Safe Reset (Development Only)

If you need to start fresh:

```sql
-- WARNING: Deletes all data
DROP TABLE IF EXISTS instruction_versions CASCADE;
DROP TABLE IF EXISTS instruction_documents CASCADE;
DROP TABLE IF EXISTS platform_template_compatibility CASCADE;
DROP TABLE IF EXISTS template_params CASCADE;
DROP TABLE IF EXISTS ai_platform_params CASCADE;
DROP TABLE IF EXISTS instruction_templates CASCADE;
DROP TABLE IF EXISTS ai_platforms CASCADE;
```

Then run the migration again.

## Next Steps After Fix

Once the admin page works:

1. Test creating a new AI platform
2. Test editing a platform
3. Test the AI Builder page (`/ai-builder`)
4. Test generating an instruction
5. Test the AI Instructions library (`/ai-instructions`)

## Files Modified in This Fix

1. `src/app/(app)/admin/ai-platforms/page.tsx` - Better error handling
2. `src/app/api/admin/diagnostics/route.ts` - NEW diagnostic endpoint
3. `TROUBLESHOOTING_AI_PLATFORMS.md` - NEW troubleshooting guide
4. `AI_PLATFORMS_ADMIN_FIX.md` - This file

## Summary

The admin page code is correct. The issue is almost certainly that the database tables don't exist yet because the migration hasn't been run. Follow the steps above to:

1. Run diagnostics to confirm
2. Run the migration
3. Verify it worked
4. Test the admin page

The improved error messages will now show you exactly what's wrong if there are any other issues.
