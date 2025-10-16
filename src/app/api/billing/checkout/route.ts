import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const checkoutSchema = z.object({
  priceId: z.string(),
  planId: z.string(),
  billingCycle: z.enum(['monthly', 'yearly']),
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    console.log('[Checkout] Request received:', { priceId: body.priceId, planId: body.planId, billingCycle: body.billingCycle })

    const { priceId, planId, billingCycle } = checkoutSchema.parse(body)

    // Validate priceId format
    if (!priceId.startsWith('price_')) {
      console.error('[Checkout] Invalid price ID format:', priceId)
      return NextResponse.json({
        error: 'Invalid Price ID',
        message: 'The price ID must start with "price_". You may be using a Product ID (prod_...) instead. Please check your .env.local file and update the NEXT_PUBLIC_STRIPE_*_PRICE_ID variables with correct Price IDs from Stripe Dashboard.',
        receivedId: priceId,
        expectedFormat: 'price_xxxxx...'
      }, { status: 400 })
    }

    console.log('[Checkout] Creating checkout session for user:', user.id)

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined

    const { data: billingCustomer } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (billingCustomer?.stripe_customer_id) {
      console.log('[Checkout] Found existing billing customer:', billingCustomer.stripe_customer_id)
      stripeCustomerId = billingCustomer.stripe_customer_id
    } else {
      console.log('[Checkout] No billing customer found, creating new Stripe customer')

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: user.id,
        },
      })

      stripeCustomerId = customer.id
      console.log('[Checkout] Stripe customer created:', stripeCustomerId)

      // Get user's workspace (use first workspace if user owns multiple)
      const { data: workspaceMembers, error: workspaceError } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspace:workspaces(name)')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .order('created_at', { ascending: true })

      if (workspaceError) {
        console.error('[Checkout] Error fetching workspace:', workspaceError)
        return NextResponse.json({
          error: 'Workspace not found',
          message: 'You must be part of a workspace to subscribe. Please contact support.',
          details: workspaceError.message
        }, { status: 400 })
      }

      if (!workspaceMembers || workspaceMembers.length === 0) {
        console.error('[Checkout] No workspace found for user:', user.id)
        return NextResponse.json({
          error: 'Workspace not found',
          message: 'You must be part of a workspace to subscribe. Please contact support.'
        }, { status: 400 })
      }

      // Use the first workspace (oldest created)
      const workspaceMember = workspaceMembers[0]

      if (workspaceMembers.length > 1) {
        console.log(`[Checkout] User has ${workspaceMembers.length} workspaces, using first:`, {
          workspace_id: workspaceMember.workspace_id,
          workspace_name: (workspaceMember.workspace as any)?.name,
          total_workspaces: workspaceMembers.length
        })
      } else {
        console.log('[Checkout] User workspace found:', workspaceMember.workspace_id)
      }

      // Store customer ID with upsert to handle duplicates
      const { data: billingCustomerData, error: billingCustomerError } = await supabase
        .from('billing_customers')
        .upsert({
          user_id: user.id,
          workspace_id: workspaceMember.workspace_id,
          stripe_customer_id: stripeCustomerId,
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (billingCustomerError) {
        console.error('[Checkout] Error creating billing customer:', billingCustomerError)
        return NextResponse.json({
          error: 'Failed to create billing customer',
          message: 'Database error while setting up billing. Please try again or contact support.',
          details: billingCustomerError.message
        }, { status: 500 })
      }

      console.log('[Checkout] Billing customer record created:', billingCustomerData)
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[Checkout] Error creating checkout session:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('No such price')) {
        return NextResponse.json({
          error: 'Invalid Price ID',
          message: 'The Price ID in your environment variables does not exist in Stripe. Please verify your NEXT_PUBLIC_STRIPE_*_PRICE_ID values.',
          stripeError: error.message,
          suggestion: 'Run: node scripts/get-stripe-prices.js to get correct Price IDs'
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      error: 'Failed to create checkout session',
      message: error.message || 'Unknown error'
    }, { status: 500 })
  }
}
