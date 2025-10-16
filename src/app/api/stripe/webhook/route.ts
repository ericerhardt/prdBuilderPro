import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('[Webhook] Received webhook request')
  console.log('[Webhook] Signature present:', !!signature)
  console.log('[Webhook] Webhook secret present:', !!webhookSecret)

  if (!signature) {
    console.error('[Webhook] No signature found in request')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log('[Webhook] Event verified:', event.type)
  } catch (error: any) {
    console.error('[Webhook] Signature verification failed:', error.message)
    return NextResponse.json({
      error: 'Webhook signature verification failed',
      message: error.message
    }, { status: 400 })
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
            console.log('[Webhook] Retrieving subscription:', session.subscription)
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

            console.log('[Webhook] Upserting subscription to database:', {
              workspace_id: workspaceMember.workspace_id,
              stripe_subscription_id: subscription.id,
              status: subscription.status
            })

            const { data: subData, error: subError } = await supabase
              .from('subscriptions')
              .upsert({
                workspace_id: workspaceMember.workspace_id,
                stripe_subscription_id: subscription.id,
                plan_id: planId || null,
                status: subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              }, {
                onConflict: 'stripe_subscription_id'
              })
              .select()

            if (subError) {
              console.error('[Webhook] Error upserting subscription:', subError)
            } else {
              console.log('[Webhook] Subscription upserted successfully:', subData)
            }
          }
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        console.log('[Webhook] Processing subscription event:', event.type, subscription.id)

        // Get workspace by customer ID
        const { data: billingCustomer, error: customerError } = await supabase
          .from('billing_customers')
          .select('workspace_id, user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()

        if (customerError || !billingCustomer) {
          console.error('[Webhook] No billing customer found for:', subscription.customer, customerError)
          break
        }

        console.log('[Webhook] Found billing customer:', billingCustomer)

        // Upsert subscription
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

        if (subError) {
          console.error('[Webhook] Error upserting subscription:', subError)
        } else {
          console.log('[Webhook] Subscription upserted successfully:', subData)
        }
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
