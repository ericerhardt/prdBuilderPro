# Platform Management System

## Overview

The Platform Management System allows administrators to add, edit, and manage platforms and their parameters through a user-friendly UI, without requiring backend or database knowledge.

## Features

### Platform Management
- **Add New Platforms**: Create new platforms (e.g., Vercel, Netlify, Cloudflare Pages)
- **Edit Platforms**: Update platform name, ordering, and enabled status
- **Delete Platforms**: Remove platforms (only if no PRD documents exist)
- **Enable/Disable**: Toggle platform availability without deletion

### Parameter Management
- **Dynamic Parameters**: Add custom parameters for each platform
- **Multiple Input Types**:
  - Text (single line)
  - Textarea (multi-line)
  - Select (dropdown)
  - Multi-Select (checkboxes)
  - Boolean (toggle switch)
- **Parameter Configuration**:
  - Required/Optional flags
  - Advanced settings (hidden in accordion)
  - Help text for user guidance
  - Options for select/multiselect types

## How to Use

### Accessing the Admin Panel

1. Navigate to `/admin/platforms` in your application
2. You must be authenticated to access this page

### Adding a New Platform

1. Click the **"Add Platform"** button in the top-right corner
2. Fill in the platform details:
   - **Platform ID**: Unique identifier (lowercase, numbers, hyphens, underscores)
     - Example: `vercel`, `netlify`, `cloudflare-pages`
     - Cannot be changed after creation
   - **Platform Label**: Display name shown to users
     - Example: `Vercel`, `Netlify`, `Cloudflare Pages`
   - **Ordering**: Display order (lower numbers appear first)
   - **Enabled**: Toggle to enable/disable the platform
3. Click **"Create Platform"**

### Adding Parameters to a Platform

1. Find the platform card and expand the **"Parameters"** accordion
2. Click **"Add Parameter"**
3. Configure the parameter:
   - **Parameter Key**: Used in code/API (lowercase, numbers, underscores)
     - Example: `backend`, `framework`, `deployment_target`
   - **Label**: Display name for users
     - Example: `Backend Framework`, `Target Environment`
   - **Input Type**: Choose from:
     - **Text**: Single-line text input
     - **Textarea**: Multi-line text input
     - **Select**: Dropdown with predefined options
     - **Multi-Select**: Multiple checkbox options
     - **Boolean**: Toggle switch
   - **Options**: (for Select/Multi-Select only)
     - Add options one at a time
     - Press Enter or click "+" to add
     - Click "X" to remove an option
   - **Help Text**: Optional guidance for users
   - **Required**: Mark if the field must be filled
   - **Advanced**: Hide in "Advanced Settings" accordion
4. Click **"Create Parameter"**

### Editing Platforms and Parameters

1. Click the **"Edit Platform"** button on any platform card
2. Or click **"Edit"** on any parameter within the Parameters accordion
3. Modify the fields as needed
4. Click **"Update"** to save changes

**Note**: Platform IDs and Parameter Keys cannot be changed after creation

### Deleting Platforms and Parameters

1. Click **"Delete"** on the platform or parameter you want to remove
2. Confirm the deletion in the dialog
3. Platform deletion will fail if any PRD documents use that platform
4. Deleting a platform also deletes all its parameters

### Enabling/Disabling Platforms

Use the toggle switch in the platform card header to quickly enable or disable a platform without deleting it. Disabled platforms won't appear in the platform selector.

## Examples

### Example 1: Adding Vercel Platform

**Platform Details:**
- Platform ID: `vercel`
- Label: `Vercel`
- Ordering: `5`
- Enabled: ✓

**Parameters:**

1. **Framework**
   - Key: `framework`
   - Type: Select
   - Options: `Next.js`, `Remix`, `SvelteKit`, `Nuxt`
   - Required: Yes
   - Advanced: No

2. **Deployment Configuration**
   - Key: `deployment_config`
   - Type: Textarea
   - Help: `Environment variables and build settings`
   - Required: No
   - Advanced: Yes

3. **Enable Analytics**
   - Key: `enable_analytics`
   - Type: Boolean
   - Help: `Include Vercel Analytics in the PRD`
   - Required: No
   - Advanced: No

### Example 2: Adding Netlify Platform

**Platform Details:**
- Platform ID: `netlify`
- Label: `Netlify`
- Ordering: `6`
- Enabled: ✓

**Parameters:**

1. **Build Command**
   - Key: `build_command`
   - Type: Text
   - Help: `Custom build command (default: npm run build)`
   - Required: No
   - Advanced: No

2. **Functions Runtime**
   - Key: `functions_runtime`
   - Type: Select
   - Options: `Node.js 18`, `Node.js 20`, `Go`, `Rust`
   - Required: No
   - Advanced: Yes

3. **Features**
   - Key: `features`
   - Type: Multi-Select
   - Options: `Edge Functions`, `Forms`, `Identity`, `Large Media`
   - Required: No
   - Advanced: No

## API Routes

The following API routes power the platform management system:

### Platforms

- `GET /api/admin/platforms` - List all platforms with params
- `POST /api/admin/platforms` - Create new platform
- `PATCH /api/admin/platforms?id={id}` - Update platform
- `DELETE /api/admin/platforms?id={id}` - Delete platform

### Platform Parameters

- `GET /api/admin/platforms/params?platform_id={id}` - List parameters for a platform
- `POST /api/admin/platforms/params` - Create new parameter
- `PATCH /api/admin/platforms/params?id={id}` - Update parameter
- `DELETE /api/admin/platforms/params?id={id}` - Delete parameter

## Database Schema

### Tables

**platforms**
- `id` (TEXT, PRIMARY KEY): Platform identifier
- `label` (TEXT): Display name
- `ordering` (INT): Display order
- `enabled` (BOOLEAN): Platform availability

**platform_params**
- `id` (BIGSERIAL, PRIMARY KEY): Parameter ID
- `platform_id` (TEXT, FOREIGN KEY): Parent platform
- `key` (TEXT): Parameter identifier
- `label` (TEXT): Display name
- `type` (TEXT): Input type (text, textarea, select, multiselect, boolean)
- `help` (TEXT): Help text for users
- `options` (JSONB): Options for select/multiselect types
- `required` (BOOLEAN): Whether field is required
- `advanced` (BOOLEAN): Whether to hide in advanced section

### Row-Level Security (RLS)

The database migration `20250101000001_platform_admin_policies.sql` includes:

- Public read access for all platforms and parameters
- Authenticated users can create, update, and delete platforms
- Authenticated users can create, update, and delete parameters

**TODO**: In production, replace `auth.uid() IS NOT NULL` with proper admin role checks.

## Security Considerations

### Current Implementation

The current implementation allows ANY authenticated user to manage platforms. This is intentional for the initial release but should be secured in production.

### Recommended Production Security

1. **Add Admin Role Check**: Update RLS policies to check for admin role:
   ```sql
   -- Example policy with role check
   CREATE POLICY "Admins can create platforms" ON platforms
     FOR INSERT WITH CHECK (
       auth.jwt() ->> 'role' = 'admin'
     );
   ```

2. **Workspace-Based Permissions**: Check if user is admin in their workspace:
   ```sql
   CREATE POLICY "Workspace admins can create platforms" ON platforms
     FOR INSERT WITH CHECK (
       EXISTS (
         SELECT 1 FROM workspace_members
         WHERE workspace_members.user_id = auth.uid()
         AND workspace_members.role IN ('owner', 'admin')
       )
     );
   ```

3. **API Route Authorization**: Add role checks in API routes:
   ```typescript
   // Check if user is admin
   const { data: member } = await supabase
     .from('workspace_members')
     .select('role')
     .eq('user_id', user.id)
     .single()

   if (!member || !['owner', 'admin'].includes(member.role)) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
   }
   ```

## Troubleshooting

### Platform Not Appearing in Builder

- Check if platform is enabled (toggle in admin panel)
- Verify platform ordering is correct
- Clear browser cache and reload

### Cannot Delete Platform

- Ensure no PRD documents exist for this platform
- Check the error message for specific details
- Consider disabling instead of deleting

### Parameter Not Showing in Form

- Verify parameter is saved correctly
- Check if parameter is marked as "advanced" (hidden in accordion)
- Ensure platform is selected in builder

### Options Not Saving for Select Types

- Ensure options are entered in the correct format
- Each option must be added individually
- Verify options array is not empty before saving

## Future Enhancements

Potential improvements for the platform management system:

1. **Drag-and-Drop Reordering**: Reorder platforms and parameters visually
2. **Bulk Operations**: Import/export platforms via JSON
3. **Parameter Templates**: Create reusable parameter sets
4. **Version History**: Track changes to platform configurations
5. **Platform Icons**: Add custom icons for each platform
6. **Parameter Dependencies**: Show/hide parameters based on other values
7. **Validation Rules**: Add custom validation for parameters
8. **Platform Categories**: Group platforms by type (hosting, serverless, etc.)
9. **Default Values**: Set default values for parameters
10. **Parameter Ordering**: Control the order of parameters in the form

## Migration Instructions

### Running the Database Migration

If you're adding this feature to an existing installation:

1. Apply the migration to Supabase:
   ```bash
   # Using Supabase CLI
   supabase db push

   # Or manually in Supabase SQL Editor
   # Copy contents of supabase/migrations/20250101000001_platform_admin_policies.sql
   # Paste and execute in SQL Editor
   ```

2. Verify RLS policies are active:
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('platforms', 'platform_params');
   ```

### Existing Data

The migration is backward compatible with existing platforms and parameters. All existing data will remain intact.

## Support

For issues or questions:
1. Check this documentation first
2. Review the code in `src/app/(app)/admin/platforms/page.tsx`
3. Check API routes in `src/app/api/admin/platforms/`
4. Inspect browser console for client-side errors
5. Check server logs for API errors
