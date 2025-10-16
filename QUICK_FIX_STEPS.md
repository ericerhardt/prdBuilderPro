# 🚀 Quick Fix for Stripe Errors

## Problem Summary

You have **2 main issues**:
1. ❌ Using Product IDs instead of Price IDs
2. ❌ Webhook signature verification failing

## ⚡ QUICK FIX (5 minutes)

### Step 1: Get Correct Price IDs

Run this command:
```bash
node scripts/get-stripe-prices.js
```

This will show you all your Stripe prices and generate the correct environment variables.

**If you don't have prices yet**, create them:
1. Go to https://dashboard.stripe.com/test/products
2. Create two products:
   - **Pro**: $29/month and $290/year
   - **Business**: $99/month and $990/year
3. Run the script again

### Step 2: Update .env.local

Replace your current Price IDs with the ones from Step 1:

```bash
# Open .env.local and replace these lines:
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID="price_xxxxx"      # ← Get from script
NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID="price_xxxxx"       # ← Get from script
NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID="price_xxxxx" # ← Get from script
NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID="price_xxxxx"  # ← Get from script
```

**Important**: Make sure they start with `price_` not `prod_`!

### Step 3: Fix Webhook (For Local Testing Only)

```bash
# In a new terminal, run:
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook secret it shows (starts with whsec_)
# Add it to .env.local:
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
```

### Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C in terminal)
npm run dev
```

### Step 5: Test!

1. Go to http://localhost:3000/pricing
2. Click "Subscribe" on Pro plan
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. You should be redirected to `/billing?success=true`

## ✅ Verification Checklist

After the fix:
- [ ] Price IDs in `.env.local` start with `price_`
- [ ] Dev server restarted
- [ ] Can click "Subscribe" without errors
- [ ] Redirected to Stripe Checkout page
- [ ] Test payment completes successfully
- [ ] Redirected back to billing page
- [ ] Subscription shows on billing page

## 🔧 If Still Having Issues

### Error: "No such price"
- Double-check Price IDs in `.env.local`
- Verify they exist in Stripe Dashboard
- Make sure you're using test mode Price IDs

### Error: "Webhook signature failed"
- Make sure Stripe CLI is running
- Copy the `whsec_` secret to `.env.local`
- Restart dev server after updating

### Checkout doesn't redirect
- Check browser console for errors
- Verify `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`
- Make sure you're logged in

## 📞 Need Help?

Check these pages:
- `/stripe-test` - Verify configuration
- `/workspace-debug` - Check workspace setup

Look for detailed error messages in:
- Browser console (F12 → Console)
- Terminal where `npm run dev` is running

## 📚 Full Documentation

For complete details, see:
- [STRIPE_PRICE_ID_FIX.md](STRIPE_PRICE_ID_FIX.md) - Detailed Price ID guide
- [STRIPE_TESTING_GUIDE.md](STRIPE_TESTING_GUIDE.md) - Complete testing procedures
