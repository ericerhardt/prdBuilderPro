# Workspace Fix Guide

## Problem Identified

The workspace initialization is failing because **the Supabase database tables don't exist or the migration hasn't been run yet**.

## Solution Steps

### Step 1: Verify Supabase Connection

1. Open your browser console (F12 → Console)
2. Navigate to `http://localhost:3000/workspace-debug`
3. Check the console logs for:
   - `[Debug] User:` - Confirms you're authenticated
   - `[Debug] Workspaces:` - Shows if workspaces query is working
   - Look for error messages about missing tables

### Step 2: Run Database Migration in Supabase

**Option A: Using Supabase Dashboard (RECOMMENDED)**

1. Go to [https://app.supabase.com/project/salfnjgkxbdxjxtuyisg/sql](https://app.supabase.com/project/salfnjgkxbdxjxtuyisg/sql)
2. Open the file `scripts/setup-supabase.sql` in this project
3. Copy ALL the SQL content
4. Paste it into the Supabase SQL Editor
5. Click "Run" to execute
6. Wait for success message

**Option B: Using Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db push
```

### Step 3: Verify Tables Were Created

1. Go to [https://app.supabase.com/project/salfnjgkxbdxjxtuyisg/editor](https://app.supabase.com/project/salfnjgkxbdxjxtuyisg/editor)
2. Check that these tables exist:
   - ✅ `workspaces`
   - ✅ `workspace_members`
   - ✅ `prd_documents`
   - ✅ `prd_versions`
   - ✅ `platforms`
   - ✅ `platform_params`
   - ✅ `billing_customers`
   - ✅ `subscriptions`
   - ✅ `stripe_events`
   - ✅ `billing_metrics_daily`

### Step 4: Check Platform Data

1. In Supabase dashboard, go to Table Editor
2. Open the `platforms` table
3. Verify it has 4 rows:
   - replit
   - bolt
   - leap
   - lovable

If empty, run this SQL:

```sql
INSERT INTO platforms (id, label, ordering, enabled) VALUES
  ('replit', 'Replit', 1, true),
  ('bolt', 'Bolt.new', 2, true),
  ('leap', 'Leap.new', 3, true),
  ('lovable', 'Lovable', 4, true)
ON CONFLICT (id) DO NOTHING;
```

### Step 5: Create Your First Workspace

**Option A: Using Debug Page**

1. Go to `http://localhost:3000/workspace-debug`
2. Click the "Create Workspace" button
3. Watch the console for success/error messages
4. Refresh the page to see your new workspace

**Option B: Using API Direct**

```bash
curl -X POST http://localhost:3000/api/workspace/create \
  -H "Content-Type: application/json" \
  -b "your-session-cookie"
```

### Step 6: Verify Workspace Is Active

1. On the debug page, you should see:
   - ✅ User Information showing your email
   - ✅ Active Workspace (Zustand Store) showing a workspace
   - ✅ Database Workspaces showing at least one workspace

2. Navigate to `/account`, `/library`, or `/billing`
3. Pages should now load correctly without "No Workspace Found" error

## Troubleshooting

### Error: "relation workspaces does not exist"

**Solution**: The database migration hasn't been run. Follow Step 2 above.

### Error: "JWT expired" or "Invalid API key"

**Solution**: Check your `.env.local` file has correct values:
```
NEXT_PUBLIC_SUPABASE_URL=https://salfnjgkxbdxjxtuyisg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### Error: "permission denied for table workspaces"

**Solution**: The RLS policies may not be set up correctly. Re-run the setup SQL script which includes all RLS policies.

### Workspace created but pages still show "No Workspace Found"

**Solutions**:
1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser localStorage and cookies
3. Sign out and sign back in
4. Go to `/workspace-debug` and click "Set Active" on a workspace

### WorkspaceInitializer not running

**Check**:
1. Open browser console
2. Look for `[WorkspaceInitializer]` logs
3. If missing, the component may not be mounting

**Solution**: The component should be in the layout. Check `src/app/(app)/layout.tsx` includes:
```tsx
<WorkspaceInitializer />
```

## Diagnostic API Endpoint

Access `http://localhost:3000/api/debug/supabase` (while logged in) to see:
- Environment variable status
- Authentication status
- Table existence checks
- User workspace count
- Detailed error messages

## Quick Commands

```bash
# Start dev server
npm run dev

# Build project
npm run build

# Check for TypeScript errors
npm run type-check
```

## Additional Resources

- **Supabase Project**: https://app.supabase.com/project/salfnjgkxbdxjxtuyisg
- **Supabase SQL Editor**: https://app.supabase.com/project/salfnjgkxbdxjxtuyisg/sql
- **Supabase Table Editor**: https://app.supabase.com/project/salfnjgkxbdxjxtuyisg/editor
- **Debug Page**: http://localhost:3000/workspace-debug

## What Changed

### Files Added:
1. `src/app/(app)/workspace-debug/page.tsx` - Debug UI for workspace management
2. `src/app/api/workspace/create/route.ts` - API endpoint to create workspaces
3. `src/app/api/debug/supabase/route.ts` - Diagnostic endpoint
4. `scripts/setup-supabase.sql` - Complete database setup script

### Files Modified:
1. `src/components/workspace-initializer.tsx` - Fixed query, added auto-creation, added logging
2. `src/app/auth/callback/route.ts` - Added workspace creation on first login
3. `src/app/(auth)/signup/page.tsx` - Removed client-side workspace creation
4. `src/app/(app)/account/page.tsx` - Created new account page
5. `src/app/(app)/actions.ts` - Added server action for logout

## Success Criteria

✅ Can log in successfully
✅ Supabase tables exist
✅ Platform data is seeded
✅ Workspace is created
✅ Workspace appears in debug page
✅ `/account` page loads
✅ `/library` page loads
✅ `/billing` page loads
✅ No "No Workspace Found" errors

## Next Steps After Fix

1. Test PRD generation in `/builder`
2. Test subscription flow in `/pricing`
3. Verify admin pages work (if you're an owner)
4. Create your first PRD document

---

**Need Help?** Check the browser console (F12) for detailed logs with `[Debug]`, `[WorkspaceInitializer]`, and `[API]` prefixes.
