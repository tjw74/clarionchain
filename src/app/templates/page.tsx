"use client"

import React from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, TimeScale, PointElement, LineElement, Title, Tooltip, Filler, Legend } from "chart.js"
import 'chartjs-adapter-date-fns'
import { Range, getTrackBackground } from 'react-range'

const ChartJSLine = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), { ssr: false })
const PlotlyMVRVTemplate = dynamic(() => import('@/components/PlotlyMVRVTemplate'), { ssr: false })

if (typeof window !== "undefined") {
  ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, TimeScale, PointElement, LineElement, Title, Tooltip, Filler, Legend)
}

export default function TemplatesPage() {
  const [btcData, setBtcData] = useState<{ labels: string[]; prices: number[] }>({ labels: [], prices: [] })
  const [plotlyData, setPlotlyData] = useState<any[]>([])
  const [plotlyDates, setPlotlyDates] = useState<string[]>([])
  const [plotlyLoading, setPlotlyLoading] = useState(true)
  const [plotlyError, setPlotlyError] = useState<string | null>(null)
  const [range, setRange] = useState<[number, number] | null>(null)

  useEffect(() => {
    async function fetchBTC() {
      const res = await fetch("https://brk.openonchain.dev/api/vecs/dateindex-to-ohlc?from=-10000")
      const raw = await res.json()
      const prices = raw.map((arr: number[]) => arr[3])
      const startDate = new Date('2012-01-01')
      const labels = prices.map((_: any, i: number) => {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i)
        return d.toISOString().slice(0, 10)
      })
      setBtcData({ labels, prices })
    }
    async function fetchPlotly() {
      setPlotlyLoading(true)
      setPlotlyError(null)
      try {
        const [marketArr, realizedArr] = await Promise.all([
          fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-marketcap?from=-10000').then(r => r.json()),
          fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-realized-cap?from=-10000').then(r => r.json()),
        ])
        const n = Math.min(marketArr.length, realizedArr.length)
        const genesisDate = new Date('2009-01-03')
        const dateLabels = Array.from({ length: n }, (_, i) => {
          const d = new Date(genesisDate)
          d.setDate(d.getDate() + i)
          return d.toISOString().slice(0, 10)
        })
        const jan2012Idx = dateLabels.findIndex(d => d >= '2012-01-01')
        const mvrvArr = Array.from({ length: n }, (_, i) => {
          const mv = marketArr[i]
          const rv = realizedArr[i]
          return (typeof mv === 'number' && typeof rv === 'number' && rv !== 0) ? mv / rv : null
        })
        setPlotlyDates(dateLabels)
        setPlotlyData([
          { y: marketArr, name: 'Market Value', color: '#3b82f6' },
          { y: realizedArr, name: 'Realized Value', color: '#fbbf24' },
          { y: mvrvArr, name: 'MVRV Ratio', color: '#ffffff' },
        ])
        setRange([jan2012Idx !== -1 ? jan2012Idx : 0, n - 1])
        setPlotlyLoading(false)
      } catch (e) {
        setPlotlyError('Failed to load data')
        setPlotlyLoading(false)
      }
    }
    fetchBTC()
    fetchPlotly()
  }, [])

  // Prepare data for time scale: generate date labels from Jan 1, 2012
  const startYear = 2012;
  const filteredLabels = btcData.labels

  return (
    <DashboardLayout title="Templates" description="Central repository for Chart.js panel templates.">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] w-full" style={{ marginTop: '64px' }}>
        {/* Plotly MVRV Template Panel */}
        <Card className="w-full max-w-7xl mb-8 h-[900px] shadow-lg border border-border flex flex-col justify-center items-center" style={{ background: '#000' }}>
          <CardContent className="flex flex-col w-full h-full relative bg-black">
            {/* Title, upper left */}
            <div className="w-full flex flex-row items-center mt-4 ml-8">
              <img
                src="/clarion_chain_logo.png"
                alt="Brand Logo"
                className="h-8 w-8 mr-3"
                style={{ display: 'inline-block' }}
              />
              <span className="text-white text-xl font-semibold align-middle">Plotly : MVRV Ratio</span>
            </div>
            {/* Chart takes all available space above */}
            <div className="w-full h-[800px] flex flex-col mt-4" style={{ minHeight: 0 }}>
              {!plotlyLoading && !plotlyError && range && plotlyDates.length > 0 && plotlyData.length > 0 && (
                <PlotlyMVRVTemplate
                  height={800}
                  width="100%"
                  range={range}
                  dates={plotlyDates}
                />
              )}
              {plotlyLoading && <div className="w-full h-[400px] flex items-center justify-center text-white">Loading chart…</div>}
              {plotlyError && <div className="w-full h-[400px] flex items-center justify-center text-red-400">{plotlyError}</div>}
            </div>
          </CardContent>
          {/* Slider at the bottom center of the parent panel */}
          <div className="w-full flex flex-row justify-center pb-8">
            {range && plotlyDates.length > 0 && (
              <TimeSliderWrapper
                range={range}
                setRange={setRange}
                min={0}
                max={plotlyDates.length - 1}
                dates={plotlyDates}
              />
            )}
          </div>
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

// TimeSliderWrapper now renders the slider UI
function TimeSliderWrapper({ range, setRange, min, max, dates }: { range: [number, number], setRange: (r: [number, number]) => void, min: number, max: number, dates: string[] }) {
  return (
    <div className="w-full flex flex-col items-center justify-center mt-2 mb-2">
      <div style={{ width: '90%' }}>
        <Range
          values={range}
          step={1}
          min={min}
          max={max}
          onChange={(vals: number[]) => setRange([vals[0], vals[1]])}
          renderTrack={({ props, children }: { props: React.HTMLAttributes<HTMLDivElement>; children: React.ReactNode }) => (
            <div
              {...props}
              style={{
                ...props.style,
                height: '1.44px',
                width: '100%',
                background: getTrackBackground({
                  values: range,
                  colors: ['#222', '#3b82f6', '#222'],
                  min,
                  max,
                }),
                borderRadius: '4px',
              }}
            >
              {children}
            </div>
          )}
          renderThumb={({ props }: { props: any }) => {
            const { key, ...rest } = props;
            return (
              <div
                key={key}
                {...rest}
                style={{
                  ...rest.style,
                  height: '22px',
                  width: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  border: '2px solid #3b82f6',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                }}
              />
            );
          }}
        />
      </div>
    </div>
  )
} 