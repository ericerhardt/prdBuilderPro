'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Check, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out PRD Builder Pro',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: '',
    stripePriceIdYearly: '',
    features: [
      '3 PRDs per month',
      '2 version history',
      'Basic platforms (Replit, Bolt.new)',
      'Export to Markdown',
      'Community support',
    ],
    limitations: [
      'No team collaboration',
      'No advanced platforms',
      'Limited version history',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For professionals and growing teams',
    priceMonthly: 29,
    priceYearly: 290,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!,
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID!,
    features: [
      'Unlimited PRDs',
      'Unlimited version history',
      'All platforms (including Leap.new, Lovable)',
      'Priority AI generation',
      'Team collaboration (5 seats)',
      'Export to multiple formats',
      'Priority support',
      'Custom templates',
    ],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'For organizations with advanced needs',
    priceMonthly: 99,
    priceYearly: 990,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID!,
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID!,
    features: [
      'Everything in Pro',
      'Unlimited team seats',
      'SSO/SAML',
      'Advanced admin controls',
      'Audit logs',
      'Custom AI model fine-tuning',
      'SLA guarantee',
      'Dedicated support',
      'Custom integrations',
    ],
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isYearly, setIsYearly] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') {
      router.push('/builder')
      return
    }

    setLoading(planId)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/signup')
        return
      }

      const plan = PLANS.find(p => p.id === planId)
      if (!plan) return

      const priceId = isYearly ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          planId,
          billingCycle: isYearly ? 'yearly' : 'monthly',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[Pricing] Checkout error:', errorData)

        // Show detailed error message
        let errorMessage = errorData.message || 'Failed to create checkout session'

        if (errorData.error === 'Invalid Price ID') {
          errorMessage = 'Configuration error: Invalid Stripe Price IDs. Please contact support or check the console for details.'
          console.error('[Pricing] Price ID Error:', {
            received: errorData.receivedId,
            expected: errorData.expectedFormat,
            message: errorData.message
          })
        }

        throw new Error(errorMessage)
      }

      const { url } = await response.json()

      if (!url) {
        throw new Error('No checkout URL received from server')
      }

      console.log('[Pricing] Redirecting to checkout:', url)
      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error: any) {
      console.error('[Pricing] Error creating checkout session:', error)
      toast({
        title: 'Checkout Error',
        description: error.message || 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Choose the perfect plan for your needs
        </p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <Label htmlFor="billing-toggle">Monthly</Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle">
            Yearly
            <Badge className="ml-2" variant="secondary">
              Save 20%
            </Badge>
          </Label>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {PLANS.map((plan) => {
          const price = isYearly ? plan.priceYearly : plan.priceMonthly
          const isPopular = plan.popular

          return (
            <Card 
              key={plan.id} 
              className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    ${isYearly ? Math.floor(price / 12) : price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                  {isYearly && (
                    <div className="text-sm text-muted-foreground">
                      ${price} billed annually
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations?.map((limitation, index) => (
                    <li key={`limitation-${index}`} className="flex items-start gap-2 opacity-60">
                      <span className="h-5 w-5 shrink-0 mt-0.5 text-center">×</span>
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : plan.priceMonthly === 0 ? (
                    'Start Free'
                  ) : (
                    'Subscribe'
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">
          Frequently Asked Questions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto mt-8">
          <div>
            <h3 className="font-semibold mb-2">Can I change plans later?</h3>
            <p className="text-muted-foreground">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
            <p className="text-muted-foreground">
              We accept all major credit cards, debit cards, and support international payments through Stripe.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Is there a free trial?</h3>
            <p className="text-muted-foreground">
              Our Free plan lets you try PRD Builder Pro with up to 3 PRDs per month, no credit card required.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
            <p className="text-muted-foreground">
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
