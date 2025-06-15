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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
          </div>

          <div className="lg:col-span-1">
            <Card className="border-border h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Analysis
                </CardTitle>
                <CardDescription>
                  Configure AI and get insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full" 
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
                  {isAnalyzing ? "Analyzing..." : "Analyze Chart"}
                </Button>

                {analysis && (
                  <div className="space-y-3">
                    <Label>AI Response</Label>
                    <Textarea
                      value={analysis}
                      readOnly
                      className="min-h-[200px] resize-none"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 