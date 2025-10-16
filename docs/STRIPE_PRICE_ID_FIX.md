# Stripe Price ID Fix Guide

## ⚠️ Problem Identified

Your `.env.local` file has **Product IDs** (`prod_...`) instead of **Price IDs** (`price_...`).

```
❌ WRONG: prod_TEmxvi91krcvHn  (This is a Product ID)
✅ CORRECT: price_1A2B3C4D5E6F7  (This is a Price ID)
```

Stripe requires Price IDs for checkout, not Product IDs.

## 🔧 Quick Fix Options

### Option 1: Use Script to Fetch Price IDs (EASIEST)

```bash
# Run the helper script
node scripts/get-stripe-prices.js
```

This will:
- List all your Stripe prices
- Show the correct Price IDs
- Generate ready-to-copy environment variables

### Option 2: Manual via Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Click on each product (Pro, Business)
3. Copy the **Price ID** (starts with `price_`)
4. Update `.env.local` with correct IDs

### Option 3: Create New Prices in Stripe

If you don't have prices set up yet:

**Step 1: Create Pro Plan**
1. Go to https://dashboard.stripe.com/test/products/create
2. Name: "Pro"
3. Description: "For professionals and growing teams"
4. Click "Add pricing"
5. Monthly: $29/month → Copy Price ID
6. Add another pricing: $290/year → Copy Price ID

**Step 2: Create Business Plan**
1. Create new product: "Business"
2. Description: "For organizations with advanced needs"
3. Click "Add pricing"
4. Monthly: $99/month → Copy Price ID
5. Add another pricing: $990/year → Copy Price ID

**Step 3: Update Environment Variables**
```bash
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID="price_xxxxx..."
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID="price_xxxxx..."
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID="price_xxxxx..."
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID="price_xxxxx..."
```

## 📝 Update Your .env.local

Replace the current product IDs with price IDs:

```bash
# BEFORE (Wrong - Product IDs)
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID="prod_TEmv4MfYA4WCrV"
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID="prod_TEmwxHgQDePaLP"
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID="prod_TEmxvi91krcvHn"
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID="prod_TEmzvW0mW14aYm"

# AFTER (Correct - Price IDs)
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID="price_1xxxxxx"
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID="price_1xxxxxx"
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID="price_1xxxxxx"
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID="price_1xxxxxx"
```

## 🔄 After Updating

1. **Restart your dev server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Verify the fix**:
   - Go to http://localhost:3000/stripe-test
   - Check that all Price IDs are shown
   - Try subscribing to a plan

## 🐛 Fixing Webhook Signature Verification

The webhook error is because the webhook endpoint needs raw body parsing. This has been fixed in the code.

### For Local Testing with Stripe CLI:

1. **Install Stripe CLI** (if not installed):
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows (via Scoop)
   scoop install stripe
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copy the webhook secret** from the output:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxx...
   ```

5. **Update .env.local**:
   ```bash
   STRIPE_WEBHOOK_SECRET="whsec_xxxxx..."
   ```

6. **Restart dev server**

7. **Test webhook**:
   ```bash
   stripe trigger checkout.session.completed
   ```

## ✅ Verification Steps

After fixing Price IDs:

1. **Check Environment**:
   ```bash
   # Verify Price IDs start with "price_"
   grep PRICE_ID .env.local
   ```

2. **Test Checkout**:
   - Go to `/pricing`
   - Click "Subscribe" on Pro plan
   - Should redirect to Stripe Checkout
   - Complete payment with test card: `4242 4242 4242 4242`

3. **Check Logs**:
   - No more "No such price" errors
   - Checkout should complete successfully

## 🆘 Troubleshooting

### Error: "No such price: 'prod_...'"
**Solution**: You're still using Product IDs. Follow Option 1, 2, or 3 above.

### Error: "Webhook signature verification failed"
**Solution**:
1. Make sure Stripe CLI is running
2. Copy the webhook secret it provides
3. Update `STRIPE_WEBHOOK_SECRET` in `.env.local`
4. Restart dev server

### Webhook works but subscription doesn't appear
**Solution**:
1. Check browser console for errors
2. Check Stripe Dashboard → Webhooks for delivery status
3. Verify workspace exists (go to `/workspace-debug`)
4. Check Supabase tables: `billing_customers`, `subscriptions`

## 📊 Quick Reference

### Stripe Dashboard Links
- **Products**: https://dashboard.stripe.com/test/products
- **Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Customers**: https://dashboard.stripe.com/test/customers
- **Payments**: https://dashboard.stripe.com/test/payments

### ID Prefixes
- `prod_` = Product ID (don't use for checkout)
- `price_` = Price ID (use this!)
- `cus_` = Customer ID
- `sub_` = Subscription ID
- `whsec_` = Webhook signing secret

## 🎯 Expected Results After Fix

✅ Checkout page loads without errors
✅ Can complete test payment
✅ Redirected to `/billing?success=true`
✅ Subscription appears on billing page
✅ Webhooks process successfully
✅ No "No such price" errors

---

**Need the script?** Run:
```bash
node scripts/get-stripe-prices.js
```

This will show all your Stripe prices and generate the correct environment variable values!
