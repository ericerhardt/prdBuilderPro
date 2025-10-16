import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST() {
  console.log('[Sync] Billing sync requested')

  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Sync] Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Sync] User authenticated:', user.id)

    // Get billing customer
    const { data: billingCustomer, error: customerError } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id, workspace_id')
      .eq('user_id', user.id)
      .single()

    if (customerError || !billingCustomer) {
      console.error('[Sync] No billing customer found:', customerError)
      return NextResponse.json({
        error: 'No billing customer found',
        message: 'You need to complete a checkout first before syncing subscriptions.'
      }, { status: 404 })
    }

    console.log('[Sync] Found billing customer:', billingCustomer.stripe_customer_id)

    // Fetch subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: billingCustomer.stripe_customer_id,
      limit: 10,
    })

    console.log('[Sync] Found', subscriptions.data.length, 'subscriptions in Stripe')

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        message: 'No subscriptions found in Stripe',
        synced: 0
      })
    }

    // Sync each subscription to database
    const syncedSubscriptions = []

    for (const subscription of subscriptions.data) {
      console.log('[Sync] Syncing subscription:', subscription.id, 'status:', subscription.status)

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          workspace_id: billingCustomer.workspace_id,
          stripe_subscription_id: subscription.id,
          plan_id: subscription.items.data[0]?.price.id || null,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, {
          onConflict: 'stripe_subscription_id'
        })
        .select()
        .single()

      if (subError) {
        console.error('[Sync] Error syncing subscription:', subscription.id, subError)
      } else {
        console.log('[Sync] Successfully synced:', subscription.id)
        syncedSubscriptions.push(subData)
      }
    }

    return NextResponse.json({
      message: 'Subscriptions synced successfully',
      synced: syncedSubscriptions.length,
      subscriptions: syncedSubscriptions
    })

  } catch (error: any) {
    console.error('[Sync] Error syncing subscriptions:', error)
    return NextResponse.json({
      error: 'Failed to sync subscriptions',
      message: error.message
    }, { status: 500 })
  }
}
