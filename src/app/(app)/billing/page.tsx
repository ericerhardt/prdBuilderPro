'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { Subscription } from '@/types/prd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function BillingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { activeWorkspace } = useWorkspaceStore()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Check for success/canceled params
    if (searchParams.get('success')) {
      toast({
        title: 'Subscription activated!',
        description: 'Your payment was successful. Welcome aboard!',
      })
      // Remove query params
      router.replace('/billing')
    } else if (searchParams.get('canceled')) {
      toast({
        title: 'Checkout canceled',
        description: 'No charges were made. You can try again anytime.',
        variant: 'destructive',
      })
      router.replace('/billing')
    }
  }, [searchParams, toast, router])

  useEffect(() => {
    // Give the WorkspaceInitializer time to load the workspace
    const timer = setTimeout(() => {
      setWorkspaceLoading(false)
      if (activeWorkspace) {
        fetchSubscription()
      } else {
        setLoading(false)
      }
    }, 1000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!workspaceLoading && activeWorkspace) {
      fetchSubscription()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace, workspaceLoading])

  const fetchSubscription = async () => {
    if (!activeWorkspace) return

    try {
      console.log('[Billing] Fetching subscription for workspace:', activeWorkspace.id)

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .single()

      console.log('[Billing] Subscription query result:', { data, error })

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          throw error
        }
        console.log('[Billing] No subscription found')
        setSubscription(null)
      } else {
        console.log('[Billing] Subscription found:', data)
        setSubscription(data)
      }
    } catch (error) {
      console.error('[Billing] Error fetching subscription:', error)
      toast({
        title: 'Error',
        description: 'Failed to load subscription details.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSyncSubscription = async () => {
    setSyncing(true)

    try {
      console.log('[Billing] Syncing subscription from Stripe')

      const response = await fetch('/api/billing/sync', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to sync subscription')
      }

      const result = await response.json()
      console.log('[Billing] Sync result:', result)

      toast({
        title: 'Subscription synced!',
        description: `Synced ${result.synced} subscription(s) from Stripe.`,
      })

      // Refresh subscription data
      await fetchSubscription()
    } catch (error: any) {
      console.error('[Billing] Error syncing subscription:', error)
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync subscription from Stripe.',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error opening portal:', error)
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      })
      setPortalLoading(false)
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>
    }

    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="mr-1 h-3 w-3" />Trial</Badge>
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="mr-1 h-3 w-3" />Past Due</Badge>
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="mr-1 h-3 w-3" />Canceled</Badge>
      case 'incomplete':
        return <Badge className="bg-gray-100 text-gray-800"><AlertCircle className="mr-1 h-3 w-3" />Incomplete</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!activeWorkspace) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Workspace Found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              You need to be part of a workspace to access billing. Please contact your workspace administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      {subscription ? (
        <div className="space-y-6">
          {/* Current Subscription */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>
                    Your active subscription details
                  </CardDescription>
                </div>
                {getStatusBadge(subscription.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-semibold">
                    {subscription.plan_id ? subscription.plan_id.includes('pro') ? 'Pro' : 'Business' : 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold capitalize">{subscription.status || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Period Ends</p>
                  <p className="font-semibold">
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-semibold">
                    {formatDistanceToNow(new Date(subscription.updated_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <Button onClick={handleManageSubscription} disabled={portalLoading}>
                  {portalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </>
                  )}
                </Button>
                <Link href="/pricing">
                  <Button variant="outline">View Plans</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status Warning */}
          {subscription.status === 'past_due' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Payment Issue
                </CardTitle>
                <CardDescription className="text-yellow-700">
                  There was a problem with your last payment. Please update your payment method to continue using PRD Builder Pro.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleManageSubscription} variant="default">
                  Update Payment Method
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              You're currently on the free plan. Upgrade to unlock unlimited PRDs, team collaboration, and more!
            </p>
            <div className="flex gap-3">
              <Link href="/pricing">
                <Button>
                  View Pricing Plans
                </Button>
              </Link>
              <Button variant="outline" onClick={handleSyncSubscription} disabled={syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Sync from Stripe'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Just completed a payment? Click "Sync from Stripe" to refresh your subscription status.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}
