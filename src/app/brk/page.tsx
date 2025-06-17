import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BRKPage() {
  return (
    <DashboardLayout 
      title="BRK Analytics" 
      description="Advanced Bitcoin on-chain analytics and metrics"
    >
      <div className="space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>BRK Analytics Dashboard</CardTitle>
            <CardDescription>
              Comprehensive Bitcoin on-chain data analysis and visualization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <svg
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  height="24"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                Advanced BRK analytics dashboard with comprehensive Bitcoin metrics, 
                MVRV analysis, and on-chain indicators will be available here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 