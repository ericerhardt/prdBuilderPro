# Admin Access Setup Guide

This guide explains how to set up and manage application-level admin access for PRD Builder Pro.

## Overview

PRD Builder Pro now has two distinct levels of access control:

1. **Workspace Roles** (owner/admin/editor/viewer) - Controls access within a specific workspace
2. **Application Admin** - Controls access to the application-level admin dashboard at `/admin`

The admin dashboard provides access to:
- Billing analytics across all users
- User management and profiles
- All PRD documents (across workspaces)
- Platform configuration

## Security Model

### Before (Insecure)
- Any user with workspace "owner" or "admin" role could access `/admin`
- Users creating their own workspace automatically became admins
- No separation between workspace management and application administration

### After (Secure)
- Only users with `is_app_admin = true` in the `user_profiles` table can access `/admin`
- Protection at multiple layers:
  - **Middleware**: Blocks requests to `/admin/*` routes before they reach the app
  - **Layout**: Server-side check in admin layout (defense-in-depth)
  - **Navigation**: Admin link only visible to app admins

## Setup Instructions

### 1. Run the Database Migration

The migration has been created at:
```
supabase/migrations/20250130000000_add_app_admin_role.sql
```

Run it using Supabase CLI or in the Supabase SQL Editor:

```bash
# If using Supabase CLI
supabase db push

# Or copy the contents and run in Supabase Dashboard > SQL Editor
```

This will:
- Create the `user_profiles` table
- Add Row Level Security policies
- Set up a trigger to auto-create profiles for new users
- Create indexes for performance

### 2. Grant Yourself Admin Access

After running the migration, you need to grant yourself admin access.

#### Option A: Using Supabase SQL Editor

1. Go to Supabase Dashboard > SQL Editor
2. Find your user ID:
   ```sql
   SELECT id, email FROM auth.users;
   ```
3. Copy your user ID, then run:
   ```sql
   UPDATE user_profiles SET is_app_admin = true WHERE user_id = 'YOUR_USER_ID_HERE';
   ```

#### Option B: Using Supabase Dashboard

1. Go to Table Editor > `user_profiles`
2. Find your row (by user_id)
3. Edit the row and set `is_app_admin` to `true`
4. Save

### 3. Verify Access

1. Log in to your application
2. You should now see an "Admin" link in the navigation bar
3. Click it to access the admin dashboard at `/admin/billing`
4. Try logging in with a different (non-admin) account - they should NOT see the Admin link

### 4. Grant Admin Access to Others (Optional)

To grant another user admin access:

```sql
-- First, find their user_id
SELECT id, email FROM auth.users WHERE email = 'their-email@example.com';

-- Then grant admin access
UPDATE user_profiles SET is_app_admin = true WHERE user_id = 'THEIR_USER_ID';
```

To revoke admin access:

```sql
UPDATE user_profiles SET is_app_admin = false WHERE user_id = 'THEIR_USER_ID';
```

## Testing

### Test Non-Admin Access Blocked

1. Create a test user account (or use an existing non-admin account)
2. Log in as that user
3. Verify:
   - The "Admin" link is NOT visible in the navigation
   - Attempting to navigate to `/admin` directly redirects to `/builder?error=unauthorized`
   - Attempting to access any admin sub-route (e.g., `/admin/users`) also redirects

### Test Admin Access Granted

1. Log in as an admin user
2. Verify:
   - The "Admin" link IS visible in the navigation
   - Clicking it loads the admin dashboard successfully
   - All admin sub-routes are accessible

## Security Features

### Multi-Layer Protection

1. **Middleware** (`src/lib/supabase/middleware.ts`):
   - Intercepts requests to `/admin/*` before they reach the application
   - Checks authentication and `is_app_admin` status
   - Redirects unauthorized users immediately

2. **Server Layout** (`src/app/(app)/admin/layout.tsx`):
   - Server-side check using `isAppAdmin()` helper
   - Defense-in-depth: catches any edge cases that bypass middleware
   - No client-side state can be manipulated

3. **Navigation** (`src/app/(app)/layout.tsx`):
   - Conditionally renders "Admin" link only for app admins
   - Prevents unauthorized users from even knowing the admin section exists

### Row-Level Security

The `user_profiles` table has RLS policies:
- Users can view their own profile
- Only app admins can update profiles (to grant/revoke admin access)
- No user can self-promote to admin

### Automatic Profile Creation

A database trigger automatically creates a `user_profiles` record for new users with:
- `is_app_admin = false` (default)
- Users must be explicitly promoted by existing admins

## Architecture

### Helper Functions

Located in `src/lib/auth/admin.ts`:

- **`isAppAdmin()`** - Server-side check (use in Server Components, API Routes)
- **`getCurrentUserAdminStatus()`** - Returns user info + admin status
- **`isAppAdminClient()`** - Client-side check (use in Client Components)

### Usage Examples

#### In Server Components
```typescript
import { isAppAdmin } from '@/lib/auth/admin'

export default async function MyPage() {
  const isAdmin = await isAppAdmin()

  if (!isAdmin) {
    redirect('/builder')
  }

  // Admin-only content
}
```

#### In API Routes
```typescript
import { isAppAdmin } from '@/lib/auth/admin'

export async function POST(request: Request) {
  const isAdmin = await isAppAdmin()

  if (!isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Admin-only logic
}
```

#### In Client Components
```typescript
'use client'
import { isAppAdminClient } from '@/lib/auth/admin'

export default function MyComponent() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    isAppAdminClient().then(setIsAdmin)
  }, [])

  if (!isAdmin) return null

  return <AdminControls />
}
```

## Troubleshooting

### Migration Fails

- Ensure you're connected to the correct Supabase project
- Check that the `update_updated_at_column()` function exists (it should be in the initial schema)
- Verify no table name conflicts

### Can't Access Admin After Granting Access

1. Check that the update succeeded:
   ```sql
   SELECT user_id, is_app_admin FROM user_profiles WHERE user_id = 'YOUR_USER_ID';
   ```
2. Clear browser cookies and log in again (to refresh the session)
3. Check browser console for errors

### Admin Link Not Showing

- Clear browser cache
- Verify you're logged in as the correct user
- Check the user_id matches between `auth.users` and `user_profiles`

### Users Can Still Access Admin

- Ensure the middleware update was deployed
- Check that `user_profiles` table exists in the database
- Verify RLS is enabled on `user_profiles`

## Migration Path for Existing Deployments

If you already have users in production:

1. Run the migration (creates profiles for new users automatically)
2. Backfill existing users:
   ```sql
   INSERT INTO user_profiles (user_id, is_app_admin)
   SELECT id, false FROM auth.users
   ON CONFLICT (user_id) DO NOTHING;
   ```
3. Grant yourself admin access (see step 2 above)
4. Deploy the code changes
5. Test thoroughly before announcing

## Future Enhancements

Potential future improvements:
- Admin user management UI to grant/revoke access
- Audit log of admin actions
- Role-based permissions within admin (e.g., billing admin vs. platform admin)
- Multi-factor authentication requirement for admin access
