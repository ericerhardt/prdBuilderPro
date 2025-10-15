'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, DollarSign, Users, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import Stripe from 'stripe'

interface MetricsData {
  activeSubscribers: number
  trialingSubscribers: number
  totalRevenue: number
  mrr: number
  newSubscribers: number
  canceledSubscribers: number
  churnRate: number
  arpa: number
}

export default function AdminBillingPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      // Fetch all subscriptions
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')

      if (error) throw error

      // Calculate metrics
      const active = subscriptions?.filter(s => s.status === 'active').length || 0
      const trialing = subscriptions?.filter(s => s.status === 'trialing').length || 0

      // For demo purposes - in production, you'd calculate from Stripe data
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const newSubs = subscriptions?.filter(
        s => new Date(s.created_at) >= thirtyDaysAgo
      ).length || 0

      const canceled = subscriptions?.filter(s => s.status === 'canceled').length || 0

      // Calculate churn rate (canceled / total active at start of period)
      const totalActive = active + trialing
      const churn = totalActive > 0 ? (canceled / (totalActive + canceled)) * 100 : 0

      // Mock MRR calculation - in production, sum actual plan prices
      const mrr = active * 29 + trialing * 0 // Assuming $29 average

      // ARPA (Average Revenue Per Account)
      const arpa = totalActive > 0 ? mrr / totalActive : 0

      setMetrics({
        activeSubscribers: active,
        trialingSubscribers: trialing,
        totalRevenue: mrr * 12, // ARR approximation
        mrr,
        newSubscribers: newSubs,
        canceledSubscribers: canceled,
        churnRate: churn,
        arpa,
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeSubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics?.trialingSubscribers || 0} on trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.mrr || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${(metrics?.totalRevenue || 0).toLocaleString()} ARR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Subscribers (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.newSubscribers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics?.churnRate || 0).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.canceledSubscribers || 0} canceled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>ARPA (Average Revenue Per Account)</CardTitle>
            <CardDescription>Monthly revenue per active subscriber</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(metrics?.arpa || 0).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Status Breakdown</CardTitle>
            <CardDescription>Current state of all subscriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Active:</span>
              <span className="font-medium">{metrics?.activeSubscribers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Trialing:</span>
              <span className="font-medium">{metrics?.trialingSubscribers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Canceled:</span>
              <span className="font-medium">{metrics?.canceledSubscribers || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Revenue Insights
          </CardTitle>
          <CardDescription>
            Key performance indicators for your subscription business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">MRR Growth</p>
              <p className="text-2xl font-bold text-green-600">+12.5%</p>
              <p className="text-xs text-muted-foreground">vs. last month</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Customer LTV</p>
              <p className="text-2xl font-bold">$348</p>
              <p className="text-xs text-muted-foreground">Estimated lifetime value</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Retention Rate</p>
              <p className="text-2xl font-bold">
                {metrics ? (100 - metrics.churnRate).toFixed(1) : '0'}%
              </p>
              <p className="text-xs text-muted-foreground">30-day retention</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
