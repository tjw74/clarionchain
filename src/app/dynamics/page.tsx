"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, AlertTriangle, Info, Zap, Target, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { brkClient } from "@/lib/api/brkClient"

interface MetricAnomaly {
  id: string
  name: string
  currentValue: number
  percentile: number
  severity: 'extreme' | 'high' | 'moderate'
  direction: 'above' | 'below'
  daysAtLevel: number
  description: string
  historicalContext: string
}

interface MetricData {
  name: string
  values: number[]
  currentValue: number
}

export default function DynamicsPage() {
  const [anomalies, setAnomalies] = useState<MetricAnomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    async function analyzeMetrics() {
      try {
        setLoading(true)

        // Fetch all required metrics
        const [
          priceHistory,
          marketCapHistory,
          realizedCapHistory,
          lthSupplyHistory,
          sthSupplyHistory,
          realizedPriceHistory
        ] = await Promise.all([
          brkClient.fetchDailyCloseHistory(3650), // 10 years
          brkClient.fetchMarketCapHistory(3650),
          brkClient.fetchRealizedCapHistory(3650),
          brkClient.fetchLTHSupplyHistory(3650),
          brkClient.fetchSTHSupplyHistory(3650),
          brkClient.fetchRealizedPriceHistory(3650)
        ])

        // Calculate derived metrics
        const totalSupply = lthSupplyHistory.map((lth, i) => lth + sthSupplyHistory[i])
        const lthPercentage = lthSupplyHistory.map((lth, i) => (lth / totalSupply[i]) * 100)
        const sthPercentage = sthSupplyHistory.map((sth, i) => (sth / totalSupply[i]) * 100)

        // Prepare metrics for analysis
        const metrics: MetricData[] = [
          {
            name: "Bitcoin Price",
            values: priceHistory,
            currentValue: priceHistory[priceHistory.length - 1]
          },
          {
            name: "Market Value",
            values: marketCapHistory,
            currentValue: marketCapHistory[marketCapHistory.length - 1]
          },
          {
            name: "Realized Value",
            values: realizedCapHistory,
            currentValue: realizedCapHistory[realizedCapHistory.length - 1]
          },
          {
            name: "Realized Price",
            values: realizedPriceHistory,
            currentValue: realizedPriceHistory[realizedPriceHistory.length - 1]
          },
          {
            name: "LTH Supply %",
            values: lthPercentage,
            currentValue: lthPercentage[lthPercentage.length - 1]
          },
          {
            name: "STH Supply %",
            values: sthPercentage,
            currentValue: sthPercentage[sthPercentage.length - 1]
          }
        ]

        // Analyze each metric for anomalies
        const detectedAnomalies: MetricAnomaly[] = []

        metrics.forEach((metric, index) => {
          const anomaly = detectAnomaly(metric, index.toString())
          if (anomaly) {
            detectedAnomalies.push(anomaly)
          }
        })

        // Sort by severity and percentile
        detectedAnomalies.sort((a, b) => {
          const severityOrder = { extreme: 3, high: 2, moderate: 1 }
          if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[b.severity] - severityOrder[a.severity]
          }
          return Math.abs(b.percentile - 50) - Math.abs(a.percentile - 50)
        })

        setAnomalies(detectedAnomalies)
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Failed to analyze metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    analyzeMetrics()
  }, [])

  const detectAnomaly = (metric: MetricData, id: string): MetricAnomaly | null => {
    const { values, currentValue, name } = metric
    
    // Sort values to calculate percentiles
    const sortedValues = [...values].sort((a, b) => a - b)
    const n = sortedValues.length
    
    // Find current value's percentile
    const rank = sortedValues.filter(v => v <= currentValue).length
    const percentile = (rank / n) * 100
    
    // Calculate thresholds for anomaly detection
    const p95 = sortedValues[Math.floor(n * 0.95)]
    const p99 = sortedValues[Math.floor(n * 0.99)]
    const p5 = sortedValues[Math.floor(n * 0.05)]
    const p1 = sortedValues[Math.floor(n * 0.01)]
    
    // Check for anomalies
    let severity: 'extreme' | 'high' | 'moderate' | null = null
    let direction: 'above' | 'below' = 'above'
    
    if (currentValue >= p99 || currentValue <= p1) {
      severity = 'extreme'
    } else if (currentValue >= p95 || currentValue <= p5) {
      severity = 'high'
    } else if (percentile >= 90 || percentile <= 10) {
      severity = 'moderate'
    }
    
    if (!severity) return null
    
    direction = currentValue >= sortedValues[Math.floor(n * 0.5)] ? 'above' : 'below'
    
    // Calculate days at current level (simplified - using last 30 days)
    const recentValues = values.slice(-30)
    const threshold = direction === 'above' ? p95 : p5
    const daysAtLevel = recentValues.filter(v => 
      direction === 'above' ? v >= threshold : v <= threshold
    ).length
    
    return {
      id,
      name,
      currentValue,
      percentile: Math.round(percentile * 10) / 10,
      severity,
      direction,
      daysAtLevel,
      description: generateDescription(name, currentValue, percentile, direction),
      historicalContext: generateHistoricalContext(name, percentile, direction)
    }
  }

  const generateDescription = (name: string, value: number, percentile: number, direction: string): string => {
    const formatValue = (val: number, metricName: string) => {
      if (metricName.includes('Price')) {
        return `$${val.toLocaleString()}`
      } else if (metricName.includes('%')) {
        return `${val.toFixed(1)}%`
      } else if (val >= 1e12) {
        return `$${(val / 1e12).toFixed(2)}T`
      } else if (val >= 1e9) {
        return `$${(val / 1e9).toFixed(2)}B`
      } else if (val >= 1e6) {
        return `$${(val / 1e6).toFixed(2)}M`
      }
      return val.toLocaleString()
    }

    return `${name} is currently ${formatValue(value, name)}, in the ${percentile.toFixed(1)}th percentile`
  }

  const generateHistoricalContext = (name: string, percentile: number, direction: string): string => {
    const rarity = percentile > 95 || percentile < 5 ? 'extremely rare' : 
                   percentile > 90 || percentile < 10 ? 'rare' : 'uncommon'
    
    return `This level has been ${direction === 'above' ? 'exceeded' : 'reached'} only ${
      direction === 'above' ? (100 - percentile).toFixed(1) : percentile.toFixed(1)
    }% of the time historically - ${rarity} territory.`
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
      case 'moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'extreme': return <AlertTriangle className="h-4 w-4" />
      case 'high': return <Zap className="h-4 w-4" />
      case 'moderate': return <Target className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Dynamics" description="Real-time statistical anomaly detection for Bitcoin metrics">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Analyzing metrics for anomalies...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Dynamics" description="Real-time statistical anomaly detection for Bitcoin metrics">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Anomalies</p>
                  <p className="text-2xl font-bold">{anomalies.length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Extreme Events</p>
                  <p className="text-2xl font-bold">{anomalies.filter(a => a.severity === 'extreme').length}</p>
                </div>
                <Zap className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Update</p>
                  <p className="text-sm font-medium">{lastUpdate.toLocaleTimeString()}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Anomalies List */}
        {anomalies.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Anomalies Detected</h3>
              <p className="text-muted-foreground">
                All monitored metrics are within normal historical ranges.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {anomalies.map((anomaly) => (
              <Card key={anomaly.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${getSeverityColor(anomaly.severity)}`}>
                        {getSeverityIcon(anomaly.severity)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{anomaly.name}</CardTitle>
                        <CardDescription>{anomaly.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getSeverityColor(anomaly.severity)}>
                        {anomaly.severity.toUpperCase()}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {anomaly.direction === 'above' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        {anomaly.percentile.toFixed(1)}th %ile
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Historical Context</p>
                      <p className="text-sm">{anomaly.historicalContext}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Duration</p>
                      <p className="text-sm">
                        {anomaly.daysAtLevel} days at this level in the last 30 days
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 