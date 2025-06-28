"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as Slider from '@radix-ui/react-slider'

import { Brain, Settings, Send, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import BitcoinChartJS, { BitcoinChartRef } from "@/components/bitcoin-chart-chartjs"

// Define trace visibility types
const TRACE_KEYS = [
  'price', 'ma200', 'realizedPrice', 'trueMarketMean',
  'mayer', 'priceRealized', 'priceTrueMean'
] as const

type TraceKey = typeof TRACE_KEYS[number]
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import dynamic from 'next/dynamic'
import { getTrackBackground } from 'react-range';
import { Range } from 'react-range';

type MetricType = 'mvrv' | 'price' | 'volume' | 'onchain'

// Dynamically import PlotlyMVRVTemplate for AI Workbench use
const PlotlyMVRVTemplateDashboard = dynamic(() => import('@/components/PlotlyMVRVTemplate'), { ssr: false })

export default function AIAnalysisPage() {
  const [apiKey, setApiKey] = useState("")
  const [provider, setProvider] = useState("openai")
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('price')

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [followUpInput, setFollowUpInput] = useState("")
  const chartRef = useRef<BitcoinChartRef>(null)
  const [range, setRange] = useState<[number, number]>([0, 100])
  const [dataLength, setDataLength] = useState(0)
  
  // Shared trace visibility state for both chart instances
  const [visibleTraces, setVisibleTraces] = useState<Record<TraceKey, boolean>>({
    price: true,
    ma200: true,
    realizedPrice: true,
    trueMarketMean: true,
    mayer: true,
    priceRealized: false,
    priceTrueMean: false
  })

  // MVRV Ratio Plotly panel state for AI Workbench
  const [plotlyDates, setPlotlyDates] = useState<string[]>([]);
  const [plotlyRange, setPlotlyRange] = useState<[number, number] | null>(null);
  useEffect(() => {
    async function fetchPlotly() {
      try {
        const [marketArr, realizedArr] = await Promise.all([
          fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-marketcap?from=-10000').then(r => r.json()),
          fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-realized-cap?from=-10000').then(r => r.json()),
        ]);
        const n = Math.min(marketArr.length, realizedArr.length);
        const genesisDate = new Date('2009-01-03');
        const dateLabels = Array.from({ length: n }, (_, i) => {
          const d = new Date(genesisDate);
          d.setDate(d.getDate() + i);
          return d.toISOString().split('T')[0];
        });
        const jan2012Idx = dateLabels.findIndex(d => d >= '2012-01-01');
        setPlotlyDates(dateLabels);
        setPlotlyRange([jan2012Idx !== -1 ? jan2012Idx : 0, n - 1]);
      } catch (e) {
        setPlotlyDates([]);
        setPlotlyRange(null);
      }
    }
    fetchPlotly();
  }, []);

  // Reset range when dataLength changes
  useEffect(() => {
    if (dataLength > 0) {
      setRange([0, dataLength - 1])
    }
  }, [dataLength])

  const handleDataLengthChange = (len: number) => {
    setDataLength(len)
  }
  
  const handleTraceToggle = (key: TraceKey) => {
    setVisibleTraces(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const analyzeChart = async () => {
    if (!apiKey || !chartRef.current) return

    setIsAnalyzing(true)
    
    try {
      // Capture chart image
      const imageData = await chartRef.current.captureImage()
      
      // Send to API
      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          apiKey,
          prompt: "Analyze this Bitcoin on-chain chart and provide insights."
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed')
      }

      // Add messages to chat
      const userMessage = { role: 'user' as const, content: 'Analyze the current chart data' }
      const assistantMessage = { role: 'assistant' as const, content: result.analysis }
      
      setMessages([userMessage, assistantMessage])

    } catch (error: unknown) {
      console.error('Analysis error:', error)
      const errorMessage = { 
        role: 'assistant' as const, 
        content: `Error: ${(error as Error).message || 'Failed to analyze chart. Please check your API key and try again.'}` 
      }
      setMessages([{ role: 'user' as const, content: 'Analyze the current chart data' }, errorMessage])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sendFollowUp = async () => {
    if (!followUpInput.trim() || !apiKey || isAnalyzing) return

    const userMessage = { role: 'user' as const, content: followUpInput }
    setMessages(prev => [...prev, userMessage])
    setFollowUpInput("")
    setIsAnalyzing(true)

    try {
      // For follow-up questions, we can send the chart image again with the conversation context
      const imageData = await chartRef.current?.captureImage()
      
      const conversationContext = messages.map(m => `${m.role}: ${m.content}`).join('\n')
      const prompt = `Previous conversation:\n${conversationContext}\n\nUser's follow-up question: ${followUpInput}\n\nPlease respond to the follow-up question in the context of the chart and previous conversation.`

      const response = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          apiKey,
          prompt
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed')
      }

      const assistantMessage = { role: 'assistant' as const, content: result.analysis }
      setMessages(prev => [...prev, assistantMessage])

    } catch (error: unknown) {
      console.error('Follow-up error:', error)
      const errorMessage = { 
        role: 'assistant' as const, 
        content: `Error: ${(error as Error).message || 'Failed to process follow-up question.'}` 
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <DashboardLayout 
      title="AI Workbench"
    >
      <PanelGroup direction="vertical" className="h-screen min-h-0 w-full">
        <Panel defaultSize={90} minSize={20} maxSize={100} className="flex flex-col min-h-0">
          <PanelGroup direction="horizontal" className="w-full h-full min-h-0 rounded-md overflow-hidden">
            <Panel defaultSize={66.66} minSize={20} maxSize={90} className="flex flex-col h-full min-h-0">
              <Card className="border-border w-full h-full flex flex-col min-h-0">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Workbench
                    </CardTitle>
                    <Select value={selectedMetric} onValueChange={(value: string) => setSelectedMetric(value as MetricType)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="mvrv">MVRV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-6 min-w-0 flex-1 min-h-0 flex flex-col">
                  <PanelGroup direction="vertical" className="flex-1 min-h-0 w-full">
                    <Panel defaultSize={60} minSize={20} maxSize={90} className="flex flex-col min-h-0">
                      <BitcoinChartJS 
                        ref={chartRef} 
                        selectedMetric={selectedMetric} 
                        chartSection="main" 
                        range={range} 
                        onDataLengthChange={handleDataLengthChange}
                        visibleTraces={visibleTraces}
                        onTraceToggle={handleTraceToggle}
                      />
                    </Panel>
                    <PanelResizeHandle className="bg-[#222] hover:bg-[#444] transition-colors duration-150 h-1 w-full cursor-row-resize" />
                    <Panel defaultSize={40} minSize={10} maxSize={80} className="flex flex-col min-h-0">
                      <BitcoinChartJS 
                        selectedMetric={selectedMetric} 
                        chartSection="ratio" 
                        range={range} 
                        onDataLengthChange={handleDataLengthChange}
                        visibleTraces={visibleTraces}
                        onTraceToggle={handleTraceToggle}
                      />
                    </Panel>
                  </PanelGroup>
                  <div className="w-full flex justify-center items-center pb-2 pt-1">
                    <Slider.Root
                      className="relative flex items-center w-[90%] h-4"
                      min={0}
                      max={Math.max(0, dataLength - 1)}
                      step={1}
                      value={range}
                      onValueChange={(v: number[]) => setRange([v[0], v[1]])}
                      minStepsBetweenThumbs={1}
                    >
                      <Slider.Track className="bg-[#333] relative flex-1 h-[2px] rounded-full">
                        <Slider.Range className="absolute bg-[#666] h-full rounded-full" />
                      </Slider.Track>
                      <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow focus:outline-none" />
                      <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow focus:outline-none" />
                    </Slider.Root>
                  </div>
                </CardContent>
              </Card>
            </Panel>
            <PanelResizeHandle className="bg-[#222] hover:bg-[#444] transition-colors duration-150 w-1 cursor-col-resize" />
            <Panel defaultSize={33.34} minSize={10} maxSize={80} className="flex flex-col h-full min-h-0">
              <Card className="border-border flex flex-col w-full h-full min-h-0">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-orange-500" />
                      <CardTitle>AI</CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={provider} onValueChange={setProvider}>
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <Settings className="h-3 w-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        type="password"
                        placeholder="API Key"
                        className="w-32 h-7 text-xs"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                      
                      <Button 
                        size="sm"
                        disabled={!apiKey || isAnalyzing}
                        onClick={analyzeChart}
                        className="h-7 px-3"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Analyze"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0">
                  <div className="flex flex-col h-full space-y-4">
                    {/* Chat Messages Area - Now expands to fill available space */}
                    <div className="border rounded-md p-4 flex-1 overflow-y-auto bg-muted/20">
                      {messages.length > 0 ? (
                        <div className="space-y-4">
                          {messages.map((message, index) => (
                            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`rounded-lg px-3 py-2 max-w-[80%] ${
                                message.role === 'user' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                            </div>
                          ))}
                          {isAnalyzing && (
                            <div className="flex justify-start">
                              <div className="bg-muted rounded-lg px-3 py-2">
                                <div className="flex items-center gap-1">
                                  <Brain className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <p className="text-sm">AI conversation will appear here...</p>
                        </div>
                      )}
                    </div>

                    {/* Chat Input Area - Fixed at bottom */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask a follow-up question about the analysis..."
                        className="flex-1"
                        value={followUpInput}
                        onChange={(e) => setFollowUpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendFollowUp()
                          }
                        }}
                        disabled={messages.length === 0 || isAnalyzing}
                      />
                      <Button 
                        size="sm" 
                        onClick={sendFollowUp}
                        disabled={messages.length === 0 || isAnalyzing || !followUpInput.trim()}
                      >
                        {isAnalyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="bg-[#222] hover:bg-[#444] transition-colors duration-150 h-1 w-full cursor-row-resize" />
        <Panel defaultSize={10} minSize={0} maxSize={80} className="min-h-0" />
      </PanelGroup>
      {/* Plotly MVRV Ratio Panel: full width below main workbench */}
      <div className="w-full mb-8" style={{ background: '#000', border: '1px solid #1f78c1', borderRadius: 12 }}>
        <div className="flex flex-row items-center mt-4 ml-8">
          <img
            src="/clarion_chain_logo.png"
            alt="Brand Logo"
            className="h-8 w-8 mr-3"
            style={{ display: 'inline-block' }}
          />
          <span className="text-white text-xl font-semibold align-middle">Plotly : MVRV Ratio</span>
        </div>
        <div className="w-full" style={{ height: 800, minHeight: 0 }}>
          {plotlyRange && plotlyDates.length > 0 && (
            <PlotlyMVRVTemplateDashboard height={800} width="100%" range={plotlyRange} dates={plotlyDates} />
          )}
        </div>
        {/* Slider at the bottom center of the parent panel */}
        <div className="w-full flex flex-row justify-center pb-8">
          {plotlyRange && plotlyDates.length > 0 && (
            <TimeSliderWrapper
              range={plotlyRange}
              setRange={setPlotlyRange}
              min={0}
              max={plotlyDates.length - 1}
              dates={plotlyDates}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

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
                  height: '13.2px',
                  width: '13.2px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  boxShadow: 'none',
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