# Stripe Testing Guide

## Overview

PRD Builder Pro is configured for Stripe test mode. This guide will help you verify all billing and payment functionalities are working correctly.

## ✅ Current Implementation Status

### Implemented Features
- ✅ **Pricing Page** (`/pricing`) - Three-tier pricing (Free, Pro, Business)
- ✅ **Stripe Checkout Integration** - Secure payment flow
- ✅ **Billing Page** (`/billing`) - Subscription management
- ✅ **Customer Portal** - Self-service billing management
- ✅ **Webhook Handler** - Processes Stripe events
- ✅ **Account Page** (`/account`) - User profile and workspace info
- ✅ **Test Mode Dashboard** (`/stripe-test`) - Stripe verification and testing tools

### Webhook Events Handled
- `checkout.session.completed` - Creates billing customer and subscription
- `customer.subscription.created` - Records new subscription
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Marks subscription as canceled
- `invoice.payment_succeeded` - Updates subscription to active
- `invoice.payment_failed` - Updates subscription to past_due

## 🔧 Configuration

### Environment Variables Required

```bash
# Stripe Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from your Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID=price_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### ✅ Your Current Configuration

Based on `.env.local`:
- ✅ Stripe Test Mode Active (`pk_test_...`)
- ✅ All Price IDs Configured
- ✅ Webhook Secret Set
- ✅ Supabase Connected

## 🧪 Testing Procedures

### Test 1: Basic Checkout Flow

**Steps:**
1. Navigate to `/pricing`
2. Toggle between Monthly/Yearly billing
3. Click "Subscribe" on Pro plan
4. You'll be redirected to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
6. Complete payment
7. Should redirect to `/billing?success=true`
8. Verify subscription appears on billing page

**Expected Result:**
- ✅ Checkout page loads
- ✅ Payment completes without errors
- ✅ Redirected to billing page
- ✅ Subscription shows "Active" status
- ✅ Correct plan and pricing displayed

### Test 2: Billing Portal

**Steps:**
1. Navigate to `/billing`
2. Click "Manage Subscription" button
3. Verify Stripe Customer Portal opens
4. Test portal features:
   - Update payment method
   - View invoice history
   - Cancel subscription
   - Reactivate subscription

**Expected Result:**
- ✅ Portal opens in new window
- ✅ All features accessible
- ✅ Changes reflect in app within 1 minute

### Test 3: Failed Payment

**Steps:**
1. Go to `/pricing`
2. Click "Subscribe" on any plan
3. Use declined card: `4000 0000 0000 0002`
4. Try to complete payment

**Expected Result:**
- ✅ Payment is declined
- ✅ Error message shown
- ✅ No subscription created
- ✅ Can retry with valid card

### Test 4: 3D Secure Authentication

**Steps:**
1. Go to `/pricing`
2. Click "Subscribe"
3. Use 3DS card: `4000 0027 6000 3184`
4. Complete 3D Secure challenge

**Expected Result:**
- ✅ 3DS modal appears
- ✅ Can complete authentication
- ✅ Payment succeeds after auth
- ✅ Subscription created

### Test 5: Subscription Lifecycle

**Steps:**
1. Create subscription (Test 1)
2. Go to billing portal
3. Cancel subscription
4. Verify canceled status in app
5. Reactivate via portal
6. Verify active status in app

**Expected Result:**
- ✅ Status updates immediately
- ✅ Database reflects changes
- ✅ Access remains until period end

### Test 6: Account Page

**Steps:**
1. Navigate to `/account`
2. Verify user information displayed
3. Check workspace memberships shown
4. Test sign out functionality

**Expected Result:**
- ✅ User email displayed
- ✅ Workspace(s) listed with roles
- ✅ Sign out works correctly

## 🎴 Stripe Test Cards

### Successful Payments
```
4242 4242 4242 4242  // Visa - Always succeeds
5555 5555 5555 4444  // Mastercard - Always succeeds
```

### 3D Secure Authentication
```
4000 0027 6000 3184  // Requires authentication
4000 0025 0000 3155  // Requires authentication
```

### Declined Payments
```
4000 0000 0000 0002  // Generic decline
4000 0000 0000 9995  // Insufficient funds
4000 0000 0000 9987  // Lost card
4000 0000 0000 9979  // Stolen card
```

### More test cards: https://stripe.com/docs/testing

## 🔌 Webhook Testing (Local Development)

### Setup Stripe CLI

```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Windows (via Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Login
stripe login
```

### Forward Webhooks to Local

```bash
# Start webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook

# You'll see output like:
# > Ready! Your webhook signing secret is whsec_xxxxx...
```

### Update Environment Variable

Add the webhook signing secret to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
```

### Test Webhook Events

```bash
# Trigger a test event
stripe trigger checkout.session.completed

# Trigger payment success
stripe trigger invoice.payment_succeeded

# Trigger payment failure
stripe trigger invoice.payment_failed
```

### Verify Webhook Logs

1. Check application logs for webhook processing
2. Check Supabase `stripe_events` table for logged events
3. Check Stripe Dashboard → Webhooks for event delivery status

## 📊 Database Verification

### Check Subscription in Supabase

```sql
-- View all subscriptions
SELECT * FROM subscriptions;

-- View billing customers
SELECT * FROM billing_customers;

-- View stripe events
SELECT * FROM stripe_events ORDER BY received_at DESC LIMIT 10;
```

## 🚨 Troubleshooting

### Issue: "No Price ID" error

**Solution:**
1. Go to Stripe Dashboard → Products
2. Create products for Pro and Business plans
3. Create prices (monthly and yearly) for each
4. Copy price IDs to `.env.local`
5. Restart dev server

### Issue: Webhook not receiving events

**Solution:**
1. Verify Stripe CLI is running
2. Check webhook secret in `.env.local`
3. Verify `/api/stripe/webhook` endpoint is accessible
4. Check firewall/antivirus not blocking

### Issue: Subscription not appearing after payment

**Solution:**
1. Check browser console for errors
2. Verify webhook was received (Stripe Dashboard)
3. Check `stripe_events` table in Supabase
4. Verify workspace exists for user
5. Hard refresh billing page (Ctrl+Shift+R)

### Issue: "Unauthorized" error during checkout

**Solution:**
1. Verify user is logged in
2. Check workspace exists for user
3. Go to `/workspace-debug` to verify/create workspace

## 📋 Pre-Production Checklist

Before going live with real payments:

- [ ] Replace all test keys with live keys
- [ ] Update Price IDs to live mode prices
- [ ] Configure live mode webhook endpoint in Stripe Dashboard
- [ ] Update `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Test with real payment methods (small amounts)
- [ ] Verify webhook endpoint is publicly accessible
- [ ] Set up monitoring and alerts
- [ ] Review Stripe Dashboard settings
- [ ] Configure tax settings if applicable
- [ ] Set up email notifications for failed payments
- [ ] Test customer portal in live mode
- [ ] Verify refund/cancellation flow

## 📈 Monitoring & Analytics

### Key Metrics to Track

1. **Subscription Metrics** (via `/admin/billing`)
   - Active subscribers
   - MRR (Monthly Recurring Revenue)
   - Churn rate
   - New subscriptions
   - Cancellations

2. **Payment Metrics** (via Stripe Dashboard)
   - Successful payments
   - Failed payments
   - Declined rate
   - Refund rate

3. **User Metrics**
   - Free vs Paid users
   - Upgrade rate
   - Time to conversion

### Stripe Dashboard

Access your test dashboard:
- https://dashboard.stripe.com/test/dashboard
- View payments, customers, subscriptions
- Monitor webhook deliveries
- Test customer portal

## 🔗 Quick Links

- **Stripe Test Dashboard**: https://dashboard.stripe.com/test/dashboard
- **Stripe Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Stripe Test Cards**: https://stripe.com/docs/testing
- **Stripe CLI Docs**: https://stripe.com/docs/stripe-cli
- **App Pricing Page**: http://localhost:3000/pricing
- **App Billing Page**: http://localhost:3000/billing
- **App Test Page**: http://localhost:3000/stripe-test

## 💡 Best Practices

1. **Always test in test mode first**
2. **Use webhooks for all subscription updates** (never rely on client-side data)
3. **Log all Stripe events** (already implemented in `stripe_events` table)
4. **Handle failed payments gracefully** (notifications, retry logic)
5. **Test edge cases** (declined cards, expired cards, network failures)
6. **Monitor webhook delivery** (set up alerts for failed webhooks)
7. **Keep Stripe keys secure** (never commit to git, use environment variables)

## 🎯 Success Criteria

✅ All tests pass
✅ Subscriptions created correctly
✅ Webhooks processed successfully
✅ Portal accessible and functional
✅ Database records accurate
✅ No errors in logs
✅ Customer experience smooth

---

**Need Help?**
- Check `/stripe-test` page for real-time configuration status
- Review webhook logs in Stripe Dashboard
- Check application logs for detailed error messages
- Verify environment variables are set correctly
