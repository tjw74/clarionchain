"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, TimeScale, PointElement, LineElement, Title, Tooltip, Filler, Legend } from "chart.js"
import 'chartjs-adapter-date-fns'

const ChartJSLine = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), { ssr: false })
const PlotlyMVRVTemplate = dynamic(() => import('@/components/PlotlyMVRVTemplate'), { ssr: false })

if (typeof window !== "undefined") {
  ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, TimeScale, PointElement, LineElement, Title, Tooltip, Filler, Legend)
}

export default function TemplatesPage() {
  const [btcData, setBtcData] = useState<{ labels: string[]; prices: number[] }>({ labels: [], prices: [] })

  useEffect(() => {
    async function fetchBTC() {
      const res = await fetch("https://brk.openonchain.dev/api/vecs/dateindex-to-ohlc?from=-10000")
      const raw = await res.json()
      // The endpoint returns an array of [open, high, low, close] arrays
      // We'll use the close price and generate a date label for each
      const prices = raw.map((arr: number[]) => arr[3])
      const startDate = new Date('2012-01-01')
      const labels = prices.map((_: any, i: number) => {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i)
        return d.toISOString().slice(0, 10)
      })
      setBtcData({ labels, prices })
    }
    fetchBTC()
  }, [])

  // Prepare data for time scale: generate date labels from Jan 1, 2012
  const startYear = 2012;
  const filteredLabels = btcData.labels

  return (
    <DashboardLayout title="Templates" description="Central repository for Chart.js panel templates.">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] w-full">
        {/* Plotly MVRV Template Panel */}
        <Card className="w-full max-w-5xl mb-8 h-[700px] shadow-lg border border-border bg-muted/10 flex flex-col justify-center items-center">
          <CardContent className="flex-1 flex flex-col justify-center items-center w-full h-full relative">
            <PlotlyMVRVTemplate height={600} width={"100%"} />
          </CardContent>
        </Card>
        <Card className="w-full max-w-5xl h-[600px] shadow-lg border border-border bg-muted/10 flex flex-col justify-center items-center">
          <CardContent className="flex-1 flex flex-col justify-center items-center w-full h-full relative">
            <div className="w-full h-[480px]">
              <ChartJSLine
                data={{
                  labels: btcData.labels,
                  datasets: [
                    {
                      label: "BTC Price",
                      data: btcData.prices,
                      borderColor: "#3b82f6",
                      backgroundColor: "rgba(59,130,246,0.2)",
                      tension: 0.1,
                      borderWidth: 1,
                      pointRadius: 0,
                      fill: false,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      titleColor: '#ffffff',
                      bodyColor: '#ffffff',
                      borderWidth: 0,
                    },
                  },
                  scales: {
                    x: {
                      type: 'time',
                      time: {
                        unit: 'year',
                        displayFormats: { year: 'yyyy' },
                        tooltipFormat: 'yyyy-MM-dd',
                      },
                      grid: { color: '#374151' },
                      ticks: {
                        color: '#9ca3af',
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12,
                      },
                    },
                    y: {
                      type: 'logarithmic',
                      position: 'right',
                      grid: { color: '#374151' },
                      ticks: {
                        color: '#9ca3af',
                        callback: function(value) {
                          const v = Number(value);
                          if (v >= 1e9) return `$${(v / 1e9).toFixed(2).replace(/\.00$/, '')}B`;
                          if (v >= 1e6) return `$${(v / 1e6).toFixed(2).replace(/\.00$/, '')}M`;
                          if (v >= 1e3) return `$${(v / 1e3).toFixed(2).replace(/\.00$/, '')}K`;
                          return `$${v}`;
                        },
                        maxTicksLimit: 8,
                      },
                      afterBuildTicks: axis => {
                        // log2 ticks, ensure trace is fully visible
                        const prices = btcData.prices.filter(v => v > 0);
                        if (!prices.length) return;
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        const log2Min = Math.floor(Math.log2(minPrice));
                        const log2Max = Math.ceil(Math.log2(maxPrice * 1.1));
                        const ticks = [];
                        for (let v = Math.pow(2, log2Min); v <= Math.pow(2, log2Max); v *= 2) {
                          ticks.push(v);
                        }
                        axis.ticks = ticks.map(value => ({ value }));
                      },
                    },
                  },
                  layout: { padding: 0 },
                  backgroundColor: "#181c23",
                }}
                height={400}
              />
            </div>
            {/* Custom Legend */}
            <div className="absolute bottom-4 right-6 flex flex-row gap-6 items-center bg-transparent z-10">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></span>
                <span className="text-white text-sm">Series A</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }}></span>
                <span className="text-white text-sm">Series B</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 