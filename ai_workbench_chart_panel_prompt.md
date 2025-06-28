# Bitcoin Chart Panel Implementation Prompt

## ROLE AND CONTEXT
You are an expert React/TypeScript developer specializing in Chart.js implementations for financial data visualization. You must create a Bitcoin on-chain analytics chart panel that matches EXACTLY the specifications below. This is a production-grade component for a Bitcoin analytics platform.

## CRITICAL REQUIREMENTS

### 1. TECHNOLOGY STACK
- **Framework**: Next.js 13+ with TypeScript
- **Charting**: Chart.js with react-chartjs-2
- **Styling**: Tailwind CSS with dark theme
- **State Management**: React hooks (useState, useEffect, useRef)
- **Data Fetching**: Direct API calls to external endpoints

### 2. COMPONENT ARCHITECTURE

#### Core Component Structure
```typescript
interface BitcoinChartRef {
  captureImage: () => Promise<string>
}

interface ChartData {
  dates: string[]
  marketValues: number[]
  realizedValues: number[]
  mvrvRatios: number[]
  priceValues?: number[]
  priceMA200?: number[]
  priceRatios?: number[]
  realizedPrice?: number[]
  trueMarketMean?: number[]
}

type MetricType = 'mvrv' | 'price' | 'volume' | 'onchain'

interface BitcoinChartProps {
  selectedMetric?: MetricType
  chartSection?: 'main' | 'ratio' | 'full'
  range?: [number, number]
  onDataLengthChange?: (len: number) => void
}
```

#### Trace Visibility Management
```typescript
const TRACE_KEYS = [
  'price', 'ma200', 'realizedPrice', 'trueMarketMean',
  'mayer', 'priceRealized', 'priceTrueMean'
] as const

type TraceKey = typeof TRACE_KEYS[number]

// Default visibility state
const [visibleTraces, setVisibleTraces] = useState<Record<TraceKey, boolean>>({
  price: true,
  ma200: true,
  realizedPrice: true,
  trueMarketMean: true,
  mayer: true,
  priceRealized: false,
  priceTrueMean: false
})
```

### 3. DATA FETCHING SPECIFICATION

#### API Endpoints (EXACT URLs)
```javascript
// Price Analysis Data Fetching
const [priceHistory, realizedPriceHistory, trueMarketMeanHistory] = await Promise.all([
  fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-close').then(r => r.json()),
  fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-realized_price').then(r => r.json()),
  fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-true_market_mean').then(r => r.json())
])

// MVRV Analysis Data Fetching
const [marketCapHistory, realizedCapHistory] = await Promise.all([
  fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-marketcap').then(r => r.json()),
  fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-realized_cap').then(r => r.json())
])
```

#### Data Processing Logic
1. **200-Day Moving Average Calculation**:
   ```javascript
   const priceMA200 = priceHistory.map((_, index) => {
     if (index < 199) return null
     const sum = priceHistory.slice(index - 199, index + 1).reduce((a, b) => a + b, 0)
     return sum / 200
   }).filter(val => val !== null) as number[]
   ```

2. **Date Generation**:
   ```javascript
   const dates: string[] = []
   const endDate = new Date()
   for (let i = dataLength - 1; i >= 0; i--) {
     const date = new Date(endDate)
     date.setDate(date.getDate() - i)
     dates.push(date.toISOString().split('T')[0])
   }
   ```

3. **Data Alignment**: All arrays must be aligned to the 200DMA window (slice(199))

### 4. CHART CONFIGURATION REQUIREMENTS

#### Main Chart (Price/Value Data)
- **Scale Type**: Logarithmic Y-axis
- **Y-axis Position**: Right side
- **Data Sources**: Price, 200DMA, Realized Price, True Market Mean
- **Dynamic Range Calculation**:
  ```javascript
  // Use ONLY visible/sliced data for tight Y-axis scaling
  const visiblePriceValues = sliceArr(priceValues || [])
  const visibleMA200 = sliceArr(priceMA200 || [])
  const visibleRealizedPrice = sliceArr(realizedPrice || [])
  const visibleTrueMarketMean = sliceArr(trueMarketMean || [])
  const allUSDValues = [...visiblePriceValues, ...visibleMA200, ...visibleRealizedPrice, ...visibleTrueMarketMean].filter(v => v > 0)
  
  // Tight bounds calculation
  const reasonableMin = minUSD * 0.8  // 20% below minimum
  const reasonableMax = maxUSD * 1.2  // 20% above maximum
  ```

#### Ratio Chart (Ratio Data)
- **Scale Type**: Linear Y-axis
- **Y-axis Position**: Right side
- **Data Sources**: Mayer Ratio, Price/Realized Price, Price/True Market Mean
- **Dynamic Range Calculation**:
  ```javascript
  // Only include ratios for traces that are currently visible
  const visibleRatioValues = []
  if (visibleTraces.mayer) {
    visibleRatioValues.push(...mayerRatioSliced.filter(v => v > 0 && v < 100))
  }
  if (visibleTraces.priceRealized) {
    visibleRatioValues.push(...priceRealizedRatioSliced.filter(v => v > 0 && v < 100))
  }
  if (visibleTraces.priceTrueMean) {
    visibleRatioValues.push(...priceTrueMeanRatioSliced.filter(v => v > 0 && v < 100))
  }
  
  // Use tight padding (5%) for better space utilization
  const range = maxRatio - minRatio
  const paddedMin = Math.max(0, minRatio - range * 0.05)
  const paddedMax = maxRatio + range * 0.05
  ```

### 5. VISUAL DESIGN SPECIFICATIONS

#### Color Scheme (EXACT COLORS)
```javascript
const COLORS = {
  price: '#3b82f6',           // Blue
  ma200: '#fbbf24',           // Yellow/Gold
  realizedPrice: '#10b981',   // Green
  trueMarketMean: '#fb923c',  // Orange
  mayer: '#ffffff',           // White
  priceRealized: '#10b981',   // Green
  priceTrueMean: '#fb923c'    // Orange
}
```

#### Chart Options Template
```javascript
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderWidth: 0,
      callbacks: {
        label: function(context) {
          const label = context.dataset.label || ''
          const value = context.parsed.y
          return `${label}: ${formatValue(value)}`
        }
      }
    }
  },
  scales: {
    x: {
      type: 'time',
      time: { unit: 'year' },
      grid: { color: '#374151' },
      ticks: { color: '#9ca3af', maxTicksLimit: 10 }
    },
    y: {
      type: 'logarithmic', // or 'linear' for ratio chart
      position: 'right',
      grid: { color: '#374151' },
      ticks: {
        color: '#9ca3af',
        callback: function(value) {
          return formatValue(value).padStart(10, ' ')
        }
      }
    }
  }
}
```

#### Custom Legend Implementation
- **Position**: Below charts, right-aligned
- **Style**: Custom HTML/CSS circles (6px radius, solid fill)
- **Interaction**: Click to toggle trace visibility
- **Colors**: Use exact colors from COLORS object above

### 6. FORMATTING FUNCTIONS

#### USD Value Formatting
```javascript
const formatUSDValue = (value: number) => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2).replace(/\.?0+$/, '')}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2).replace(/\.?0+$/, '')}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2).replace(/\.?0+$/, '')}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2).replace(/\.?0+$/, '')}K`
  return `$${value.toFixed(2).replace(/\.?0+$/, '')}`
}
```

#### Ratio Value Formatting
```javascript
// For ratio chart Y-axis
callback: function(value) {
  return value.toFixed(2).padStart(10, ' ')
}
```

### 7. INTERACTIVITY REQUIREMENTS

#### Chart Synchronization
- **Tooltip Sync**: Hovering on one chart shows tooltips on both charts at the same X position
- **Active Elements**: Both charts highlight the same data point simultaneously
- **Mouse Leave**: Clear all tooltips when mouse leaves chart area

#### Trace Toggle Functionality
- **Legend Clicks**: Toggle individual trace visibility
- **Dynamic Scaling**: Y-axis recalculates when traces are toggled
- **Visual Feedback**: Inactive traces show with opacity and grayscale

#### Time Range Support
- **Slider Integration**: Accept range prop for time window selection
- **Dynamic Updates**: All calculations update when range changes
- **Data Slicing**: Use sliceArr helper for consistent data windowing

### 8. LAYOUT AND STRUCTURE

#### Component Sections
1. **'main'**: Shows only the main price/value chart
2. **'ratio'**: Shows only the ratio chart
3. **'full'**: Shows both charts stacked vertically with shared legend

#### Responsive Design
- **Container**: Full width with min-width constraints
- **Chart Heights**: Flexible with minimum height requirements
- **Legend**: Fixed height (48px) with centered content
- **Background**: Dark theme with muted backgrounds

### 9. CRITICAL IMPLEMENTATION DETAILS

#### Chart.js Registration
```javascript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

ChartJS.register(
  CategoryScale, LinearScale, LogarithmicScale, TimeScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
)
```

#### Error Handling
- **API Failures**: Graceful degradation with null data state
- **Data Validation**: Filter out invalid values (negative, NaN, Infinity)
- **Fallback Values**: Provide sensible defaults for empty datasets

#### Performance Optimization
- **Dynamic Imports**: Use dynamic imports for Chart.js components
- **Memoization**: Optimize expensive calculations
- **Update Modes**: Use 'none' mode for synchronized updates

### 10. EXACT BEHAVIOR REQUIREMENTS

#### Auto-Scaling Logic
- **Main Chart**: Always scales to visible price data range with 20% padding
- **Ratio Chart**: Scales to visible ratio data range with 5% padding
- **Outlier Filtering**: Remove values >100 for ratios, <0 for all data
- **Empty Data**: Provide fallback ranges when no valid data exists

#### Data Alignment
- **200DMA Requirement**: All price analysis data aligned to 200-day window
- **Date Consistency**: Same date array used for all aligned datasets
- **Array Slicing**: Consistent slicing logic across all data arrays

#### Visual Consistency
- **Line Styles**: 1px border width, no fill, 0 point radius
- **Grid Lines**: Consistent color (#374151) across both charts
- **Fonts**: Monospace for Y-axis labels, system fonts elsewhere
- **Spacing**: Consistent padding and margins throughout

## VALIDATION CHECKLIST

Before considering the implementation complete, verify:

- [ ] All API endpoints return valid JSON arrays
- [ ] 200DMA calculation produces correct moving averages
- [ ] Y-axis scaling adapts to visible data range changes
- [ ] Ratio values display with 2 decimal places
- [ ] Legend toggles work and update Y-axis scaling
- [ ] Charts synchronize tooltips and active elements
- [ ] Time range slicing works correctly
- [ ] All colors match the exact specification
- [ ] Both logarithmic and linear scales work properly
- [ ] Component handles all three section modes (main/ratio/full)

## SUCCESS CRITERIA

The implementation is successful when:
1. **Visual Accuracy**: Charts look identical to the reference implementation
2. **Functional Parity**: All interactions work exactly as specified
3. **Performance**: Smooth rendering and responsive updates
4. **Reliability**: Handles edge cases and API failures gracefully
5. **Maintainability**: Clean, well-structured TypeScript code

This prompt contains every detail necessary to recreate the Bitcoin Chart Panel exactly. Follow each specification precisely to achieve pixel-perfect replication. 