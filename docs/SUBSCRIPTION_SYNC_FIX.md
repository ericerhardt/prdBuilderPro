# Subscription Sync Fix

## Problem
After completing checkout successfully, the subscription wasn't appearing on the billing page.

## Root Cause
The webhook handler was using `.insert()` instead of `.upsert()`, which would fail if a subscription record already existed.

## Fixes Applied

### 1. Fixed Webhook Handler (`/api/stripe/webhook`)
- Changed `.insert()` to `.upsert()` for subscriptions
- Added comprehensive logging throughout
- Added error handling and logging for database operations
- Now properly handles duplicate subscription records

### 2. Created Manual Sync Endpoint (`/api/billing/sync`)
- New `POST /api/billing/sync` endpoint
- Fetches subscriptions directly from Stripe
- Syncs them to your database
- Use this as a fallback if webhooks fail

### 3. Enhanced Billing Page
- Added "Sync from Stripe" button
- Added detailed console logging
- Better error messages
- Shows helpful hint text

## How to Use

### Option 1: Automatic Sync (via Webhooks)

**For Production:**
1. Configure webhook endpoint in Stripe Dashboard
2. Add webhook secret to environment variables
3. Subscriptions sync automatically

**For Local Development:**
```bash
# Terminal 1: Run your app
npm run dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook secret (whsec_...) to .env.local
```

### Option 2: Manual Sync (Immediate Fix)

If you just completed a payment and don't see your subscription:

1. Go to `/billing` page
2. Click "Sync from Stripe" button
3. Your subscription will be pulled from Stripe and saved to database
4. Page will refresh automatically

### Option 3: API Call

```bash
curl -X POST http://localhost:3000/api/billing/sync \
  -H "Cookie: your-session-cookie"
```

## Testing the Fix

### Test Complete Flow:

1. **Start Fresh** (optional - clean test):
   ```sql
   -- In Supabase SQL Editor
   DELETE FROM subscriptions;
   DELETE FROM billing_customers;
   ```

2. **Complete Checkout**:
   - Go to `/pricing`
   - Subscribe to Pro plan
   - Use test card: `4242 4242 4242 4242`
   - Complete payment

3. **Check Stripe**:
   - Go to https://dashboard.stripe.com/test/subscriptions
   - Verify subscription was created

4. **Sync to App**:
   - Go to `/billing`
   - Click "Sync from Stripe"
   - Subscription should appear!

### Check Logs:

**Browser Console:**
```
[Billing] Fetching subscription for workspace: ...
[Billing] Subscription query result: ...
[Billing] Syncing subscription from Stripe
[Billing] Sync result: ...
```

**Server Logs (Terminal):**
```
[Sync] Billing sync requested
[Sync] User authenticated: ...
[Sync] Found billing customer: ...
[Sync] Found X subscriptions in Stripe
[Sync] Syncing subscription: sub_xxx status: active
[Sync] Successfully synced: sub_xxx
```

## Webhook Events

The webhook handler now properly processes:

- ✅ `checkout.session.completed` - Creates customer & subscription
- ✅ `customer.subscription.created` - Records new subscription
- ✅ `customer.subscription.updated` - Updates subscription
- ✅ `customer.subscription.deleted` - Marks as canceled
- ✅ `invoice.payment_succeeded` - Updates to active
- ✅ `invoice.payment_failed` - Marks as past_due

## Database Check

Verify subscription in Supabase:

```sql
-- Check subscriptions
SELECT * FROM subscriptions;

-- Check billing customers
SELECT * FROM billing_customers;

-- Check stripe events (webhook logs)
SELECT type, received_at
FROM stripe_events
ORDER BY received_at DESC
LIMIT 10;
```

## Troubleshooting

### Subscription still not appearing after sync

1. **Check workspace ID**:
   - Go to `/workspace-debug`
   - Verify you have an active workspace
   - Note the workspace ID

2. **Check Stripe Dashboard**:
   - Go to https://dashboard.stripe.com/test/subscriptions
   - Find your subscription
   - Note the customer ID

3. **Check database manually**:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM billing_customers WHERE stripe_customer_id = 'cus_xxxxx';
   SELECT * FROM subscriptions WHERE workspace_id = 'workspace-id-here';
   ```

### Sync button says "No billing customer found"

This means you haven't completed a checkout yet. The billing customer record is created during checkout.

**Solution**: Complete a checkout first, then sync.

### Webhook errors

Check that:
1. ✅ Stripe CLI is running (`stripe listen`)
2. ✅ Webhook secret is correct in `.env.local`
3. ✅ Dev server was restarted after updating secret
4. ✅ Check Stripe Dashboard → Webhooks for delivery status

## Success Criteria

✅ Checkout completes successfully
✅ Subscription visible in Stripe Dashboard
✅ Clicking "Sync from Stripe" shows success toast
✅ Subscription appears on billing page
✅ Status badge shows "Active"
✅ Can access Stripe Customer Portal

## Future Improvements

Consider adding:
- Automatic retry for failed webhook deliveries
- Background job to periodically sync subscriptions
- Email notifications for subscription changes
- Admin dashboard to view all subscriptions
- Subscription analytics and reporting

---

**Quick Fix**: If subscription isn't showing, just click "Sync from Stripe" on the billing page!
