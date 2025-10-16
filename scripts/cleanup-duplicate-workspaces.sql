-- Cleanup Duplicate Workspaces
-- Use this to identify and optionally clean up duplicate workspace memberships
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Identify Users with Multiple Owner Workspaces
-- ============================================

SELECT
  user_id,
  COUNT(*) as workspace_count,
  array_agg(workspace_id ORDER BY created_at) as workspace_ids,
  array_agg(created_at ORDER BY created_at) as created_dates
FROM workspace_members
WHERE role = 'owner'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY workspace_count DESC;

-- ============================================
-- STEP 2: View Workspace Details
-- ============================================

-- Shows all workspaces with their owners and member counts
SELECT
  w.id as workspace_id,
  w.name as workspace_name,
  w.created_at,
  w.created_by,
  wm.user_id as owner_id,
  (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
  (SELECT COUNT(*) FROM prd_documents WHERE workspace_id = w.id) as prd_count
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.role = 'owner'
ORDER BY w.created_at DESC;

-- ============================================
-- STEP 3: Identify Empty/Unused Workspaces
-- ============================================

-- Shows workspaces with no PRDs that might be safe to delete
SELECT
  w.id as workspace_id,
  w.name as workspace_name,
  w.created_at,
  w.created_by,
  (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
  (SELECT COUNT(*) FROM prd_documents WHERE workspace_id = w.id) as prd_count,
  (SELECT COUNT(*) FROM subscriptions WHERE workspace_id = w.id) as subscription_count
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM prd_documents WHERE workspace_id = w.id
)
ORDER BY w.created_at DESC;

-- ============================================
-- STEP 4: (Optional) Delete Empty Duplicate Workspaces
-- ============================================

-- WARNING: Only run this after reviewing the results above!
-- This will delete workspaces that:
-- - Have no PRDs
-- - Have no subscriptions
-- - Are NOT the user's first (oldest) workspace

-- UNCOMMENT AND CUSTOMIZE THIS QUERY TO DELETE:
/*
-- First, identify which workspaces to keep (oldest for each user)
WITH first_workspaces AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    workspace_id as keep_workspace_id
  FROM workspace_members
  WHERE role = 'owner'
  ORDER BY user_id, created_at ASC
),
-- Identify workspaces to potentially delete
deletable_workspaces AS (
  SELECT
    wm.workspace_id
  FROM workspace_members wm
  WHERE
    wm.role = 'owner'
    AND wm.workspace_id NOT IN (SELECT keep_workspace_id FROM first_workspaces)
    AND NOT EXISTS (SELECT 1 FROM prd_documents WHERE workspace_id = wm.workspace_id)
    AND NOT EXISTS (SELECT 1 FROM subscriptions WHERE workspace_id = wm.workspace_id)
)
-- Show what would be deleted (REVIEW THIS FIRST!)
SELECT
  w.id,
  w.name,
  w.created_at,
  'Would be deleted' as status
FROM workspaces w
WHERE w.id IN (SELECT workspace_id FROM deletable_workspaces);

-- To actually delete, uncomment this:
-- DELETE FROM workspace_members WHERE workspace_id IN (SELECT workspace_id FROM deletable_workspaces);
-- DELETE FROM workspaces WHERE id IN (SELECT workspace_id FROM deletable_workspaces);
*/

-- ============================================
-- STEP 5: Check for Orphaned Records
-- ============================================

-- Check for workspace_members without a workspace
SELECT
  wm.id,
  wm.user_id,
  wm.workspace_id,
  wm.role,
  'Orphaned - workspace deleted' as issue
FROM workspace_members wm
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w WHERE w.id = wm.workspace_id
);

-- Check for billing_customers without workspace_members
SELECT
  bc.id,
  bc.user_id,
  bc.workspace_id,
  bc.stripe_customer_id,
  'Orphaned - workspace_member missing' as issue
FROM billing_customers bc
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.user_id = bc.user_id
  AND wm.workspace_id = bc.workspace_id
);

-- ============================================
-- STEP 6: Recommendations
-- ============================================

SELECT
  'Workspace Cleanup Recommendations' as section,
  (
    SELECT COUNT(DISTINCT user_id)
    FROM workspace_members
    WHERE role = 'owner'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) as users_with_multiple_workspaces,
  (
    SELECT COUNT(*)
    FROM workspaces
    WHERE NOT EXISTS (SELECT 1 FROM prd_documents WHERE workspace_id = workspaces.id)
  ) as empty_workspaces,
  (
    SELECT COUNT(*)
    FROM workspace_members
    WHERE NOT EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id)
  ) as orphaned_memberships;

-- ============================================
-- Additional Notes
-- ============================================

/*
IMPORTANT: Multiple workspaces per user is VALID in the app design!

The app is designed to support multi-workspace functionality where:
- Users can own multiple workspaces
- Users can be members of workspaces they don't own
- Each workspace can have its own subscription

The checkout route has been updated to handle this by:
- Selecting the FIRST (oldest) workspace when creating billing customer
- Logging when multiple workspaces are found
- Gracefully handling the multi-workspace scenario

You should ONLY delete duplicate workspaces if:
1. They were created by accident/testing
2. They have no PRDs or important data
3. You're certain they're not needed

For production, consider:
- Letting users choose which workspace to bill
- Adding workspace selector in pricing page
- Storing active_workspace_id in user metadata
*/
