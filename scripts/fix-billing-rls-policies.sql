-- Fix Missing RLS Policies for Billing Tables
-- Run this in Supabase SQL Editor to add missing INSERT/UPDATE policies
-- https://app.supabase.com/project/YOUR_PROJECT/sql

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

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename IN ('billing_customers', 'subscriptions')
ORDER BY tablename, policyname;

SELECT 'RLS policies added successfully! You should see INSERT and UPDATE policies for both tables above.' AS message;
