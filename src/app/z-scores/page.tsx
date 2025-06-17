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
      
      // Debug Supply in Profit values
      if (processedData.length > 0) {
        const latest = processedData[processedData.length - 1]
        console.log('Latest Supply in Profit raw value:', latest.rawValues.supplyInProfit)
        console.log('Latest Supply in Profit Z-score:', latest.zScores.supplyInProfit)
        console.log('Sample Supply in Profit values:', supplyInProfitHistory.slice(-10))
      }

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
      
      // Filter out invalid values (NaN, Infinity, null, undefined)
      const validData = relevantData.filter(val => val != null && isFinite(val))
      if (validData.length < 30) return 0
      
      const mean = validData.reduce((sum, val) => sum + val, 0) / validData.length
      const variance = validData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validData.length
      const stdDev = Math.sqrt(variance)
      
      if (stdDev === 0 || !isFinite(stdDev)) return 0
      
      const currentValue = values[currentIndex]
      if (!isFinite(currentValue)) return 0
      
      return (currentValue - mean) / stdDev
    }
    
    // Helper function to safely divide with validation
    const safeDivide = (numerator: number, denominator: number): number => {
      if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0) return 0
      const result = numerator / denominator
      return isFinite(result) ? result : 0
    }
    
    // Extract and align data arrays to match priceData length
    const dataLength = priceData.length
    console.log('Price data length:', dataLength)
    console.log('Other metrics lengths:', Object.keys(otherMetrics).map(key => `${key}: ${otherMetrics[key]?.length || 0}`))
    
    // Align all arrays to the same length as priceData (take the last N elements)
    const prices = priceData.map(item => item.price)
    const realizedPrices = (otherMetrics.realizedPrice || []).slice(-dataLength)
    const marketCaps = (otherMetrics.marketCap || []).slice(-dataLength)
    const realizedCaps = (otherMetrics.realizedCap || []).slice(-dataLength)
    const soprValues = (otherMetrics.sopr || []).slice(-dataLength)
    const sthSupplyData = (otherMetrics.sthMarketCap || []).slice(-dataLength) // Correctly named: STH supply in satoshis
    const sthRealizedCaps = (otherMetrics.sthRealizedCap || []).slice(-dataLength)
    const supplyInProfit = (otherMetrics.supplyInProfit || []).slice(-dataLength)
    const supplyInLoss = (otherMetrics.supplyInLoss || []).slice(-dataLength)
    
    console.log('Aligned array lengths:', {
      prices: prices.length,
      realizedPrices: realizedPrices.length,
      marketCaps: marketCaps.length,
      realizedCaps: realizedCaps.length,
      sopr: soprValues.length,
      sthSupply: sthSupplyData.length,
      sthRealizedCaps: sthRealizedCaps.length,
      supplyInProfit: supplyInProfit.length,
      supplyInLoss: supplyInLoss.length
    })
    
    // Pre-calculate derived metric arrays (PERFORMANCE FIX)
    const mayerRatioArray = prices.map((price, i) => {
      const realizedPrice = realizedPrices[i] || 0
      return safeDivide(price, realizedPrice)
    })
    
    const mvrvRatioArray = marketCaps.map((marketCap, i) => {
      const realizedCap = realizedCaps[i] || 0
      return safeDivide(marketCap, realizedCap)
    })
    
    const sthMarketValueArray = prices.map((price, i) => {
      const sthSupplyBTC = (sthSupplyData[i] || 0) / 100000000 // Convert satoshis to BTC
      return sthSupplyBTC * price
    })
    
    const sellSideRiskArray = prices.map((price, i) => {
      const sthSupplyBTC = (sthSupplyData[i] || 0) / 100000000
      const sthMarketValue = sthSupplyBTC * price
      const sthRealizedValue = sthRealizedCaps[i] || 0
      return safeDivide(sthMarketValue, sthRealizedValue)
    })
    
    return priceData.map((item, index) => {
      // Get aligned data points
      const price = prices[index] || 0
      const realizedPrice = realizedPrices[index] || 0
      const marketCap = marketCaps[index] || 0
      const realizedCap = realizedCaps[index] || 0
      const sopr = soprValues[index] || 0
      const sthSupplyBTC = (sthSupplyData[index] || 0) / 100000000
      const sthMarketValue = sthMarketValueArray[index]
      const sthRealizedValue = sthRealizedCaps[index] || 0
      const supplyProfit = supplyInProfit[index] || 0
      const supplyLoss = supplyInLoss[index] || 0
      
      // Calculate ratios with safe division
      const mvrvRatio = safeDivide(marketCap, realizedCap)
      const mayerRatio = safeDivide(price, realizedPrice)
      const sellSideRisk = safeDivide(sthMarketValue, sthRealizedValue)
      
      // Calculate Z-scores using pre-calculated arrays
      const zScores = {
        price: calculateZScore(prices, index),
        realizedPrice: calculateZScore(realizedPrices, index),
        mayerRatio: calculateZScore(mayerRatioArray, index),
        marketValue: calculateZScore(marketCaps, index),
        realizedValue: calculateZScore(realizedCaps, index),
        mvrvRatio: calculateZScore(mvrvRatioArray, index),
        sopr: calculateZScore(soprValues, index),
        sthMarketValue: calculateZScore(sthMarketValueArray, index),
        sthRealizedValue: calculateZScore(sthRealizedCaps, index),
        sellSideRisk: calculateZScore(sellSideRiskArray, index),
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