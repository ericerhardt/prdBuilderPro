# Admin Security - Quick Start

## What Changed

The admin section (`/admin`) has been secured to only allow **application owners** (you) to access it, not regular workspace admins.

## Deployment Checklist

### 1. Apply Database Migration

Run this in Supabase SQL Editor:

```bash
# Navigate to: Supabase Dashboard > SQL Editor > New Query
# Copy and paste the contents of: supabase/migrations/20250130000000_add_app_admin_role.sql
# Click "Run"
```

### 2. Grant Yourself Admin Access

In Supabase SQL Editor, run:

```sql
-- Find your user ID
SELECT id, email FROM auth.users;

-- Copy your ID and run (replace YOUR_USER_ID):
UPDATE user_profiles SET is_app_admin = true WHERE user_id = 'YOUR_USER_ID';
```

### 3. Deploy Code Changes

```bash
# If using Vercel CLI
vercel --prod

# Or push to main branch for auto-deploy
git add .
git commit -m "Secure admin access to app owners only"
git push
```

### 4. Test It Works

**As Admin (you):**
- Log in → see "Admin" link in nav
- Click "Admin" → see dashboard
- All admin pages work

**As Regular User:**
- Log in → NO "Admin" link visible
- Navigate to `/admin` → redirected to `/builder?error=unauthorized`

## Protection Layers

1. **Middleware** - Blocks `/admin/*` requests at the edge
2. **Layout** - Server-side check (defense-in-depth)
3. **Navigation** - Admin link only shown to app admins

## Give Admin Access to Others

```sql
-- Find their user ID
SELECT id, email FROM auth.users WHERE email = 'their-email@example.com';

-- Grant access
UPDATE user_profiles SET is_app_admin = true WHERE user_id = 'THEIR_USER_ID';
```

## Revoke Admin Access

```sql
UPDATE user_profiles SET is_app_admin = false WHERE user_id = 'THEIR_USER_ID';
```

## Files Modified

- **New Migration**: `supabase/migrations/20250130000000_add_app_admin_role.sql`
- **New Helper**: `src/lib/auth/admin.ts`
- **Updated**: `src/lib/supabase/middleware.ts` (admin route protection)
- **Updated**: `src/app/(app)/admin/layout.tsx` (server-side check)
- **Updated**: `src/app/(app)/layout.tsx` (conditional admin link)

## Troubleshooting

**Admin link not showing after granting access:**
- Log out and log back in
- Clear browser cookies
- Verify with: `SELECT * FROM user_profiles WHERE user_id = 'YOUR_ID';`

**Non-admins can still access:**
- Check migration ran successfully
- Verify middleware changes deployed
- Clear CDN cache if using one

## Full Documentation

See `docs/admin-setup.md` for complete details.
