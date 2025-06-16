"use client"

import Image from "next/image"
import DashboardLayout from "@/components/dashboard-layout"

interface ComingSoonPageProps {
  title: string
  description: string
}

export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <DashboardLayout title={title} description={description}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-6">
          <Image
            src="/clarion_chain_logo.png"
            alt="ClarionChain"
            width={120}
            height={120}
            className="rounded-2xl shadow-lg"
          />
          
          {/* Coming Soon Text */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">
              Coming Soon...
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              We're working hard to bring you advanced Bitcoin analytics. 
              Stay tuned for powerful insights and tools.
            </p>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl">
          <div className="text-center p-6 rounded-lg border border-border bg-card">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Advanced Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Deep insights into Bitcoin market dynamics and on-chain metrics
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border border-border bg-card">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Real-time Data</h3>
            <p className="text-sm text-muted-foreground">
              Live Bitcoin network data and market indicators
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border border-border bg-card">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Smart Insights</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered analysis and predictive modeling
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Follow our progress • Built with precision for Bitcoin analysts
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
} 