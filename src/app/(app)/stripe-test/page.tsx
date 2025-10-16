'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function StripeTestPage() {
  const { toast } = useToast()
  const [envVars, setEnvVars] = useState<any>({})
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    // Check environment variables (client-side accessible ones)
    setEnvVars({
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
      NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
      NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID,
      NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID,
    })
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    })
  }

  const isTestMode = envVars.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')
  const allPriceIdsSet = Object.values(envVars).every(v => v && v.length > 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Stripe Test Mode Verification</h1>
        <p className="text-muted-foreground mt-2">
          Verify your Stripe configuration and test the payment flow
        </p>
      </div>

      <div className="space-y-6">
        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe Configuration Status</CardTitle>
            <CardDescription>Current setup and readiness check</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isTestMode ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span>Test Mode Active</span>
              </div>
              <Badge variant={isTestMode ? 'default' : 'secondary'}>
                {isTestMode ? 'Test Mode' : 'Unknown'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {allPriceIdsSet ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span>Price IDs Configured</span>
              </div>
              <Badge variant={allPriceIdsSet ? 'default' : 'destructive'}>
                {allPriceIdsSet ? 'Complete' : 'Incomplete'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Webhook Handler</span>
              </div>
              <Badge variant="default">Implemented</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Billing Portal</span>
              </div>
              <Badge variant="default">Implemented</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Test Mode Warning */}
        {isTestMode && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Test Mode Active</AlertTitle>
            <AlertDescription>
              You're using Stripe test mode. Use test card numbers from Stripe's documentation. No real charges will be made.
            </AlertDescription>
          </Alert>
        )}

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Client-side accessible Stripe configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{key}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                      {value || <span className="text-red-500">Not Set</span>}
                    </p>
                  </div>
                  {value && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(value as string, key)}
                    >
                      {copied === key ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Test Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe Test Cards</CardTitle>
            <CardDescription>Use these test card numbers for testing payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-green-600">✓ Successful Payment</h4>
                <p className="text-sm font-mono">4242 4242 4242 4242</p>
                <p className="text-xs text-muted-foreground mt-1">Any future expiry, any CVC</p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-blue-600">✓ 3D Secure Required</h4>
                <p className="text-sm font-mono">4000 0027 6000 3184</p>
                <p className="text-xs text-muted-foreground mt-1">Tests 3D Secure authentication</p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-red-600">✗ Declined Payment</h4>
                <p className="text-sm font-mono">4000 0000 0000 0002</p>
                <p className="text-xs text-muted-foreground mt-1">Card will be declined</p>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 text-yellow-600">⚠ Insufficient Funds</h4>
                <p className="text-sm font-mono">4000 0000 0000 9995</p>
                <p className="text-xs text-muted-foreground mt-1">Decline with insufficient funds</p>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://stripe.com/docs/testing"
                target="_blank"
                rel="noopener noreferrer"
              >
                View All Test Cards
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Test Flow */}
        <Card>
          <CardHeader>
            <CardTitle>Test the Payment Flow</CardTitle>
            <CardDescription>Step-by-step guide to test Stripe integration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium">Go to Pricing Page</p>
                  <p className="text-sm text-muted-foreground">Navigate to /pricing and select a plan</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium">Click Subscribe</p>
                  <p className="text-sm text-muted-foreground">You'll be redirected to Stripe Checkout</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium">Enter Test Card Details</p>
                  <p className="text-sm text-muted-foreground">Use 4242 4242 4242 4242 with any future date and CVC</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                  4
                </div>
                <div>
                  <p className="font-medium">Complete Payment</p>
                  <p className="text-sm text-muted-foreground">You'll be redirected back to /billing</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                  5
                </div>
                <div>
                  <p className="font-medium">Verify Subscription</p>
                  <p className="text-sm text-muted-foreground">Check /billing page shows active subscription</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                  6
                </div>
                <div>
                  <p className="font-medium">Test Billing Portal</p>
                  <p className="text-sm text-muted-foreground">Click "Manage Subscription" to access Stripe portal</p>
                </div>
              </div>
            </div>

            <Button className="w-full" asChild>
              <a href="/pricing">Go to Pricing Page</a>
            </Button>
          </CardContent>
        </Card>

        {/* Webhook Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
            <CardDescription>Setup Stripe webhooks for local testing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Webhook Testing</AlertTitle>
              <AlertDescription>
                For local development, use Stripe CLI to forward webhooks to your local server.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-medium">Install Stripe CLI:</p>
              <div className="bg-muted p-3 rounded-lg">
                <code className="text-sm">stripe login</code>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Forward webhooks to local:</p>
              <div className="bg-muted p-3 rounded-lg">
                <code className="text-sm">
                  stripe listen --forward-to localhost:3000/api/stripe/webhook
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Webhook endpoint:</p>
              <div className="bg-muted p-3 rounded-lg">
                <code className="text-sm">/api/stripe/webhook</code>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Events handled:</p>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>checkout.session.completed</li>
                <li>customer.subscription.created</li>
                <li>customer.subscription.updated</li>
                <li>customer.subscription.deleted</li>
                <li>invoice.payment_succeeded</li>
                <li>invoice.payment_failed</li>
              </ul>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://stripe.com/docs/stripe-cli"
                target="_blank"
                rel="noopener noreferrer"
              >
                Stripe CLI Documentation
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" asChild>
              <a href="/pricing">Pricing Page</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/billing">Billing Page</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/account">Account Page</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/workspace-debug">Workspace Debug</a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://dashboard.stripe.com/test/dashboard"
                target="_blank"
                rel="noopener noreferrer"
              >
                Stripe Dashboard
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://dashboard.stripe.com/test/webhooks"
                target="_blank"
                rel="noopener noreferrer"
              >
                Stripe Webhooks
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
