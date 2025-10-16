-- Complete RLS Fix for Billing Integration
-- This script fixes TWO critical issues:
-- 1. Missing INSERT/UPDATE policies for billing tables
-- 2. Infinite recursion in workspace_members policy
--
-- Run this in Supabase SQL Editor:
-- https://app.supabase.com/project/YOUR_PROJECT/sql

-- ============================================
-- STEP 1: Fix Infinite Recursion Issue
-- ============================================

-- Create helper function to get user's workspace IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_workspace_ids(check_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT workspace_id
  FROM workspace_members
  WHERE user_id = check_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate workspace_members policy without recursion
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;

CREATE POLICY "Users can view members of their workspaces" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT get_user_workspace_ids(auth.uid()))
  );

-- ============================================
-- STEP 2: Add Missing Billing Policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their billing info" ON billing_customers;
DROP POLICY IF EXISTS "Users can update their billing info" ON billing_customers;
DROP POLICY IF EXISTS "Users can insert subscriptions for their workspaces" ON subscriptions;
DROP POLICY IF EXISTS "Users can update subscriptions for their workspaces" ON subscriptions;

-- Add INSERT policy for billing_customers
CREATE POLICY "Users can create their billing info" ON billing_customers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add UPDATE policy for billing_customers
CREATE POLICY "Users can update their billing info" ON billing_customers
  FOR UPDATE USING (user_id = auth.uid());

-- Add INSERT policy for subscriptions
CREATE POLICY "Users can insert subscriptions for their workspaces" ON subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Add UPDATE policy for subscriptions
CREATE POLICY "Users can update subscriptions for their workspaces" ON subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- STEP 3: Verify All Policies
-- ============================================

-- Show all policies for affected tables
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename IN ('workspace_members', 'billing_customers', 'subscriptions')
ORDER BY tablename, cmd, policyname;

-- Show the helper function
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'get_user_workspace_ids';

SELECT '✅ All RLS fixes applied successfully!' AS status,
       'workspace_members recursion fixed' AS fix_1,
       'billing_customers INSERT/UPDATE policies added' AS fix_2,
       'subscriptions INSERT/UPDATE policies added' AS fix_3;
