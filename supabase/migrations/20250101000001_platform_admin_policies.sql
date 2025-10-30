-- Migration: Add RLS policies for platform management
-- This allows authenticated users to perform CRUD operations on platforms and platform_params
-- In production, you should add role-based checks to ensure only admins can modify these tables

-- Enable RLS on platforms and platform_params tables
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_params ENABLE ROW LEVEL SECURITY;

-- Drop existing public read policies if they exist
DROP POLICY IF EXISTS "Anyone can view platforms" ON platforms;
DROP POLICY IF EXISTS "Anyone can view platform params" ON platform_params;

-- Public read access for platforms and platform_params (unchanged)
CREATE POLICY "Anyone can view platforms" ON platforms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view platform params" ON platform_params
  FOR SELECT USING (true);

-- Admin policies for platforms table
-- TODO: Replace auth.uid() IS NOT NULL with proper admin role check
-- Example: auth.jwt() ->> 'role' = 'admin' OR check workspace_members.role = 'admin'

CREATE POLICY "Authenticated users can create platforms" ON platforms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update platforms" ON platforms
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete platforms" ON platforms
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Admin policies for platform_params table
CREATE POLICY "Authenticated users can create platform params" ON platform_params
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update platform params" ON platform_params
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete platform params" ON platform_params
  FOR DELETE USING (auth.uid() IS NOT NULL);
