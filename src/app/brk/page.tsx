"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ExternalLink, RefreshCw, Globe, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function BRKPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleIframeLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const refreshIframe = () => {
    setIsLoading(true)
    setHasError(false)
    // Force iframe reload by updating the key
    const iframe = document.querySelector('#brk-iframe') as HTMLIFrameElement
    if (iframe) {
      iframe.src = iframe.src
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Custom header with title and creator info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">BRK Dataset</h1>
            <p className="text-muted-foreground mb-3">Advanced Bitcoin on-chain analytics and metrics</p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Created by the Bitcoin Research Kit - a free open source project providing advanced Bitcoin metrics
              </p>
              <div className="flex items-center gap-4 text-sm">
                <a 
                  href="https://bitcoinresearchkit.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  Website
                </a>
                <a 
                  href="https://primal.net/p/nprofile1qqsfw5dacngjlahye34krvgz7u0yghhjgk7gxzl5ptm9v6n2y3sn03sqxu2e6" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Hash className="h-3 w-3" />
                  Nostr
                </a>
                <a 
                  href="https://x.com/brkdotorg" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  X/Twitter
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Header with controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isLoading && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading BRK Dataset...</span>
              </>
            )}
            {hasError && (
              <span className="text-sm text-red-500">Failed to load. Please try refreshing.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshIframe}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a 
                href="https://brk.openonchain.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          </div>
        </div>

        {/* Main iframe container */}
        <Card className="border-border flex-1 overflow-hidden">
          <CardContent className="p-0 h-full">
            <div className="relative w-full h-full min-h-[calc(100vh-12rem)]">
              {hasError ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <ExternalLink className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Unable to Load BRK Dataset</h3>
                  <p className="text-muted-foreground max-w-md mb-4">
                    The BRK website could not be loaded in the embedded view. 
                    This might be due to security restrictions.
                  </p>
                  <Button
                    variant="default"
                    asChild
                  >
                    <a 
                      href="https://brk.openonchain.dev" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                                             Open BRK Dataset Directly
                    </a>
                  </Button>
                </div>
              ) : (
                <iframe
                  id="brk-iframe"
                  src="https://brk.openonchain.dev"
                  className="w-full h-full border-0 rounded-lg"
                  title="BRK Dataset Dashboard"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  loading="lazy"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 