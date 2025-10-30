# Troubleshooting AI Platforms Admin Page

## Most Likely Issue: Migration Not Run

The AI Platforms admin page will fail if the database migration hasn't been run yet.

### Check if Tables Exist

Run this SQL in your Supabase SQL Editor:

```sql
-- Check if ai_platforms table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'ai_platforms'
);

-- If it exists, check what's in it
SELECT * FROM ai_platforms;

-- Check if ai_platform_params table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'ai_platform_params'
);
```

### If Tables Don't Exist: Run the Migration

1. **Option 1: Via Supabase Dashboard**
   - Go to Supabase Dashboard → SQL Editor
   - Copy the entire contents of `supabase/migrations/20240102000000_ai_instruction_builder.sql`
   - Paste and run it

2. **Option 2: Via Supabase CLI** (if installed)
   ```bash
   supabase db push
   ```

### Common Error Messages and Solutions

#### Error: "relation 'ai_platforms' does not exist"
**Solution:** Run the migration script

#### Error: "Unauthorized" (401)
**Solution:** Make sure you're logged in and have admin access

#### Error: "Failed to fetch AI platforms" (500)
**Possible Causes:**
1. Tables don't exist - run migration
2. RLS policies too restrictive - check policies
3. Supabase connection issue - check environment variables

#### Error: "new row violates row-level security policy"
**Solution:** The RLS policies might be blocking inserts. Temporarily disable RLS:
```sql
-- ONLY FOR DEBUGGING - Re-enable after testing
ALTER TABLE ai_platforms DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_platform_params DISABLE ROW LEVEL SECURITY;
```

Then test the admin page. If it works, the issue is with the RLS policies.

### Verify RLS Policies

Check current policies:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('ai_platforms', 'ai_platform_params');
```

### Check Admin Access

The current implementation allows ANY authenticated user to manage AI platforms (marked with TODO comments). This is intentional for development. In production, you should implement proper admin role checking.

### Test API Endpoints Directly

Use curl or Postman to test:

```bash
# Get platforms (should work if logged in)
curl http://localhost:3000/api/admin/ai-platforms \
  -H "Cookie: your-session-cookie"

# If you get 401, you're not authenticated
# If you get 500, check server logs
# If you get 200 with empty array, migration ran but no data inserted
```

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to /admin/ai-platforms
4. Look for error messages

Common console errors:
- **Network error:** API endpoint doesn't exist or server is down
- **401 Unauthorized:** Not logged in
- **500 Internal Server Error:** Check server logs (see below)

### Check Server Logs

If running locally with `npm run dev`, check the terminal for error messages.

Look for:
```
Error fetching AI platforms: [detailed error]
```

This will tell you exactly what's wrong (table doesn't exist, permission denied, etc.)

### Verify Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Quick Fix: Reset and Rerun Migration

If you're in development and can reset:

```sql
-- WARNING: This deletes all AI platform data
DROP TABLE IF EXISTS instruction_versions CASCADE;
DROP TABLE IF EXISTS instruction_documents CASCADE;
DROP TABLE IF EXISTS platform_template_compatibility CASCADE;
DROP TABLE IF EXISTS template_params CASCADE;
DROP TABLE IF EXISTS ai_platform_params CASCADE;
DROP TABLE IF EXISTS instruction_templates CASCADE;
DROP TABLE IF EXISTS ai_platforms CASCADE;
```

Then run the migration again.

### After Migration Runs Successfully

You should see:
- 6 AI platforms in the table
- 9 platform parameters
- 7 instruction templates
- 30 template parameters
- Platform-template compatibility records

Verify:
```sql
SELECT COUNT(*) as platform_count FROM ai_platforms;
SELECT COUNT(*) as param_count FROM ai_platform_params;
SELECT COUNT(*) as template_count FROM instruction_templates;
SELECT COUNT(*) as template_param_count FROM template_params;
```

Expected counts:
- platforms: 6
- params: 9
- templates: 7
- template_params: 30

## Still Having Issues?

1. **Check the exact error message** in browser console and server logs
2. **Verify authentication** - are you logged in as an admin?
3. **Check Supabase logs** in the Supabase Dashboard → Logs
4. **Try the SQL queries above** to diagnose database state
5. **Check Network tab** in DevTools to see the actual API responses
