"use client"

import { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  PieChart,
  LineChart,
  Settings,
  Home,
  Activity,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger 
} from "@/components/ui/sidebar"

interface DashboardLayoutProps {
  children: ReactNode
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    name: "Price Analysis",
    href: "/price",
    icon: TrendingUp,
  },
  {
    name: "On-Chain Metrics",
    href: "/onchain",
    icon: Activity,
  },
  {
    name: "Market Analysis",
    href: "/market",
    icon: BarChart3,
  },
  {
    name: "Advanced Charts",
    href: "/charts",
    icon: LineChart,
  },
  {
    name: "MVRV Analysis",
    href: "/mvrv",
    icon: PieChart,
  },
  {
    name: "Lightning Network",
    href: "/lightning",
    icon: Zap,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant="sidebar" className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-2">
              <Image
                src="/clarion_chain_logo.png"
                alt="ClarionChain"
                width={32}
                height={32}
                className="rounded-md"
              />
              <div className="flex flex-col">
                <span className="text-lg font-semibold">ClarionChain</span>
                <span className="text-xs text-muted-foreground">Bitcoin Analytics</span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="w-full justify-start"
                  >
                    <Link href={item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-border p-4">
            <div className="text-xs text-muted-foreground">
              Powered by BRK
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex-1 flex flex-col">
          <header className="flex h-16 items-center gap-4 border-b border-border px-6">
            <SidebarTrigger />
            <div className="flex-1" />
            <Button variant="outline" size="sm">
              <DollarSign className="mr-2 h-4 w-4" />
              Connect Data
            </Button>
          </header>
          
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
} 