// Script to fetch Stripe Price IDs
// Run with: node scripts/get-stripe-prices.js

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function getPrices() {
  console.log('\n📊 Fetching Stripe Prices...\n');

  try {
    // Fetch all prices
    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
    });

    if (prices.data.length === 0) {
      console.log('❌ No prices found in Stripe.');
      console.log('   Please create products and prices in your Stripe Dashboard:');
      console.log('   https://dashboard.stripe.com/test/products\n');
      return;
    }

    // Fetch all products to get names
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    const productMap = {};
    products.data.forEach(product => {
      productMap[product.id] = product.name;
    });

    console.log('✅ Found', prices.data.length, 'active prices:\n');

    // Group by product
    const pricesByProduct = {};
    prices.data.forEach(price => {
      const productName = productMap[price.product] || price.product;
      if (!pricesByProduct[productName]) {
        pricesByProduct[productName] = [];
      }
      pricesByProduct[productName].push(price);
    });

    // Display grouped prices
    Object.entries(pricesByProduct).forEach(([productName, productPrices]) => {
      console.log(`📦 ${productName}`);
      productPrices.forEach(price => {
        const amount = (price.unit_amount / 100).toFixed(2);
        const interval = price.recurring?.interval || 'one-time';
        console.log(`   ${price.id}`);
        console.log(`   ├─ Amount: $${amount} ${interval}`);
        console.log(`   └─ Currency: ${price.currency.toUpperCase()}\n`);
      });
    });

    // Generate env var suggestions
    console.log('\n💡 Suggested Environment Variables:\n');
    console.log('Copy these to your .env.local file:\n');

    prices.data.forEach(price => {
      const productName = productMap[price.product] || '';
      const interval = price.recurring?.interval || 'onetime';

      let envVarName = '';
      if (productName.toLowerCase().includes('pro')) {
        envVarName = interval === 'month'
          ? 'NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID'
          : 'NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID';
      } else if (productName.toLowerCase().includes('business')) {
        envVarName = interval === 'month'
          ? 'NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID'
          : 'NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID';
      }

      if (envVarName) {
        console.log(`${envVarName}="${price.id}"`);
      }
    });

    console.log('\n');

  } catch (error) {
    console.error('❌ Error fetching prices:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n   Check that STRIPE_SECRET_KEY is set correctly in .env.local\n');
    }
  }
}

getPrices();
