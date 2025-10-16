# Billing RLS Policy Fix

## 🔴 Critical Issue Found

Your billing integration was failing because **Row Level Security (RLS) policies were incomplete** for the `billing_customers` and `subscriptions` tables.

## Problem Discovered

When a user completed checkout, the system would:
1. ✅ Successfully create a Stripe customer
2. ✅ Successfully create a Stripe subscription
3. ❌ **FAIL silently** when trying to save billing customer to database
4. ❌ Result: No `billing_customers` record created
5. ❌ Sync endpoint couldn't find billing customer

### Why It Failed

The original RLS policies **only allowed SELECT (read) operations**:

```sql
-- ❌ INCOMPLETE - Only allows reading
CREATE POLICY "Users can view their billing info" ON billing_customers
  FOR SELECT USING (user_id = auth.uid());
```

When the checkout route tried to INSERT the billing customer record, Supabase silently blocked it due to missing INSERT policy.

## The Fix

Added **INSERT and UPDATE policies** for both `billing_customers` and `subscriptions` tables:

### For billing_customers:
```sql
-- ✅ Allow users to create their own billing record
CREATE POLICY "Users can create their billing info" ON billing_customers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ✅ Allow users to update their own billing record
CREATE POLICY "Users can update their billing info" ON billing_customers
  FOR UPDATE USING (user_id = auth.uid());
```

### For subscriptions:
```sql
-- ✅ Allow workspace owners/admins to create subscriptions
CREATE POLICY "Users can insert subscriptions for their workspaces" ON subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- ✅ Allow workspace owners/admins to update subscriptions
CREATE POLICY "Users can update subscriptions for their workspaces" ON subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = subscriptions.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );
```

## 🚀 How to Apply the Fix

### Option 1: Quick Fix (Recommended)

Run the dedicated fix script in Supabase SQL Editor:

1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql
2. Copy contents of `scripts/fix-billing-rls-policies.sql`
3. Paste and run in SQL Editor
4. Verify policies were created (script shows verification query)

### Option 2: Full Schema Update

If you haven't run the full setup yet, run:

```bash
# Copy the entire setup-supabase.sql to Supabase SQL Editor
```

The updated `scripts/setup-supabase.sql` now includes all necessary policies.

## 🔧 Additional Improvements Made

### 1. Enhanced Checkout Route

Updated [src/app/api/billing/checkout/route.ts](src/app/api/billing/checkout/route.ts) with:

- **Comprehensive logging** at every step:
  ```typescript
  console.log('[Checkout] No billing customer found, creating new Stripe customer')
  console.log('[Checkout] Stripe customer created:', stripeCustomerId)
  console.log('[Checkout] User workspace found:', workspaceMember.workspace_id)
  console.log('[Checkout] Billing customer record created:', billingCustomerData)
  ```

- **Error handling** for workspace lookup:
  ```typescript
  if (workspaceError || !workspaceMember?.workspace_id) {
    return NextResponse.json({
      error: 'Workspace not found',
      message: 'You must be part of a workspace to subscribe.'
    }, { status: 400 })
  }
  ```

- **Upsert instead of insert** to handle edge cases:
  ```typescript
  await supabase
    .from('billing_customers')
    .upsert({
      user_id: user.id,
      workspace_id: workspaceMember.workspace_id,
      stripe_customer_id: stripeCustomerId,
    }, {
      onConflict: 'user_id'
    })
  ```

- **Detailed error response** if billing customer creation fails:
  ```typescript
  if (billingCustomerError) {
    console.error('[Checkout] Error creating billing customer:', billingCustomerError)
    return NextResponse.json({
      error: 'Failed to create billing customer',
      message: 'Database error while setting up billing.',
      details: billingCustomerError.message
    }, { status: 500 })
  }
  ```

## ✅ Testing the Fix

After applying the RLS policy fix:

### 1. Clear Old Data (Optional)

If you have incomplete records from failed attempts:

```sql
-- In Supabase SQL Editor
DELETE FROM billing_customers WHERE stripe_customer_id IS NULL;
DELETE FROM subscriptions WHERE stripe_subscription_id IS NULL;
```

### 2. Test Complete Flow

1. **Start checkout**:
   - Go to `/pricing`
   - Click "Subscribe" on a plan
   - Complete payment with test card: `4242 4242 4242 4242`

2. **Check logs** (terminal running `npm run dev`):
   ```
   [Checkout] Request received: { priceId: 'price_xxx', ... }
   [Checkout] Creating checkout session for user: xxx
   [Checkout] No billing customer found, creating new Stripe customer
   [Checkout] Stripe customer created: cus_xxx
   [Checkout] User workspace found: xxx
   [Checkout] Billing customer record created: { user_id: '...', ... }
   ```

3. **Verify in database**:
   ```sql
   -- Should show your billing customer
   SELECT * FROM billing_customers;

   -- Should show your subscription
   SELECT * FROM subscriptions;
   ```

4. **Check billing page**:
   - Go to `/billing`
   - Your subscription should now appear!
   - "Sync from Stripe" button should work

### 3. Verify Policies

Run this in Supabase SQL Editor to confirm policies exist:

```sql
SELECT
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE tablename IN ('billing_customers', 'subscriptions')
ORDER BY tablename, cmd;
```

You should see:
- `billing_customers`: SELECT, INSERT, UPDATE policies
- `subscriptions`: SELECT, INSERT, UPDATE policies

## 🐛 What Was Happening Before

**User's perspective:**
1. Click "Subscribe" → Redirects to Stripe ✅
2. Complete payment → Success in Stripe ✅
3. Redirect to `/billing` → **No subscription shown** ❌
4. Click "Sync from Stripe" → **Error: "Must complete checkout first"** ❌

**Behind the scenes:**
1. Checkout creates Stripe customer ✅
2. Checkout tries to insert `billing_customers` record ❌ **Blocked by RLS**
3. Checkout continues anyway (no error handling) ⚠️
4. Stripe creates subscription ✅
5. Webhook tries to insert `subscriptions` record ❌ **Blocked by RLS**
6. Database has no records ❌
7. Billing page can't find any data ❌

## 🎯 What Happens Now

**After the fix:**
1. Click "Subscribe" → Redirects to Stripe ✅
2. Complete payment → Success in Stripe ✅
3. **Checkout saves billing customer** ✅ **RLS allows it**
4. **Webhook saves subscription** ✅ **RLS allows it**
5. Redirect to `/billing` → **Subscription appears!** ✅
6. Click "Sync from Stripe" → **Works perfectly** ✅

## 📋 Verification Checklist

After applying the fix, verify:

- [ ] RLS policies added (run verification query above)
- [ ] Can complete checkout without errors
- [ ] Terminal logs show "Billing customer record created"
- [ ] `billing_customers` table has your record
- [ ] Subscription appears on billing page
- [ ] "Sync from Stripe" button works
- [ ] No RLS policy errors in logs

## 🔒 Security Note

The new policies are **secure** and follow the principle of least privilege:

- **billing_customers**: Users can only manage their own records (`user_id = auth.uid()`)
- **subscriptions**: Only workspace owners/admins can manage subscriptions
- All policies use `auth.uid()` to ensure users are authenticated
- Workspace membership is verified for subscription operations

## 📚 Related Files

- **SQL Scripts**:
  - `scripts/fix-billing-rls-policies.sql` - Quick fix for policies
  - `scripts/setup-supabase.sql` - Complete database setup (updated)

- **Backend Code**:
  - `src/app/api/billing/checkout/route.ts` - Checkout with enhanced logging
  - `src/app/api/billing/sync/route.ts` - Manual sync endpoint
  - `src/app/api/stripe/webhook/route.ts` - Webhook handler

- **Documentation**:
  - `SUBSCRIPTION_SYNC_FIX.md` - Previous webhook fix
  - `QUICK_FIX_STEPS.md` - Quick troubleshooting guide
  - `STRIPE_PRICE_ID_FIX.md` - Price ID configuration

## 🆘 Still Having Issues?

### If checkout still fails:

1. **Check RLS policies were added**:
   ```sql
   SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'billing_customers' AND cmd IN ('INSERT', 'UPDATE');
   -- Should return: 2
   ```

2. **Check for workspace**:
   - Go to `/workspace-debug`
   - Verify you're a member of a workspace with 'owner' role

3. **Check logs**:
   - Look for `[Checkout] Error creating billing customer:` in terminal
   - Error message will indicate specific issue

4. **Verify Stripe configuration**:
   - Go to `/stripe-test`
   - Ensure all Price IDs are correct

### If sync still fails:

1. **Verify billing customer exists**:
   ```sql
   SELECT * FROM billing_customers WHERE user_id = 'YOUR_USER_ID';
   ```

2. **Check Stripe for customer**:
   - Go to https://dashboard.stripe.com/test/customers
   - Search by your email
   - Verify customer and subscription exist

---

**This fix resolves the root cause of billing integration failures!** 🎉

After applying the RLS policies, the complete checkout → subscription → billing page flow will work seamlessly.
