import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Log the event
  await supabase.from('stripe_events').insert({
    type: event.type,
    payload: event as any,
  })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription') {
          const userId = session.metadata?.user_id
          const planId = session.metadata?.plan_id

          if (!userId) {
            console.error('No user_id in session metadata')
            break
          }

          // Get workspace for user
          const { data: workspaceMember } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', userId)
            .eq('role', 'owner')
            .single()

          if (!workspaceMember) {
            console.error('No workspace found for user:', userId)
            break
          }

          // Update or create billing customer
          await supabase
            .from('billing_customers')
            .upsert({
              user_id: userId,
              workspace_id: workspaceMember.workspace_id,
              stripe_customer_id: session.customer as string,
            }, {
              onConflict: 'user_id'
            })

          // Create subscription record if subscription was created
          if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

            await supabase.from('subscriptions').insert({
              workspace_id: workspaceMember.workspace_id,
              stripe_subscription_id: subscription.id,
              plan_id: planId || null,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Get workspace by customer ID
        const { data: billingCustomer } = await supabase
          .from('billing_customers')
          .select('workspace_id, user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (!billingCustomer) {
          console.error('No billing customer found for:', subscription.customer)
          break
        }

        // Upsert subscription
        await supabase
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
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          // Update subscription status to active
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          // Update subscription status to past_due
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          // TODO: Send email notification to user about failed payment
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
