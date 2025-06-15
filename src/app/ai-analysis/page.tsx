"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Brain, Settings, Send } from "lucide-react"
import { useState } from "react"
import BitcoinChart from "@/components/bitcoin-chart"

export default function AIAnalysisPage() {
  const [apiKey, setApiKey] = useState("")
  const [provider, setProvider] = useState("openai")
  const [analysis, setAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered insights and analysis of Bitcoin on-chain data
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Chart Workbench
              </CardTitle>
              <CardDescription>
                Select metrics and analyze Bitcoin on-chain data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BitcoinChart />
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
                    <SelectTrigger className="w-32">
                      <SelectValue value={provider} placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
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
                  onClick={() => {
                    setIsAnalyzing(true)
                    setTimeout(() => {
                      setAnalysis("AI analysis will be implemented here...")
                      setIsAnalyzing(false)
                    }, 2000)
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Chat Messages Area */}
                <div className="border rounded-md p-4 min-h-[200px] max-h-[400px] overflow-y-auto bg-muted/20">
                  {analysis ? (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[80%]">
                          <p className="text-sm">Analyze the current chart data</p>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2 max-w-[80%]">
                          <p className="text-sm">{analysis}</p>
                        </div>
                      </div>
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
                    disabled={!analysis}
                  />
                  <Button size="sm" disabled={!analysis}>
                    <Send className="h-4 w-4" />
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