"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, AlertTriangle, Info, Zap, Target, Clock, Filter } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { brkClient } from "@/lib/api/brkClient"
import dynamic from 'next/dynamic'
import html2canvas from 'html2canvas'
import { useUser } from '@/context/UserContext'
import { useNostr } from '@/hooks/useNostr'

// Dynamic Chart.js imports to avoid SSR issues
const ChartJSLine = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false
})

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  Scale,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )
}

type AnalysisWindow = '4year' | '2year' | 'full'
const windowMap: Record<AnalysisWindow, keyof MetricZScoreAnalysis['timeSeries']> = {
  '4year': 'fourYear',
  '2year': 'twoYear',
  'full': 'full'
}
type ZScoreSeverity = 'extreme' | 'high' | 'moderate' | 'normal'

interface ZScoreResult {
  value: number
  mean: number
  stdDev: number
  zScore: number
  severity: ZScoreSeverity
  timeInBandPercent: number
}

interface ZScoreTimeSeries {
  dates: Date[]
  zScores: number[]
  values: number[]
}

interface MetricZScoreAnalysis {
  id: string
  name: string
  currentValue: number
  windows: {
    fourYear: ZScoreResult
    twoYear: ZScoreResult
    full: ZScoreResult
  }
  timeSeries: {
    fourYear: ZScoreTimeSeries
    twoYear: ZScoreTimeSeries
    full: ZScoreTimeSeries
  }
  description: string
  maxSeverity: ZScoreSeverity
  isAnomalyInAllWindows: boolean
}

interface WindowSummary {
  total: number
  extreme: number
  high: number
  moderate: number
}

export default function DynamicsPage() {
  const [analyses, setAnalyses] = useState<MetricZScoreAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeWindow, setActiveWindow] = useState<AnalysisWindow>('4year')
  const [filterMode, setFilterMode] = useState<'all' | 'allWindows' | 'cycleSpecific'>('all')

  // Refs for sharing individual metric cards
  const metricCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const { user } = useUser()
  const { publish, isPublishing, error } = useNostr()

  // Refs and state for pulse animation
  const chartRefs = useRef<{ [key: string]: ChartJS<'line', number[], string | Date> | null }>({});
  const [pulsePositions, setPulsePositions] = useState<{ [key: string]: { x: number; y: number } | null }>({});

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
          brkClient.fetchDailyCloseHistory(3650), // 10 years for full analysis
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

        // Create date array (assuming daily data going backwards from today)
        const dates = Array.from({ length: priceHistory.length }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (priceHistory.length - 1 - i))
          return date
        })

        // Filter data from Jan 1, 2012 onwards for "Full History"
        const daysSince2012 = Math.floor((new Date().getTime() - new Date('2012-01-01').getTime()) / (1000 * 60 * 60 * 24))
        const fullHistoryIndex = Math.max(0, priceHistory.length - daysSince2012)

        const metrics = [
          {
            name: "Bitcoin Price",
            values: priceHistory,
            fullHistoryValues: priceHistory.slice(fullHistoryIndex),
            dates: dates,
            fullHistoryDates: dates.slice(fullHistoryIndex)
          },
          {
            name: "Market Value", 
            values: marketCapHistory,
            fullHistoryValues: marketCapHistory.slice(fullHistoryIndex),
            dates: dates,
            fullHistoryDates: dates.slice(fullHistoryIndex)
          },
          {
            name: "Realized Value",
            values: realizedCapHistory,
            fullHistoryValues: realizedCapHistory.slice(fullHistoryIndex),
            dates: dates,
            fullHistoryDates: dates.slice(fullHistoryIndex)
          },
          {
            name: "Realized Price",
            values: realizedPriceHistory,
            fullHistoryValues: realizedPriceHistory.slice(fullHistoryIndex),
            dates: dates,
            fullHistoryDates: dates.slice(fullHistoryIndex)
          },
          {
            name: "LTH Supply %",
            values: lthPercentage,
            fullHistoryValues: lthPercentage.slice(fullHistoryIndex),
            dates: dates,
            fullHistoryDates: dates.slice(fullHistoryIndex)
          },
          {
            name: "STH Supply %",
            values: sthPercentage,
            fullHistoryValues: sthPercentage.slice(fullHistoryIndex),
            dates: dates,
            fullHistoryDates: dates.slice(fullHistoryIndex)
          }
        ]

        const analyzedMetrics: MetricZScoreAnalysis[] = []

        metrics.forEach((metric, index) => {
          const analysis = analyzeMetricZScores(metric, index.toString())
          if (analysis) {
            analyzedMetrics.push(analysis)
          }
        })

        // Sort by maximum severity across all windows
        analyzedMetrics.sort((a, b) => {
          const severityOrder = { extreme: 4, high: 3, moderate: 2, normal: 1 }
          if (severityOrder[a.maxSeverity] !== severityOrder[b.maxSeverity]) {
            return severityOrder[b.maxSeverity] - severityOrder[a.maxSeverity]
          }
          // Secondary sort by highest Z-score
          const aMaxZ = Math.max(
            Math.abs(a.windows.fourYear.zScore),
            Math.abs(a.windows.twoYear.zScore), 
            Math.abs(a.windows.full.zScore)
          )
          const bMaxZ = Math.max(
            Math.abs(b.windows.fourYear.zScore),
            Math.abs(b.windows.twoYear.zScore),
            Math.abs(b.windows.full.zScore)
          )
          return bMaxZ - aMaxZ
        })

        setAnalyses(analyzedMetrics)
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Failed to analyze metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    analyzeMetrics()
  }, [])

  const calculateRarityAndSeverity = (historicalZScores: number[]): { severity: ZScoreSeverity; timeInBandPercent: number } => {
    if (historicalZScores.length < 30) {
      return { severity: 'normal', timeInBandPercent: 100 };
    }

    const currentZScore = historicalZScores[historicalZScores.length - 1];
    const currentBand = Math.floor(Math.abs(currentZScore));

    let countInBand = 0;
    for (const score of historicalZScores) {
      if (Math.floor(Math.abs(score)) === currentBand) {
        countInBand++;
      }
    }

    const timeInBandPercent = (countInBand / historicalZScores.length) * 100;

    let severity: ZScoreSeverity = 'normal';
    if (timeInBandPercent <= 5) {
      severity = 'extreme';
    } else if (timeInBandPercent <= 20) {
      severity = 'high';
    } else if (timeInBandPercent <= 50) {
      severity = 'moderate';
    }

    return {
      severity,
      timeInBandPercent
    };
  };

  const calculateZScoreTimeSeries = (values: number[], dates: Date[], windowSize?: number): ZScoreTimeSeries => {
    const zScores: number[] = []
    const startIndex = windowSize ? Math.max(windowSize - 1, 0) : 0

    for (let i = startIndex; i < values.length; i++) {
      const dataset = windowSize ? values.slice(Math.max(0, i - windowSize + 1), i + 1) : values.slice(0, i + 1)
      const mean = dataset.reduce((a, b) => a + b) / dataset.length
      const variance = dataset.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / dataset.length
      const stdDev = Math.sqrt(variance)
      const zScore = stdDev === 0 ? 0 : (values[i] - mean) / stdDev
      zScores.push(zScore)
    }

    return {
      dates: dates.slice(startIndex),
      zScores,
      values: values.slice(startIndex)
    }
  }

  const analyzeMetricZScores = (metric: { 
    name: string, 
    values: number[], 
    fullHistoryValues: number[],
    dates: Date[],
    fullHistoryDates: Date[]
  }, id: string): MetricZScoreAnalysis | null => {
    if (metric.values.length === 0) return null

    // Full history analysis for each window
    const fourYearTimeSeries = calculateZScoreTimeSeries(metric.values, metric.dates, 365 * 4);
    const twoYearTimeSeries = calculateZScoreTimeSeries(metric.values, metric.dates, 365 * 2);
    const fullHistoryTimeSeries = calculateZScoreTimeSeries(metric.fullHistoryValues, metric.fullHistoryDates);

    const fourYearResult = calculateRarityAndSeverity(fourYearTimeSeries.zScores);
    const twoYearResult = calculateRarityAndSeverity(twoYearTimeSeries.zScores);
    const fullHistoryResult = calculateRarityAndSeverity(fullHistoryTimeSeries.zScores);

    const latestValue = metric.values[metric.values.length - 1]

    const windows = {
      fourYear: {
        value: latestValue,
        mean: 0, // Mean is always 0 for z-scores
        stdDev: 1, // StdDev is always 1 for z-scores
        zScore: fourYearTimeSeries.zScores[fourYearTimeSeries.zScores.length - 1],
        ...fourYearResult
      },
      twoYear: {
        value: latestValue,
        mean: 0,
        stdDev: 1,
        zScore: twoYearTimeSeries.zScores[twoYearTimeSeries.zScores.length - 1],
        ...twoYearResult
      },
      full: {
        value: latestValue,
        mean: 0,
        stdDev: 1,
        zScore: fullHistoryTimeSeries.zScores[fullHistoryTimeSeries.zScores.length - 1],
        ...fullHistoryResult
      }
    };

    const severities = [windows.fourYear.severity, windows.twoYear.severity, windows.full.severity];
    const severityOrder: Record<ZScoreSeverity, number> = { extreme: 4, high: 3, moderate: 2, normal: 1 };
    const maxSeverity = severities.reduce((max, current) => severityOrder[current] > severityOrder[max] ? current : max, 'normal');

    // Check if anomaly in all windows (moderate or higher)
    const isAnomalyInAllWindows = severities.every(s => severityOrder[s] >= 2)

    // Only include if at least one window shows moderate or higher
    if (maxSeverity === 'normal') return null

    return {
      id,
      name: metric.name,
      currentValue: latestValue,
      windows,
      timeSeries: {
        fourYear: fourYearTimeSeries,
        twoYear: twoYearTimeSeries,
        full: fullHistoryTimeSeries
      },
      description: generateZScoreDescription(metric.name, latestValue, windows.fourYear),
      maxSeverity,
      isAnomalyInAllWindows
    }
  }

  const generateZScoreDescription = (name: string, value: number, zResult: ZScoreResult): string => {
    const formatValue = (val: number, metricName: string) => {
      if (metricName.includes('Price')) {
        return `$${val.toLocaleString()}`
      } else if (metricName.includes('%')) {
        return `${val.toFixed(2)}%`
      } else if (val >= 1e12) {
        return `$${(val / 1e12).toFixed(2)}T`
      } else if (val >= 1e9) {
        return `$${(val / 1e9).toFixed(2)}B`
      } else if (val >= 1e6) {
        return `$${(val / 1e6).toFixed(2)}M`
      }
      return Math.round(val).toString();
    }

    const valueStr = formatValue(value, name);
    const zScoreStr = zResult.zScore.toFixed(2);
    const direction = zResult.zScore > 0 ? 'above' : 'below';
    const bandPercentStr = zResult.timeInBandPercent.toFixed(1);
    const band = Math.floor(Math.abs(zResult.zScore));

    return `${name} is ${valueStr}. Its Z-score of ${zScoreStr}σ is in a band (${band}σ-${band+1}σ) where it has historically spent only ${bandPercentStr}% of its time.`
  }

  const getSeverityColor = (severity: ZScoreSeverity) => {
    // This function is no longer used for styling borders, but kept for logic if needed elsewhere
    switch (severity) {
      case 'extreme':
        return 'border-red-500'
      case 'high':
        return 'border-yellow-500'
      case 'moderate':
        return 'border-blue-500'
      default:
        return 'border-gray-700'
    }
  }

  const getSeverityIcon = (severity: ZScoreSeverity) => {
    switch (severity) {
      case 'extreme': return <AlertTriangle className="h-4 w-4" />
      case 'high': return <Zap className="h-4 w-4" />
      case 'moderate': return <Target className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getWindowSummary = (window: keyof MetricZScoreAnalysis['windows']): WindowSummary => {
    const results = analyses.map(a => a.windows[window].severity)
    return {
      total: results.length,
      extreme: results.filter(s => s === 'extreme').length,
      high: results.filter(s => s === 'high').length,
      moderate: results.filter(s => s === 'moderate').length
    }
  }

  const getFilteredAnalyses = () => {
    switch (filterMode) {
      case 'all':
        return analyses
      case 'allWindows':
        return analyses.filter(a => a.isAnomalyInAllWindows)
      case 'cycleSpecific':
        return analyses.filter(a => 
          a.windows.fourYear.severity !== 'normal' && 
          a.windows.full.severity === 'normal'
        )
      default:
        return analyses
    }
  }

  useEffect(() => {
    // This effect runs after the component renders and charts are available.
    // It's responsible for calculating the position of the pulsing dot.
    const newPulsePositions: { [key: string]: { x: number, y: number } } = {};
    
    getFilteredAnalyses().forEach(analysis => {
      const chart = chartRefs.current[analysis.id];
      if (chart && chart.getDatasetMeta(0)?.data?.length > 0) {
        const meta = chart.getDatasetMeta(0);
        const lastDataPoint = meta.data[meta.data.length - 1];
        if (lastDataPoint) {
          newPulsePositions[analysis.id] = { x: lastDataPoint.x, y: lastDataPoint.y };
        }
      }
    });

    setPulsePositions(newPulsePositions);
  }, [analyses, filterMode, activeWindow]); // Rerun when data or window changes

  const createZScoreChartData = (analysis: MetricZScoreAnalysis, window: AnalysisWindow) => {
    const timeSeries = analysis.timeSeries[windowMap[window]]
    const currentZScore = analysis.windows[windowMap[window]].zScore
    return {
      labels: timeSeries.dates,
      datasets: [
        {
          label: 'Z-Score',
          data: timeSeries.zScores,
          borderColor: '#3b82f6',
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.4,
        },
        {
          label: 'Current',
          data: timeSeries.dates.map(() => currentZScore),
          borderColor: '#ffffff',
          borderWidth: 1,
          borderDash: [2, 2],
          pointRadius: 0,
        },
      ],
    }
  }

  const createZScoreChartOptions = (zScores: number[]): ChartOptions<'line'> => {
    const dataMin = Math.min(...zScores);
    const dataMax = Math.max(...zScores);
    const padding = (dataMax - dataMin) * 0.15; // 15% padding

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderWidth: 0,
          callbacks: {
            label: function(context: any) {
              const label = context.dataset.label || ''
              if (label === 'Z-Score') {
                return `Z-Score: ${context.parsed.y.toFixed(2)}σ`
              }
              return '' // Hide other labels
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          display: false,
        },
        y: {
          min: dataMin - padding,
          max: dataMax + padding,
          grid: {
            color: '#374151',
          },
          ticks: {
            color: '#9ca3af',
            callback: function(value: string | number) {
              return `${Number(value).toFixed(0)}σ`
            }
          },
          afterBuildTicks: (axis: Scale) => {
            const ticks = [];
            const min = Math.floor(axis.min);
            const max = Math.ceil(axis.max);
            for (let i = min; i <= max; i++) {
              ticks.push({ value: i });
            }
            axis.ticks = ticks;
          }
        }
      }
    }
  }

  const handleShare = async (metricId: string, metricName: string) => {
    if (!user) {
      alert("Please log in with your Nostr extension to share.")
      return
    }

    const cardElement = metricCardRefs.current[metricId]
    if (!cardElement) {
      console.error("Card element not found for sharing.")
      alert("An error occurred: Component reference not found for sharing.")
      return
    }

    const chart = chartRefs.current[metricId];
    // Temporarily disable animations for a stable capture
    if (chart) {
      chart.options.animation = false;
      chart.update('none');
    }

    try {
      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#111827', // The original dark background
        useCORS: true,
        allowTaint: true // This can help with rendering external/complex elements
      });
      
      const imageUrl = canvas.toDataURL('image/png');

      // TODO: Replace placeholder with a real image upload service
      const uploadedImageUrl = "https://clarion-chain.com/placeholder.png"; 

      const noteContent = `Check out this Bitcoin metric analysis from ClarionChain:\n\n${metricName}\n\n${uploadedImageUrl}\n\n#Bitcoin #OnChain #ClarionChain`;

      const eventId = await publish(noteContent);

      if (eventId) {
        alert(`Successfully shared analysis! Event ID: ${eventId}`);
      } else {
        alert(`Failed to share. Please check your Nostr extension. ${error || ''}`);
      }
    } catch (e) {
      console.error("Sharing failed during canvas capture:", e);
      alert("An error occurred while trying to capture the chart image.");
    } finally {
      // Re-enable animations after the process
      if (chart) {
        chart.options.animation = {};
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Dynamics" description="Multi-window Z-score anomaly detection for Bitcoin metrics">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Analyzing metrics across time windows...</div>
        </div>
      </DashboardLayout>
    )
  }

  const filteredAnalyses = getFilteredAnalyses()
  const fourYearSummary = getWindowSummary('fourYear')
  const twoYearSummary = getWindowSummary('twoYear')
  const fullHistorySummary = getWindowSummary('full')

  return (
    <DashboardLayout title="Dynamics" description="Multi-window Z-score anomaly detection for Bitcoin metrics">
      <div className="space-y-6">
        {/* Configuration Panel */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant={activeWindow === '4year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveWindow('4year')}
            >
              4-Year Cycle
            </Button>
            <Button
              variant={activeWindow === '2year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveWindow('2year')}
            >
              2-Year Trend
            </Button>
            <Button
              variant={activeWindow === 'full' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveWindow('full')}
            >
              Full History
            </Button>
          </div>
          
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={filterMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMode('all')}
            >
              All
            </Button>
            <Button
              variant={filterMode === 'allWindows' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMode('allWindows')}
            >
              All Windows
            </Button>
            <Button
              variant={filterMode === 'cycleSpecific' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterMode('cycleSpecific')}
            >
              Cycle-Specific
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                4-Year Cycle
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fourYearSummary.total} anomalies</div>
              <p className="text-xs text-muted-foreground">
                {fourYearSummary.extreme} extreme, {fourYearSummary.high} high
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                2-Year Trend
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{twoYearSummary.total} anomalies</div>
              <p className="text-xs text-muted-foreground">
                {twoYearSummary.extreme} extreme, {twoYearSummary.high} high
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Full History
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fullHistorySummary.total} anomalies</div>
              <p className="text-xs text-muted-foreground">
                {fullHistorySummary.extreme} extreme, {fullHistorySummary.high} high
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Last Update
                <Info className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lastUpdate.toLocaleTimeString()}</div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredAnalyses.length} of {analyses.length} metrics
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Anomalies List */}
        {filteredAnalyses.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Anomalies Found</h3>
              <p className="text-muted-foreground">
                No metrics match the current filter criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredAnalyses.map((analysis) => {
              const windowResult = analysis.windows[windowMap[activeWindow]]
              if (!analysis) return null
              return (
                <Card
                  key={analysis.id}
                  ref={(el: HTMLDivElement | null) => {
                    if (metricCardRefs.current) {
                      metricCardRefs.current[analysis.id] = el
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg border border-gray-700">
                            {getSeverityIcon(analysis.maxSeverity)}
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {analysis.name}
                            </CardTitle>
                            <CardDescription>{analysis.description}</CardDescription>
                          </div>
                        </div>
                      </div>
                      {user && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-800 hover:bg-gray-700"
                        onClick={() => handleShare(analysis.id, analysis.name)}
                        disabled={isPublishing}
                      >
                        {isPublishing ? "Sharing..." : "Share"}
                      </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                      {/* Window Analysis - Left Side */}
                      <div className="lg:col-span-2">
                        <div className="rounded-lg bg-card">
                          <div className="space-y-2">
                            {/* 4-Year Window */}
                            <div
                              className={`flex items-center p-2 rounded cursor-pointer transition-colors hover:bg-muted/50 gap-4 ${activeWindow === '4year' ? 'bg-blue-500/10' : ''}`}
                              onClick={() => setActiveWindow('4year')}
                            >
                              <p className="text-xs font-medium w-12 text-left">4-Year</p>
                              <Badge variant="secondary" className="text-xs">
                                {analysis.windows.fourYear.zScore.toFixed(1)}σ
                              </Badge>
                              <p className="text-xs text-muted-foreground capitalize">
                                {analysis.windows.fourYear.severity}
                              </p>
                            </div>

                            {/* 2-Year Window */}
                            <div
                              className={`flex items-center p-2 rounded cursor-pointer transition-colors hover:bg-muted/50 gap-4 ${activeWindow === '2year' ? 'bg-blue-500/10' : ''}`}
                              onClick={() => setActiveWindow('2year')}
                            >
                              <p className="text-xs font-medium w-12 text-left">2-Year</p>
                              <Badge variant="secondary" className="text-xs">
                                {analysis.windows.twoYear.zScore.toFixed(1)}σ
                              </Badge>
                              <p className="text-xs text-muted-foreground capitalize">
                                {analysis.windows.twoYear.severity}
                              </p>
                            </div>

                            {/* 2015+ Window */}
                            <div
                              className={`flex items-center p-2 rounded cursor-pointer transition-colors hover:bg-muted/50 gap-4 ${activeWindow === 'full' ? 'bg-blue-500/10' : ''}`}
                              onClick={() => setActiveWindow('full')}
                            >
                              <p className="text-xs font-medium w-12 text-left">Full</p>
                              <Badge variant="secondary" className="text-xs">
                                {analysis.windows.full.zScore.toFixed(1)}σ
                              </Badge>
                              <p className="text-xs text-muted-foreground capitalize">
                                {analysis.windows.full.severity}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Z-Score Chart - Right Side with More Height */}
                      <div className="lg:col-span-4 relative">
                        <div className="h-48 w-full">
                          <ChartJSLine
                            ref={el => chartRefs.current[analysis.id] = el as ChartJS<'line', number[], string | Date> | null}
                            data={createZScoreChartData(analysis, activeWindow)}
                            options={createZScoreChartOptions(analysis.timeSeries[windowMap[activeWindow]].zScores)}
                          />
                        </div>
                        {pulsePositions[analysis.id] && (
                        <div
                          // Uses custom `pulse-dot` animation from globals.css, not Tailwind's `animate-pulse`.
                          className="absolute rounded-full w-3 h-3 bg-blue-400 pulse-dot pointer-events-none"
                          style={{ 
                            left: pulsePositions[analysis.id]!.x, 
                            top: pulsePositions[analysis.id]!.y,
                            transform: 'translate(-50%, -50%)'
                          }}
                        ></div>
                        )}
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          {activeWindow === '4year' ? '4-Year' : activeWindow === '2year' ? '2-Year' : 'Full History'} Z-Score
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 