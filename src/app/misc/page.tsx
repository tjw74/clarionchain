"use client"

import { useEffect, useState, useMemo } from "react"
import { format } from 'date-fns'
import DashboardLayout from "@/components/dashboard-layout"
import { brkClient } from "@/lib/api/brkClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function MiscPage() {
  const [priceData, setPriceData] = useState<Array<{ date: string; price: number }>>([])

  useEffect(() => {
    async function fetchData() {
      // Fetch full history since Jan 1, 2012
      const today = new Date()
      const jan2012 = new Date('2012-01-01')
      const days = Math.floor((today.getTime() - jan2012.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const closePrices = await brkClient.fetchDailyCloseHistory(days)
      const data = closePrices.map((price, i) => {
        const date = new Date(jan2012)
        date.setDate(jan2012.getDate() + i)
        return {
          date: date.toISOString().split("T")[0],
          price,
        }
      })
      setPriceData(data)
    }
    fetchData()
  }, [])

  // Custom log tick generation (Grafana style: powers of 2)
  const { logTicks, paddedDomain } = useMemo(() => {
    if (!priceData.length) return { logTicks: [], paddedDomain: [2, 131072] }
    const values = priceData.map(d => d.price).filter(v => v > 0)
    if (!values.length) return { logTicks: [], paddedDomain: [2, 131072] }
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    // Find nearest powers of 2
    const minPow = Math.floor(Math.log2(minVal))
    const maxPow = Math.ceil(Math.log2(maxVal))
    // Add 1 extra tick below and above for padding
    const startPow = Math.max(1, minPow - 1)
    const endPow = maxPow + 1
    const ticks = []
    for (let p = startPow; p <= endPow; p++) {
      ticks.push(Math.pow(2, p))
    }
    const paddedDomain = [Math.pow(2, startPow), Math.pow(2, endPow)]
    return { logTicks: ticks, paddedDomain }
  }, [priceData])

  // Grafana-style short formatter (3 significant digits, K for thousands)
  function formatGrafanaShort(v: number) {
    if (v >= 1e6) return `$${(v / 1e6).toPrecision(3)}M`
    if (v >= 1e3) return `$${(v / 1e3).toPrecision(3)}K`
    if (v >= 1) return `$${v.toPrecision(3)}`
    return `$${v}`
  }

  return (
    <DashboardLayout title="Misc">
      <Card>
        <CardHeader>
          <CardTitle>BTC Close Price (Full History)</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 520 }}>
            <ResponsiveContainer width="100%" height={520}>
              <LineChart data={priceData} margin={{ left: 16, right: 16, top: 16, bottom: 16 }}>
                <CartesianGrid strokeDasharray="" stroke="#374151" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} minTickGap={32} tickFormatter={date => {
                  // date is in YYYY-MM-DD format
                  return date.slice(0, 4)
                }} />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#9ca3af' }} 
                  tickFormatter={formatGrafanaShort}
                  orientation="right"
                  scale="log"
                  domain={paddedDomain}
                  ticks={logTicks}
                  allowDataOverflow={true}
                  type="number"
                />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} contentStyle={{ background: '#1e293b', color: '#fff', border: 0 }} />
                <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
} 