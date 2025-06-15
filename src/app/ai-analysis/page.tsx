"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AIAnalysisPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Analysis</h1>
          <p className="text-muted-foreground">
            AI-powered insights and analysis of Bitcoin on-chain data
          </p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>AI Analysis Dashboard</CardTitle>
            <CardDescription>
              Coming soon - AI-powered Bitcoin analytics and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-md">
              <p className="text-muted-foreground">
                AI Analysis features will be implemented here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 