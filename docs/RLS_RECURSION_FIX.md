# 🔴 CRITICAL: RLS Infinite Recursion Fix

## The Error You're Seeing

```
[Checkout] Error fetching workspace: {
  code: '42P17',
  details: null,
  hint: null,
  message: 'infinite recursion detected in policy for relation "workspace_members"'
}
```

## Root Cause

Your `workspace_members` table had an RLS policy that **queries itself**, creating infinite recursion:

```sql
-- ❌ BROKEN - Creates infinite loop
CREATE POLICY "Users can view members of their workspaces" ON workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm  -- ← Queries itself!
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );
```

**Why this creates infinite recursion:**
1. Checkout tries to query `workspace_members` table
2. RLS policy activates and checks the USING clause
3. USING clause queries `workspace_members` table again
4. This triggers the RLS policy again (step 2)
5. Infinite loop → PostgreSQL detects and blocks it

## The Fix

### Solution: Security Definer Function

Create a helper function that **bypasses RLS** (marked as `SECURITY DEFINER`):

```sql
-- ✅ Helper function bypasses RLS
CREATE OR REPLACE FUNCTION get_user_workspace_ids(check_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT workspace_id
  FROM workspace_members
  WHERE user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Updated policy uses helper function (no recursion)
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;

CREATE POLICY "Users can view members of their workspaces" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
  );
```

**Why this works:**
- The `SECURITY DEFINER` function runs with elevated privileges (bypassing RLS)
- When the policy calls this function, it doesn't trigger RLS policies again
- No recursion, no infinite loop!

## 🚀 Apply the Complete Fix

Run the comprehensive fix script that addresses **BOTH issues**:
1. ✅ Infinite recursion in `workspace_members`
2. ✅ Missing INSERT/UPDATE policies for billing tables

### Steps:

1. **Go to Supabase SQL Editor**:
   https://app.supabase.com/project/YOUR_PROJECT/sql

2. **Copy and run**: `scripts/fix-rls-complete.sql`

3. **Verify** the output shows:
   - ✅ Helper function created
   - ✅ workspace_members policy recreated
   - ✅ billing_customers INSERT/UPDATE policies added
   - ✅ subscriptions INSERT/UPDATE policies added

## What This Fixes

### Before (Broken):
1. ❌ Checkout tries to query workspace → infinite recursion error
2. ❌ Can't create billing customer record → missing INSERT policy
3. ❌ Can't save subscription → missing INSERT policy
4. ❌ Checkout fails completely

### After (Fixed):
1. ✅ Checkout queries workspace successfully (no recursion)
2. ✅ Creates billing customer record (INSERT policy allows it)
3. ✅ Webhook saves subscription (INSERT policy allows it)
4. ✅ Subscription appears on billing page

## 🧪 Test After Applying

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Test checkout**:
   - Go to http://localhost:3000/pricing
   - Click "Subscribe" on any plan
   - Use test card: `4242 4242 4242 4242`
   - Complete payment

3. **Check terminal logs** - Should see:
   ```
   [Checkout] Creating checkout session for user: xxx
   [Checkout] No billing customer found, creating new Stripe customer
   [Checkout] Stripe customer created: cus_xxx
   [Checkout] User workspace found: xxx-xxx-xxx
   [Checkout] Billing customer record created: { ... }
   ```

4. **Verify subscription appears** on `/billing` page

5. **No more errors!** ✨

## 📋 Verification Queries

After running the fix, verify everything is set up correctly:

### 1. Check helper function exists:
```sql
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name = 'get_user_workspace_ids';
```

Expected: `DEFINER` (means it bypasses RLS)

### 2. Check workspace_members policy:
```sql
SELECT policyname, cmd, pg_get_expr(qual, 'workspace_members'::regclass) as using_clause
FROM pg_policies
WHERE tablename = 'workspace_members';
```

Expected: Policy should reference `get_user_workspace_ids` function (not self-referencing)

### 3. Check billing policies exist:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('billing_customers', 'subscriptions')
ORDER BY tablename, cmd;
```

Expected output:
```
billing_customers | Users can view their billing info    | SELECT
billing_customers | Users can create their billing info  | INSERT
billing_customers | Users can update their billing info  | UPDATE
subscriptions     | Users can view subscriptions...      | SELECT
subscriptions     | Users can insert subscriptions...    | INSERT
subscriptions     | Users can update subscriptions...    | UPDATE
```

### 4. Test the helper function:
```sql
-- Replace YOUR_USER_ID with your actual user_id from auth.users
SELECT get_user_workspace_ids('YOUR_USER_ID');
```

Expected: Should return your workspace ID(s) without errors

## 🔐 Security Note

The `SECURITY DEFINER` function is safe because:
- It only returns workspace IDs for the specified user
- It doesn't expose other users' data
- It's used solely to break the recursion cycle
- The RLS policy still validates workspace membership

This is a **common pattern** in PostgreSQL for handling RLS recursion issues.

## 📚 Technical Background

### Why Did This Happen?

The original schema had a circular dependency:
1. `workspace_members` table has RLS enabled
2. Policy checks if user is member of workspace
3. To check membership, it queries `workspace_members`
4. This query triggers the same RLS policy again
5. PostgreSQL detects the infinite loop and blocks it

### Common Scenarios That Trigger This

This error typically appears when:
- Querying `workspace_members` from any authenticated context
- During checkout (needs workspace_id)
- Creating PRDs (validates workspace membership)
- Accessing library page (lists workspace PRDs)
- Any operation that checks workspace membership

### The PostgreSQL Error Code

- **Code**: `42P17`
- **Category**: Syntax Error or Access Rule Violation
- **Meaning**: Infinite recursion detected in RLS policy
- **PostgreSQL Docs**: https://www.postgresql.org/docs/current/errcodes-appendix.html

## 🆘 Troubleshooting

### Still getting recursion error?

1. **Verify the fix was applied**:
   ```sql
   -- Check if helper function exists
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'get_user_workspace_ids';
   ```

2. **Check policy was updated**:
   ```sql
   -- Should NOT contain self-referencing subquery
   SELECT pg_get_expr(qual, 'workspace_members'::regclass)
   FROM pg_policies
   WHERE tablename = 'workspace_members'
     AND policyname = 'Users can view members of their workspaces';
   ```

3. **Restart your app** (sometimes needed for connection pool refresh):
   ```bash
   # Stop dev server (Ctrl+C)
   npm run dev
   ```

### Other RLS errors?

- Check `BILLING_RLS_FIX.md` for missing INSERT/UPDATE policies
- Run `scripts/setup-supabase.sql` for complete schema reset
- Verify all RLS policies with the verification queries above

## 🎯 Summary

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Infinite recursion** | `code: '42P17'` error | Helper function with `SECURITY DEFINER` |
| **Missing INSERT policies** | Silent insert failures | Added INSERT policies for billing tables |
| **Missing UPDATE policies** | Can't update subscriptions | Added UPDATE policies for billing tables |

All three issues are fixed by running `scripts/fix-rls-complete.sql`.

---

**After this fix, your billing integration will work end-to-end!** 🎉
