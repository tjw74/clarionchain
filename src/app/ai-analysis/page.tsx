"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Brain, Settings, Send, Loader2 } from "lucide-react"
import { useState, useRef } from "react"
import BitcoinChart, { BitcoinChartRef } from "@/components/bitcoin-chart"

export default function AIAnalysisPage() {
  const [apiKey, setApiKey] = useState("")
  const [provider, setProvider] = useState("openai")

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [followUpInput, setFollowUpInput] = useState("")
  const chartRef = useRef<BitcoinChartRef>(null)

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
      title="AI Analysis"
      description="AI-powered insights and analysis of Bitcoin on-chain data"
    >
      <div className="space-y-6">
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Workbench
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BitcoinChart ref={chartRef} />
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  <CardTitle>AI Analysis</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="provider" className="text-sm font-medium">Provider:</Label>
                                      <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger className="w-52">
                        <SelectValue value={provider} placeholder="Select" />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI - GPT-4.1</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="apiKey" className="text-sm font-medium">API Key:</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter key"
                    className="w-40"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <Button 
                  disabled={!apiKey || isAnalyzing}
                  onClick={analyzeChart}
                >
                  {isAnalyzing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Chat Messages Area */}
                <div className="border rounded-md p-4 min-h-[200px] max-h-[400px] overflow-y-auto bg-muted/20">
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

                {/* Chat Input Area */}
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
        </div>
      </div>
    </DashboardLayout>
  )
} 