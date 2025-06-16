"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import PriceChart from "./components/PriceChart"
import ZScoreChart from "./components/ZScoreChart"
import { brkClient } from "@/lib/api/brkClient"

// Z-Score metrics configuration
export const Z_SCORE_METRICS = [
  { key: 'price', label: 'Price', color: '#f59e0b' },
  { key: 'realizedPrice', label: 'Realized Price', color: '#10b981' },
  { key: 'mayerRatio', label: 'Mayer Ratio', color: '#3b82f6' },
  { key: 'marketValue', label: 'Market Value', color: '#8b5cf6' },
  { key: 'realizedValue', label: 'Realized Value', color: '#06b6d4' },
  { key: 'mvrvRatio', label: 'MVRV Ratio', color: '#ef4444' },
  { key: 'sopr', label: 'SOPR', color: '#f97316' },
  { key: 'sthMarketValue', label: 'STH Market Value', color: '#84cc16' },
  { key: 'sthRealizedValue', label: 'STH Realized Value', color: '#22c55e' },
  { key: 'sellSideRisk', label: 'Sell Side Risk Ratio', color: '#ec4899' },
  { key: 'supplyInProfit', label: 'Supply In Profit', color: '#14b8a6' },
  { key: 'supplyInLoss', label: 'Supply in Loss', color: '#dc2626' },
]

export interface ZScoreData {
  timestamp: string
  price: number
  zScores: Record<string, number>
  rawValues: Record<string, number>
}

export default function ZScoresPage() {
  const [priceData, setPriceData] = useState<Array<{timestamp: string, price: number}>>([])
  const [zScoreData, setZScoreData] = useState<ZScoreData[]>([])
  const [activeZScores, setActiveZScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchZScoreData()
  }, [])

  const fetchZScoreData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch price data first to get the chart working
      console.log('Starting data fetch...')
      const priceHistory = await brkClient.fetchPriceHistory()
      console.log('Price history fetched:', priceHistory.length, 'items')
      
      // Fetch other data
      const [
        realizedPriceHistory,
        marketCapHistory,
        realizedCapHistory,
        soprHistory,
        sthMarketCapHistory,
        sthRealizedCapHistory,
        supplyInProfitHistory,
        supplyInLossHistory
      ] = await Promise.all([
        brkClient.fetchRealizedPriceHistory(),
        brkClient.fetchMarketCapHistory(),
        brkClient.fetchRealizedCapHistory(),
        brkClient.fetchSOPRHistory(),
        brkClient.fetchSTHMarketCapHistory(),
        brkClient.fetchSTHRealizedCapHistory(),
        brkClient.fetchSupplyInProfitHistory(),
        brkClient.fetchSupplyInLossHistory()
      ])
      
      console.log('All data fetched successfully')

      // Filter data from Jan 1, 2015 onwards
      const startDate = new Date('2015-01-01')
      console.log('Start date for filtering:', startDate)
      console.log('Sample timestamps from price history:', priceHistory.slice(0, 5).map(item => item.timestamp))
      console.log('Sample timestamp parsing:', priceHistory.slice(0, 3).map(item => ({
        original: item.timestamp,
        parsed: new Date(item.timestamp),
        isAfter2015: new Date(item.timestamp) >= startDate
      })))
      
      const filteredData = priceHistory.filter(item => {
        const itemDate = new Date(item.timestamp)
        return itemDate >= startDate
      })
      
      console.log('Filtered data length after date filter:', filteredData.length)
      
      // If no data after 2015, use all available data (for debugging)
      const finalData = filteredData.length > 0 ? filteredData : priceHistory.slice(-2000) // Use last 2000 days
      
      console.log('Filtered price data length:', filteredData.length)
      console.log('Final data length:', finalData.length)
      console.log('Sample price data:', finalData.slice(0, 3))
      console.log('SOPR data length:', soprHistory.length)
      console.log('Sample SOPR data:', soprHistory.slice(0, 3))

      // Calculate Z-scores for each metric
      const processedData = calculateZScores(finalData, {
        realizedPrice: realizedPriceHistory,
        marketCap: marketCapHistory,
        realizedCap: realizedCapHistory,
        sopr: soprHistory,
        sthMarketCap: sthMarketCapHistory,
        sthRealizedCap: sthRealizedCapHistory,
        supplyInProfit: supplyInProfitHistory,
        supplyInLoss: supplyInLossHistory
      })
      
      console.log('Processed Z-score data length:', processedData.length)
      console.log('Sample Z-score data:', processedData.slice(-3))

      setPriceData(finalData)
      setZScoreData(processedData)
      
      // Set initial active z-scores to latest data point
      if (processedData.length > 0) {
        setActiveZScores(processedData[processedData.length - 1].zScores)
      }

    } catch (err) {
      setError('Failed to fetch Z-Score data')
      console.error('Z-Score data fetch error:', err)
      console.error('Error details:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateZScores = (priceData: Array<{timestamp: string, price: number}>, otherMetrics: Record<string, number[]>): ZScoreData[] => {
    // Helper function to calculate Z-score using rolling 4-year window
    const calculateZScore = (values: number[], currentIndex: number): number => {
      if (currentIndex < 0 || values.length === 0) return 0
      
      // Use rolling 4-year window (4 * 365 = 1460 days)
      const windowSize = 1460
      const startIndex = Math.max(0, currentIndex - windowSize + 1)
      const relevantData = values.slice(startIndex, currentIndex + 1)
      
      if (relevantData.length < 30) return 0 // Need minimum data points
      
      const mean = relevantData.reduce((sum, val) => sum + val, 0) / relevantData.length
      const variance = relevantData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / relevantData.length
      const stdDev = Math.sqrt(variance)
      
      if (stdDev === 0) return 0
      return (values[currentIndex] - mean) / stdDev
    }
    
    // Extract price values for calculations
    const prices = priceData.map(item => item.price)
    const realizedPrices = otherMetrics.realizedPrice || []
    const marketCaps = otherMetrics.marketCap || []
    const realizedCaps = otherMetrics.realizedCap || []
    const soprValues = otherMetrics.sopr || []
    const sthSupply = otherMetrics.sthMarketCap || [] // This is actually STH supply
    const sthRealizedCaps = otherMetrics.sthRealizedCap || []
    const supplyInProfit = otherMetrics.supplyInProfit || []
    const supplyInLoss = otherMetrics.supplyInLoss || []
    
    return priceData.map((item, index) => {
      // Calculate derived metrics
      const price = prices[index] || 0
      const realizedPrice = realizedPrices[index] || 0
      const marketCap = marketCaps[index] || 0
      const realizedCap = realizedCaps[index] || 0
      const sopr = soprValues[index] || 0
      const sthSupplyBTC = (sthSupply[index] || 0) / 100000000 // Convert satoshis to BTC
      const sthMarketValue = sthSupplyBTC * price
      const sthRealizedValue = sthRealizedCaps[index] || 0
      const supplyProfit = supplyInProfit[index] || 0
      const supplyLoss = supplyInLoss[index] || 0
      
      // Calculate ratios
      const mvrvRatio = realizedCap > 0 ? marketCap / realizedCap : 0
      const mayerRatio = realizedPrice > 0 ? price / realizedPrice : 0
      const sellSideRisk = sthRealizedValue > 0 ? sthMarketValue / sthRealizedValue : 0
      
      // Calculate Z-scores
      const zScores = {
        price: calculateZScore(prices, index),
        realizedPrice: calculateZScore(realizedPrices, index),
        mayerRatio: calculateZScore(prices.map((p, i) => {
          const rp = realizedPrices[i] || 0
          return rp > 0 ? p / rp : 0
        }), index),
        marketValue: calculateZScore(marketCaps, index),
        realizedValue: calculateZScore(realizedCaps, index),
        mvrvRatio: calculateZScore(marketCaps.map((mc, i) => {
          const rc = realizedCaps[i] || 0
          return rc > 0 ? mc / rc : 0
        }), index),
        sopr: calculateZScore(soprValues, index),
        sthMarketValue: calculateZScore(prices.map((p, i) => {
          const supply = (sthSupply[i] || 0) / 100000000
          return supply * p
        }), index),
        sthRealizedValue: calculateZScore(sthRealizedCaps, index),
        sellSideRisk: calculateZScore(prices.map((p, i) => {
          const supply = (sthSupply[i] || 0) / 100000000
          const sthRealCap = sthRealizedCaps[i] || 0
          return sthRealCap > 0 ? (supply * p) / sthRealCap : 0
        }), index),
        supplyInProfit: calculateZScore(supplyInProfit, index),
        supplyInLoss: calculateZScore(supplyInLoss, index),
      }
      
      return {
        timestamp: item.timestamp,
        price: item.price,
        zScores,
        rawValues: {
          price,
          realizedPrice,
          mayerRatio,
          marketValue: marketCap,
          realizedValue: realizedCap,
          mvrvRatio,
          sopr,
          sthMarketValue,
          sthRealizedValue,
          sellSideRisk,
          supplyInProfit: supplyProfit,
          supplyInLoss: supplyLoss,
        }
      }
    })
  }

  const handlePriceHover = (dataIndex: number) => {
    if (zScoreData[dataIndex]) {
      setActiveZScores(zScoreData[dataIndex].zScores)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Z Scores" description="Real-time synchronized price and Z-score analysis">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading Z-Score data...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Z Scores" description="Real-time synchronized price and Z-score analysis">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">{error}</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Z Scores" description="Real-time synchronized price and Z-score analysis">
      <div className="space-y-6">
        {/* Instructions */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Interactive Z-Score Analysis</CardTitle>
            <CardDescription>
              Hover over the price chart to see real-time Z-scores for key Bitcoin metrics. 
              Z-scores are calculated using a rolling 4-year window for adaptive market analysis.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Bitcoin Price</CardTitle>
              <CardDescription>
                Hover to explore Z-scores at different price levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriceChart 
                data={priceData}
                onHover={handlePriceHover}
              />
            </CardContent>
          </Card>

          {/* Z-Score Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Z-Score Analysis</CardTitle>
              <CardDescription>
                Real-time metric extremeness indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ZScoreChart 
                zScores={activeZScores}
                metrics={Z_SCORE_METRICS}
              />
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Z-Score Interpretation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Normal (-1 to +1): Typical market conditions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Elevated (±1 to ±2): Notable deviation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Extreme (±2+): Rare market conditions</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 