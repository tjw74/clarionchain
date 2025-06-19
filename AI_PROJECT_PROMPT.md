# ClarionChain Bitcoin Analytics Platform - Master AI Prompt

## Project Overview
Create a comprehensive Bitcoin analytics platform called "ClarionChain" that provides real-time on-chain data visualization, statistical anomaly detection, and AI-powered chart analysis. This is a Next.js 15 application with TypeScript, using the BRK API for Bitcoin data and Chart.js for visualizations.

## Core Technologies & Dependencies
```json
{
  "framework": "Next.js 15.3.3",
  "language": "TypeScript",
  "styling": "Tailwind CSS v4",
  "ui_components": "Radix UI + shadcn/ui",
  "charting": "Chart.js + react-chartjs-2",
  "icons": "Lucide React",
  "api": "BRK OpenOnChain API (https://brk.openonchain.dev)"
}
```

### Key Dependencies
```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-separator": "^1.1.7", 
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tooltip": "^1.2.7",
    "chart.js": "^4.5.0",
    "chartjs-adapter-date-fns": "^3.0.0",
    "chartjs-plugin-zoom": "^2.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.515.0",
    "next": "15.3.3",
    "openai": "^5.3.0",
    "react": "^19.0.0",
    "react-chartjs-2": "^5.3.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.3.1"
  }
}
```

## Application Architecture

### Directory Structure
```
src/
├── app/                     # Next.js App Router pages
│   ├── page.tsx            # Dashboard homepage
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles
│   ├── dynamics/           # Statistical anomaly detection
│   ├── ai-analysis/        # AI-powered chart analysis
│   ├── supply/             # Bitcoin supply analysis
│   ├── z-scores/           # Z-score analysis
│   ├── api/                # API routes
│   └── [other-pages]/      # Additional analysis pages
├── components/
│   ├── dashboard-layout.tsx # Main layout with sidebar
│   ├── bitcoin-chart-chartjs.tsx # Chart.js components
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── api/brkClient.ts    # BRK API client
│   └── utils.ts            # Utility functions
└── types/
    └── bitcoin.ts          # TypeScript interfaces
```

### Navigation Structure
Create a sidebar navigation with these pages:
1. **Dashboard** (/) - Overview with key metrics and charts
2. **Dynamics** (/dynamics) - Real-time anomaly detection
3. **AI Analysis** (/ai-analysis) - AI-powered chart analysis
4. **BRK Dataset** (/brk) - Data explorer
5. **Supply** (/supply) - LTH/STH supply analysis
6. **DCA Tuner** (/dca-tuner) - DCA strategy analysis
7. **Machine Learning** (/machine-learning) - ML models
8. **Overlays** (/overlays) - Chart overlays
9. **Z Scores** (/z-scores) - Statistical analysis
10. **Price Analysis** (/price) - Price metrics
11. **On-Chain Metrics** (/onchain) - On-chain data
12. **Market Analysis** (/market) - Market indicators
13. **Advanced Charts** (/charts) - Complex visualizations
14. **MVRV Analysis** (/mvrv) - Market vs Realized Value
15. **Lightning Network** (/lightning) - Lightning data
16. **Settings** (/settings) - Configuration

## BRK API Integration

### API Client Implementation
Create `src/lib/api/brkClient.ts` with these methods:

```typescript
class BRKClient {
  private baseUrl = 'https://brk.openonchain.dev'
  
  // Core data fetching methods
  async fetchDailyCloseHistory(days: number): Promise<number[]>
  async fetchMarketCapHistory(days: number): Promise<number[]>
  async fetchRealizedCapHistory(days: number): Promise<number[]>
  async fetchRealizedPriceHistory(days: number): Promise<number[]>
  async fetchLTHSupplyHistory(days: number): Promise<number[]>
  async fetchSTHSupplyHistory(days: number): Promise<number[]>
  async fetchSTHRealizedPriceHistory(days: number): Promise<number[]>
  async fetchSOPRHistory(days: number): Promise<number[]>
  async fetchSupplyInProfitHistory(days: number): Promise<number[]>
  async fetchSupplyInLossHistory(days: number): Promise<number[]>
}
```

### API Endpoints Pattern
```typescript
// Pattern for all endpoints
const url = `${baseUrl}/api/query?index=dateindex&values=${metric}&from=-${days}`

// Key metrics available:
// - close (Bitcoin price)
// - marketcap (Market capitalization)
// - realized-cap (Realized capitalization)
// - realized-price (Realized price)
// - sth-supply (Short-term holder supply)
// - lth-supply (Long-term holder supply)
// - sth-realized-price (STH realized price)
// - spent-output-profit-ratio (SOPR)
// - supply-in-profit, supply-in-loss
```

## Chart Implementation Standards

### Chart.js Configuration Rules
**CRITICAL: Follow these exact chart standards for consistency**

1. **Library**: Always use Chart.js unless explicitly stated otherwise
2. **Y-Axis**: Always default to logarithmic scale (`type: 'logarithmic'`)
3. **Legend**: 
   - Always disable Chart.js built-in legends (`display: false`)
   - Create custom HTML legends with solid 6px circle dots
   - Position in lower right of chart component
4. **Colors**:
   - Price data: Blue (#3b82f6)
   - Primary metric: Yellow (#fbbf24)
   - Ratios/Z-scores/Oscillators: White (#ffffff)
5. **Y-Axis Formatting**: Use short form notation (15M not 15.00M BTC)
6. **Interactivity**: 
   - Enable wheel zoom and Y-axis grab functionality
   - Use zoom configuration with xy mode
7. **Y-Axis Spacing**: 
   - Implement custom logarithmic tick generation
   - Use `afterBuildTicks` callback for even visual spacing
   - Calculate evenly spaced logarithmic intervals

### Chart.js Template
```typescript
const ChartJSLine = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false
})

// SSR-safe Chart.js registration
if (typeof window !== 'undefined') {
  import('chartjs-plugin-zoom').then((zoomModule) => {
    ChartJS.register(
      CategoryScale, LinearScale, LogarithmicScale, TimeScale,
      PointElement, LineElement, Title, Tooltip, Legend, Filler,
      zoomModule.default
    )
  })
}

// Standard chart options
const standardChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }, // Always disable
    zoom: {
      zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' },
      pan: { enabled: true, mode: 'xy' }
    }
  },
  scales: {
    y: {
      type: 'logarithmic',
      afterBuildTicks: function(axis) {
        axis.ticks = calculatedLogTicks.map(value => ({ value }))
      }
    }
  }
}
```

## Key Pages Implementation

### 1. Dashboard (/) 
- Overview cards showing current Bitcoin price, market cap, MVRV ratio, etc.
- Two main charts: Bitcoin Price vs Realized Price, STH Cost Basis vs Bitcoin Price
- Interactive charts with zoom/pan functionality
- Real-time data updates

### 2. Dynamics (/dynamics)
**Statistical Anomaly Detection System**
- Analyze 6 key metrics: Bitcoin Price, Market Value, Realized Value, Realized Price, LTH Supply %, STH Supply %
- Calculate percentiles using 10 years of historical data (3650 days)
- Detect anomalies at 99th/95th/90th percentile thresholds
- Severity levels: Extreme (99th/1st), High (95th/5th), Moderate (90th/10th)
- Display active anomalies with historical context and rarity assessment
- Show duration tracking and current percentile ranking

### 3. AI Analysis (/ai-analysis)
**AI-Powered Chart Analysis**
- Interactive Chart.js charts with multiple metric options (MVRV, Price, Volume, On-chain)
- Chart image capture functionality for AI analysis
- OpenAI API integration for chart interpretation
- Follow-up conversation capability
- Provider selection (OpenAI, Anthropic)
- API key input for user's own AI access

### 4. Supply (/supply)
**Bitcoin Supply Analysis**
- Two side-by-side Chart.js charts:
  - LTH Supply (BTC) with Bitcoin price overlay
  - STH Supply (BTC) with Bitcoin price overlay
- Dual Y-axes (supply left, price right) both logarithmic
- Summary cards showing current supply metrics
- Independent Y-axis controls for each chart
- Double-tap reset functionality

### 5. Z-Scores (/z-scores)
**Statistical Normalization Analysis**
- Calculate Z-scores for MVRV ratio
- Two time windows: 4-year rolling, semi-full history (Jan 1, 2015+)
- Standard deviation range analysis
- Chart visualization with stddev bands
- Time distribution across different Z-score ranges

## UI/UX Design Principles

### Theme & Styling
- **Dark theme** with professional Bitcoin orange accents
- **Responsive design** for desktop and mobile
- **Consistent spacing** using Tailwind utilities
- **Card-based layouts** for content organization
- **Subtle animations** for interactions

### Component Patterns
```typescript
// Standard page layout
export default function PageName() {
  return (
    <DashboardLayout title="Page Title" description="Page description">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>...</Card>
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Charts and analysis */}
        </div>
      </div>
    </DashboardLayout>
  )
}
```

### Data Formatting Utilities
```typescript
const formatShort = (value: number) => {
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`
  return Math.round(value).toString()
}

const formatBTC = (satoshis: number) => {
  const btc = satoshis / 1e8
  if (btc >= 1e6) return `${(btc / 1e6).toFixed(0)}M BTC`
  if (btc >= 1e3) return `${(btc / 1e3).toFixed(0)}K BTC`
  return `${btc.toFixed(0)} BTC`
}
```

## Critical SSR Considerations

### Client-Side Only Components
**IMPORTANT**: Chart.js components must be SSR-safe to prevent build failures

```typescript
// Always use dynamic imports for Chart.js
const ChartJSLine = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false
})

// Wrap all browser APIs in client checks
if (typeof window !== 'undefined') {
  window.addEventListener('resize', handleResize)
}

// Dynamic plugin imports
if (typeof window !== 'undefined') {
  import('chartjs-plugin-zoom').then((zoomModule) => {
    ChartJS.register(/* ... */, zoomModule.default)
  })
}
```

## Data Analysis Features

### Anomaly Detection Algorithm
```typescript
interface MetricAnomaly {
  id: string
  name: string
  currentValue: number
  percentile: number
  severity: 'extreme' | 'high' | 'moderate'
  direction: 'above' | 'below'
  daysAtLevel: number
  description: string
  historicalContext: string
}

// Percentile-based detection
const detectAnomaly = (values: number[], currentValue: number) => {
  const sortedValues = [...values].sort((a, b) => a - b)
  const percentile = (sortedValues.filter(v => v <= currentValue).length / sortedValues.length) * 100
  
  // Thresholds: 99th/95th/90th percentiles
  if (percentile >= 99 || percentile <= 1) return 'extreme'
  if (percentile >= 95 || percentile <= 5) return 'high'  
  if (percentile >= 90 || percentile <= 10) return 'moderate'
  return null
}
```

### Z-Score Analysis
```typescript
// Normalize metrics using Z-scores
const calculateZScore = (values: number[], windowSize?: number) => {
  const dataset = windowSize ? values.slice(-windowSize) : values
  const mean = dataset.reduce((a, b) => a + b) / dataset.length
  const stdDev = Math.sqrt(dataset.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / dataset.length)
  
  return values.map(value => (value - mean) / stdDev)
}

// Standard deviation ranges for analysis
const stdDevRanges = {
  extremeHigh: (z: number) => z > 2.0,
  high: (z: number) => z > 1.0 && z <= 2.0,
  normal: (z: number) => z >= -0.5 && z <= 0.5,
  extremeLow: (z: number) => z < -2.0
}
```

## Advanced Features

### Chart Image Capture
```typescript
// AI Analysis chart capture functionality
const captureImage = async (): Promise<string> => {
  const canvas = chartRef.current?.canvas
  if (!canvas) throw new Error('Chart not ready')
  
  return canvas.toDataURL('image/png', 0.9)
}
```

### Real-time Updates
```typescript
// Implement data refresh patterns
useEffect(() => {
  const fetchLatestData = async () => {
    // Fetch latest metrics
    // Update state
    // Schedule next update
  }
  
  const interval = setInterval(fetchLatestData, 60000) // 1 minute
  return () => clearInterval(interval)
}, [])
```

## Development Workflow

### Project Setup
1. Create Next.js 15 project with TypeScript
2. Install dependencies (see package.json above)
3. Configure Tailwind CSS v4
4. Set up shadcn/ui components
5. Create BRK API client
6. Implement dashboard layout with sidebar navigation
7. Build pages incrementally following the chart standards

### Build Configuration
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
}

module.exports = nextConfig
```

### Environment Setup
- No environment variables required (BRK API is public)
- OpenAI API key input handled in UI for AI Analysis
- Vercel deployment ready

## Quality Assurance

### Testing Checklist
- [ ] All charts render without SSR errors
- [ ] Data fetching handles API failures gracefully
- [ ] Charts are interactive (zoom, pan, reset)
- [ ] Responsive design works on mobile
- [ ] Anomaly detection algorithms are accurate
- [ ] AI analysis integration functions properly
- [ ] All navigation links work
- [ ] Performance is optimized (lazy loading, caching)

### Performance Optimization
- Use dynamic imports for heavy components
- Implement data caching strategies
- Optimize chart rendering with proper key management
- Lazy load non-critical pages
- Minimize API calls with efficient batching

## Deployment

### Vercel Configuration
- Automatic deployment from Git commits
- No additional environment variables needed
- Build optimizations for Chart.js SSR compatibility
- Edge function support for API routes

This master prompt provides the complete blueprint for recreating the ClarionChain Bitcoin Analytics Platform. Follow the specifications exactly, especially the Chart.js implementation standards and SSR considerations, to ensure a professional, functional Bitcoin analytics application. 