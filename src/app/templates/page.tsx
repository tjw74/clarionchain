"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend } from "chart.js"

const ChartJSLine = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), { ssr: false })

if (typeof window !== "undefined") {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend)
}

export default function TemplatesPage() {
  const [btcData, setBtcData] = useState<{ labels: string[]; prices: number[] }>({ labels: [], prices: [] })

  useEffect(() => {
    async function fetchBTC() {
      const res = await fetch("https://brk.openonchain.dev/api/vecs/dateindex-to-ohlc?from=-10000")
      const raw = await res.json()
      // The endpoint returns an array of [open, high, low, close] arrays
      // We'll use the close price and generate a label for each (index as fallback)
      const prices = raw.map((arr: number[]) => arr[3])
      const labels = raw.map((_: any, i: number) => i.toString())
      setBtcData({ labels, prices })
    }
    fetchBTC()
  }, [])

  return (
    <DashboardLayout title="Templates" description="Central repository for Chart.js panel templates.">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] w-full">
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
                      tension: 0.2,
                      borderWidth: 1,
                      pointRadius: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      display: false, 
                    },
                    title: { display: false },
                  },
                  scales: {
                    x: {
                      grid: { color: 'rgba(120,120,120,0.15)' },
                      ticks: { color: '#bcbcbc' },
                    },
                    y: {
                      type: 'linear' as const,
                      position: 'right',
                      grid: { color: 'rgba(120,120,120,0.15)' },
                      ticks: { color: '#bcbcbc' },
                    },
                  },
                  layout: { padding: 0 },
                  backgroundColor: "#181c23",
                }}
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