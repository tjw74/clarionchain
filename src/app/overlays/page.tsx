"use client"

import { useState } from 'react'
import DashboardLayout from '@/components/dashboard-layout'
import OverlayChart from '@/components/OverlayChart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, TrendingUp, Target, Calendar, Zap, X } from 'lucide-react'

interface OverlayData {
  type: string
  name: string
  description: string
  annotations?: any[]
  shapes?: any[]
  indicators?: any[]
}

const predefinedTemplates = [
  {
    id: 'support-resistance',
    name: 'Support & Resistance',
    description: 'Key support and resistance levels',
    icon: Target,
    prompt: 'Show support and resistance levels'
  },
  {
    id: 'market-cycles',
    name: 'Market Cycles',
    description: 'Bull and bear market phases',
    icon: TrendingUp,
    prompt: 'Show bull and bear market cycles'
  },
  {
    id: 'halving-events',
    name: 'Halving Events',
    description: 'Bitcoin halving dates and impact',
    icon: Calendar,
    prompt: 'Show Bitcoin halving events'
  },
  {
    id: 'rsi-oversold',
    name: 'RSI Oversold',
    description: 'RSI oversold zones and opportunities',
    icon: Zap,
    prompt: 'Show when Bitcoin was oversold with RSI below 30'
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci Levels',
    description: 'Fibonacci retracement levels',
    icon: TrendingUp,
    prompt: 'Show fibonacci retracement levels'
  }
]

export default function OverlaysPage() {
  const [overlays, setOverlays] = useState<OverlayData[]>([])
  const [aiPrompt, setAiPrompt] = useState('')
  const [timeframe, setTimeframe] = useState('8Y')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const generateAIOverlay = async (prompt: string) => {
    setIsGenerating(true)
    setError('')
    
    try {
      const response = await fetch('/api/generate-overlay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          timeframe,
          chartData: null // We'll pass actual chart data in production
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate overlay')
      }

      const result = await response.json()
      
      if (result.success) {
        setOverlays(prev => [...prev, result.overlay])
        setAiPrompt('')
      } else {
        setError(result.error || 'Failed to generate overlay')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleTemplateClick = (template: typeof predefinedTemplates[0]) => {
    generateAIOverlay(template.prompt)
  }

  const handleAISubmit = () => {
    if (aiPrompt.trim()) {
      generateAIOverlay(aiPrompt.trim())
    }
  }

  const removeOverlay = (index: number) => {
    setOverlays(prev => prev.filter((_, i) => i !== index))
  }

  const clearAllOverlays = () => {
    setOverlays([])
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            {/* Removed redundant main content title */}
            {/* <h1 className="text-3xl font-bold mb-2">AI-Powered Chart Overlays</h1> */}
            <p className="text-muted-foreground">
              Generate intelligent chart overlays using natural language or choose from predefined templates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1Y">1Y</SelectItem>
                <SelectItem value="2Y">2Y</SelectItem>
                <SelectItem value="8Y">8Y</SelectItem>
              </SelectContent>
            </Select>
            {overlays.length > 0 && (
              <Button variant="outline" onClick={clearAllOverlays}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* AI Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              AI Overlay Generator
            </CardTitle>
            <CardDescription>
              Describe what you want to see on the chart in natural language
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="e.g., 'Show me when Bitcoin was oversold in 2022' or 'Highlight major support levels'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1"
                rows={2}
              />
              <Button 
                onClick={handleAISubmit}
                disabled={!aiPrompt.trim() || isGenerating}
                className="self-end"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
            
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                {error}
              </div>
            )}

            {/* Predefined Templates */}
            <div>
              <h3 className="text-sm font-medium mb-3">Quick Templates:</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {predefinedTemplates.map((template) => {
                  const Icon = template.icon
                  return (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTemplateClick(template)}
                      disabled={isGenerating}
                      className="h-auto p-3 flex flex-col items-center gap-2 text-center"
                    >
                      <Icon className="h-4 w-4" />
                      <div>
                        <div className="font-medium text-xs">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Overlays */}
        {overlays.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Overlays ({overlays.length})</CardTitle>
              <CardDescription>
                Currently applied overlays on the chart
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {overlays.map((overlay, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-2 px-3 py-1"
                  >
                    <span className="text-sm">{overlay.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOverlay(index)}
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        <Card className="flex-1">
          <CardContent className="p-6">
            <OverlayChart overlays={overlays} timeframe={timeframe} />
          </CardContent>
        </Card>

        {/* Features Info */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use AI Overlays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Natural Language Examples:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• "Show me when Bitcoin was oversold in 2022"</li>
                  <li>• "Highlight major support and resistance levels"</li>
                  <li>• "Mark all Bitcoin halving events"</li>
                  <li>• "Show bull and bear market cycles"</li>
                  <li>• "Add fibonacci retracement levels"</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">Overlay Types:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Technical Indicators:</strong> RSI, MACD, Moving Averages</li>
                  <li>• <strong>Support/Resistance:</strong> Key price levels</li>
                  <li>• <strong>Market Events:</strong> Halvings, major news</li>
                  <li>• <strong>Market Cycles:</strong> Bull/bear phases</li>
                  <li>• <strong>Fibonacci:</strong> Retracement levels</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 