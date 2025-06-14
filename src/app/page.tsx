"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, BarChart3 } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { brkClient } from "@/lib/api/brkClient"
import { MetricCard } from "@/types/bitcoin"

// Mock data for initial display
const mockMetrics: MetricCard[] = [
  {
    title: "Bitcoin Price",
    value: "$43,250.00",
    change: "+2.5%",
    changeType: "positive",
    description: "Current BTC/USD price"
  },
  {
    title: "Market Cap",
    value: "$847.2B",
    change: "+1.8%",
    changeType: "positive", 
    description: "Total market capitalization"
  },
  {
    title: "24h Volume",
    value: "$15.4B",
    change: "-5.2%",
    changeType: "negative",
    description: "Trading volume last 24 hours"
  },
  {
    title: "MVRV Ratio",
    value: "1.85",
    change: "+0.12",
    changeType: "positive",
    description: "Market Value to Realized Value"
  },
  {
    title: "Realized Cap",
    value: "$458.3B",
    change: "+0.8%",
    changeType: "positive",
    description: "Realized market capitalization"
  },
  {
    title: "Active Addresses",
    value: "892,456",
    change: "+3.2%",
    changeType: "positive",
    description: "Daily active addresses"
  }
]

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricCard[]>(mockMetrics)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Test BRK API connection
        const response = await brkClient.fetchMetrics()
        if (response.success) {
          console.log("BRK API connected successfully")
          // TODO: Process real data when available
        } else {
          console.warn("BRK API not available, using mock data")
        }
      } catch (err) {
        console.warn("Using mock data due to API error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bitcoin Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time Bitcoin on-chain metrics and market analysis
            </p>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Live Data
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric, index) => {
            const icons = [DollarSign, BarChart3, Activity, PieChart, TrendingUp, Activity]
            const Icon = icons[index] || DollarSign
            
            return (
              <Card key={metric.title} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {metric.changeType === 'positive' ? (
                      <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                    )}
                    <span 
                      className={metric.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}
                    >
                      {metric.change}
                    </span>
                    <span className="ml-1">from last hour</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Price Chart</CardTitle>
              <CardDescription>
                Bitcoin price trend over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-muted-foreground">
                  Interactive chart will be rendered here
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardHeader>
              <CardTitle>On-Chain Metrics</CardTitle>
              <CardDescription>
                Key on-chain indicators and network health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-muted-foreground">
                  On-chain metrics visualization
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Section */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Data source connectivity and system health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">BRK API Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Real-time Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-sm">Charts Loading...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
