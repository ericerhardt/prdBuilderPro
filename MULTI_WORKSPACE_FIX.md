# Multi-Workspace Checkout Fix

## The Error

```
[Checkout] Error fetching workspace: {
  code: 'PGRST116',
  details: 'The result contains 2 rows',
  message: 'Cannot coerce the result to a single JSON object'
}
```

## Root Cause

The checkout route was using `.single()` which expects **exactly 1 row**, but your user is the **owner of 2 workspaces**:

```typescript
// ❌ BROKEN - Fails if user owns multiple workspaces
const { data: workspaceMember } = await supabase
  .from('workspace_members')
  .select('workspace_id')
  .eq('user_id', user.id)
  .eq('role', 'owner')
  .single()  // ← Expects 1, finds 2!
```

### Why This Happens

The app **supports multi-workspace functionality** by design:
- Users can own multiple workspaces
- Users can be members of workspaces they don't own
- Each workspace can have its own subscription

During testing or initial setup, you likely:
1. Created a workspace automatically on first login
2. Manually created another workspace via SQL
3. Or ran the setup script multiple times

Result: **2 workspace_members records with role='owner'** for your user ID.

## ✅ The Fix

Updated [src/app/api/billing/checkout/route.ts:71-107](src/app/api/billing/checkout/route.ts#L71-L107) to:

### 1. Query All Owner Workspaces
```typescript
// ✅ FIXED - Gets all workspaces, handles multiple
const { data: workspaceMembers, error: workspaceError } = await supabase
  .from('workspace_members')
  .select('workspace_id, workspace:workspaces(name)')
  .eq('user_id', user.id)
  .eq('role', 'owner')
  .order('created_at', { ascending: true })  // Oldest first
```

### 2. Handle Multiple Workspaces Gracefully
```typescript
if (!workspaceMembers || workspaceMembers.length === 0) {
  return NextResponse.json({
    error: 'Workspace not found',
    message: 'You must be part of a workspace to subscribe.'
  }, { status: 400 })
}

// Use the first workspace (oldest created)
const workspaceMember = workspaceMembers[0]
```

### 3. Log When Multiple Workspaces Found
```typescript
if (workspaceMembers.length > 1) {
  console.log(`[Checkout] User has ${workspaceMembers.length} workspaces, using first:`, {
    workspace_id: workspaceMember.workspace_id,
    workspace_name: workspaceMember.workspace?.name,
    total_workspaces: workspaceMembers.length
  })
}
```

## What This Means

### Current Behavior (After Fix)
When you have multiple workspaces:
- ✅ Checkout uses your **first (oldest) workspace**
- ✅ Billing customer is linked to that workspace
- ✅ Subscription is created for that workspace
- ✅ Checkout completes successfully
- ⚠️ Other workspaces are ignored for billing

### Terminal Output
You'll now see:
```
[Checkout] Creating checkout session for user: xxx
[Checkout] No billing customer found, creating new Stripe customer
[Checkout] Stripe customer created: cus_xxx
[Checkout] User has 2 workspaces, using first: {
  workspace_id: 'xxx-xxx-xxx',
  workspace_name: 'Your First Workspace',
  total_workspaces: 2
}
[Checkout] Billing customer record created: {...}
```

## 🧹 Clean Up Duplicate Workspaces (Optional)

If you created workspaces by accident during testing, you can clean them up.

### Option 1: Identify Duplicates

Run [scripts/cleanup-duplicate-workspaces.sql](scripts/cleanup-duplicate-workspaces.sql) in Supabase SQL Editor.

The script will show:
1. Users with multiple owner workspaces
2. Details of each workspace (PRDs, members, subscriptions)
3. Empty workspaces that might be safe to delete
4. Orphaned records

### Option 2: Manual Cleanup

If you want to delete a specific workspace:

```sql
-- 1. Find your workspaces
SELECT
  w.id,
  w.name,
  w.created_at,
  (SELECT COUNT(*) FROM prd_documents WHERE workspace_id = w.id) as prd_count
FROM workspaces w
JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE wm.user_id = 'YOUR_USER_ID'
  AND wm.role = 'owner'
ORDER BY w.created_at;

-- 2. Delete the workspace you don't want (CAREFUL!)
-- Replace WORKSPACE_ID_TO_DELETE with the actual ID
DELETE FROM workspace_members WHERE workspace_id = 'WORKSPACE_ID_TO_DELETE';
DELETE FROM workspaces WHERE id = 'WORKSPACE_ID_TO_DELETE';
```

**⚠️ WARNING**: Only delete workspaces that:
- Have no PRDs (`prd_count = 0`)
- Have no subscriptions
- Are empty/unused
- You're certain you don't need

## 🚀 Future Enhancement Ideas

For a production app with multi-workspace support, consider:

### 1. Workspace Selector in Pricing Page
Let users choose which workspace to subscribe:

```typescript
// In pricing page
const { data: workspaces } = await supabase
  .from('workspace_members')
  .select('workspace_id, workspace:workspaces(name)')
  .eq('user_id', user.id)

// Show dropdown if multiple workspaces
<select>
  {workspaces.map(w => (
    <option value={w.workspace_id}>{w.workspace.name}</option>
  ))}
</select>
```

### 2. Include workspace_id in Checkout Request
Update checkout to accept workspace_id:

```typescript
// Client sends
fetch('/api/billing/checkout', {
  body: JSON.stringify({
    priceId,
    planId,
    billingCycle,
    workspaceId  // ← Add this
  })
})

// Server validates user is owner of that workspace
```

### 3. Per-Workspace Billing
Allow each workspace to have its own subscription:
- `billing_customers` remains user-level (one Stripe customer per user)
- `subscriptions` are workspace-level (each workspace can have different plan)
- Pricing page shows which workspaces have active subscriptions

### 4. Active Workspace Context
Use the Zustand store's active workspace:

```typescript
// Get active workspace from cookie/localStorage
const activeWorkspaceId = getActiveWorkspace()

// Use active workspace if available
const workspaceMember = workspaceMembers.find(
  w => w.workspace_id === activeWorkspaceId
) || workspaceMembers[0]  // Fallback to first
```

## 🧪 Testing

After the fix, test the complete flow:

### 1. Check Your Workspaces
Go to `/workspace-debug` to see all your workspaces:
- Should show 2 workspaces
- Note which one is first (oldest `created_at`)

### 2. Test Checkout
1. Go to `/pricing`
2. Click "Subscribe" on a plan
3. Use test card: `4242 4242 4242 4242`
4. Complete payment

### 3. Verify Terminal Logs
You should see:
```
[Checkout] User has 2 workspaces, using first: {
  workspace_id: '...',
  workspace_name: '...',
  total_workspaces: 2
}
[Checkout] Billing customer record created: {...}
```

### 4. Check Database
```sql
-- Should show billing customer linked to first workspace
SELECT
  bc.user_id,
  bc.workspace_id,
  bc.stripe_customer_id,
  w.name as workspace_name
FROM billing_customers bc
JOIN workspaces w ON w.id = bc.workspace_id;

-- Should show subscription for first workspace
SELECT
  s.stripe_subscription_id,
  s.workspace_id,
  s.status,
  w.name as workspace_name
FROM subscriptions s
JOIN workspaces w ON w.id = s.workspace_id;
```

### 5. Verify Billing Page
- Go to `/billing`
- Subscription should appear
- Should show the workspace name

## 📋 Summary

| Issue | Before | After |
|-------|--------|-------|
| **Multiple workspaces** | ❌ Checkout fails with PGRST116 error | ✅ Uses first workspace |
| **Error handling** | ❌ Generic error message | ✅ Detailed logging |
| **User experience** | ❌ Checkout broken | ✅ Seamless checkout |
| **Data integrity** | ❌ No billing customer created | ✅ Properly linked to workspace |

## 🔗 Related Files

- **Fixed**: [src/app/api/billing/checkout/route.ts](src/app/api/billing/checkout/route.ts)
- **Cleanup Script**: [scripts/cleanup-duplicate-workspaces.sql](scripts/cleanup-duplicate-workspaces.sql)
- **RLS Fixes**: [scripts/fix-rls-complete.sql](scripts/fix-rls-complete.sql)

## 📚 Related Documentation

- [RLS_RECURSION_FIX.md](RLS_RECURSION_FIX.md) - Infinite recursion issue
- [BILLING_RLS_FIX.md](BILLING_RLS_FIX.md) - Missing INSERT/UPDATE policies
- [CLAUDE.md](CLAUDE.md) - Project architecture overview

---

**The checkout route now handles multiple workspaces correctly!** 🎉
