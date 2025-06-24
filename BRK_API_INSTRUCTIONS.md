# this is a chang eto see if it makes it to github

# brk.openonchain.dev API Instructions

## Overview
The brk.openonchain.dev API provides comprehensive Bitcoin on-chain data and metrics. No authentication required. All endpoints return JSON data.

**Base URL:** `https://brk.openonchain.dev`

## Key Endpoints

### 1. Discovery Endpoints
```javascript
// Get all available metrics
fetch('https://brk.openonchain.dev/api/metrics')
  .then(response => response.json())
  .then(data => console.log(data)); // Returns string array of metric names

// Get all vector indexes  
fetch('https://brk.openonchain.dev/api/vecs/indexes')
  .then(response => response.json())
  .then(data => console.log(data)); // Returns string array of index names
```

### 2. Single Metric Data
```javascript
// Get specific metric data
fetch('https://brk.openonchain.dev/api/metrics/price_btc_usd')
  .then(response => response.json())
  .then(data => console.log(data)); // Returns array of metric values

// Available metrics include:
// - price_btc_usd, market_cap, volume_24h, mvrv_ratio, realized_cap
// - sth-realized-price, sth-supply, lth-supply, spent-output-profit-ratio
// - supply-in-profit, supply-in-loss, and many more
```

### 3. Query Endpoint (Primary Data Access)
The most powerful endpoint for historical data:
```javascript
// Basic query structure
const url = 'https://brk.openonchain.dev/api/query?index={INDEX}&values={VALUE}&from={FROM}'

// Examples:
// Last 2920 days of Bitcoin price
fetch('https://brk.openonchain.dev/api/query?index=dateindex&values=close&from=-2920')

// Last 100 blocks of market cap
fetch('https://brk.openonchain.dev/api/query?index=height&values=marketcap&from=-100')

// Single latest value (most recent)
fetch('https://brk.openonchain.dev/api/query?index=height&values=close&from=-1')
```

## Query Parameters Explained

### Index Types
- `dateindex` - Query by date/time (daily data points)
- `height` - Query by block height

### Common Values
- `close` - Bitcoin closing price
- `marketcap` - Market capitalization  
- `realized-cap` - Realized capitalization
- `realized-price` - Realized price
- `sth-realized-price` - Short-term holder realized price
- `sth-supply` - Short-term holder supply
- `lth-supply` - Long-term holder supply
- `spent-output-profit-ratio` - SOPR metric
- `supply-in-profit` - Supply in profit
- `supply-in-loss` - Supply in loss

### From Parameter
- Negative numbers: `-2920` = last 2920 data points
- Use `-1` for most recent single value
- Larger numbers for more historical data

## Complete Working Examples

### Get Latest Bitcoin Price
```javascript
async function getLatestPrice() {
  const response = await fetch('https://brk.openonchain.dev/api/query?index=height&values=close&from=-1');
  const data = await response.json();
  return data[0]; // Single number value
}
```

### Get Price History for Charts
```javascript
async function getPriceHistory(days = 365) {
  const response = await fetch(`https://brk.openonchain.dev/api/query?index=dateindex&values=close&from=-${days}`);
  const prices = await response.json();
  
  // Generate corresponding dates
  const dates = prices.map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (prices.length - 1 - index));
    return date.toISOString().split('T')[0];
  });
  
  return prices.map((price, index) => ({
    date: dates[index],
    price: price
  }));
}
```

### Calculate MVRV Ratio
```javascript
async function getMVRVRatio(days = 2920) {
  const [marketCap, realizedCap] = await Promise.all([
    fetch(`https://brk.openonchain.dev/api/query?index=dateindex&values=marketcap&from=-${days}`).then(r => r.json()),
    fetch(`https://brk.openonchain.dev/api/query?index=dateindex&values=realized-cap&from=-${days}`).then(r => r.json())
  ]);
  
  return marketCap.map((mv, i) => ({
    date: getDateForIndex(i, days),
    mvrv: realizedCap[i] ? mv / realizedCap[i] : 0
  }));
}
```

### Fetch Multiple Metrics Efficiently
```javascript
async function getEssentialMetrics() {
  const endpoints = [
    'https://brk.openonchain.dev/api/query?index=height&values=close&from=-1',
    'https://brk.openonchain.dev/api/query?index=height&values=marketcap&from=-1',
    'https://brk.openonchain.dev/api/query?index=height&values=realized-cap&from=-1',
    'https://brk.openonchain.dev/api/query?index=height&values=realized-price&from=-1'
  ];
  
  const [price, marketCap, realizedCap, realizedPrice] = await Promise.all(
    endpoints.map(url => fetch(url).then(r => r.json()).then(data => data[0]))
  );
  
  return { price, marketCap, realizedCap, realizedPrice };
}
```

## Error Handling Pattern
```javascript
async function fetchWithErrorHandling(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      error: error.message 
    };
  }
}
```

## Response Format
- All endpoints return JSON
- Query endpoint returns arrays of numbers: `[42250.5, 42100.3, ...]`
- Metrics endpoint returns arrays of strings: `["price_btc_usd", "market_cap", ...]`
- No timestamps included - generate them based on query parameters

## Performance Notes
- API responses are fast (~7ms typical)
- No rate limiting observed
- Use Promise.all() for parallel requests
- Cache data when possible to reduce API calls

## Date Handling
The API doesn't return timestamps, so generate them:
```javascript
function generateDates(dataLength, fromDaysAgo) {
  const dates = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - fromDaysAgo);
  
  for (let i = 0; i < dataLength; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}
```

## Common Use Cases
1. **Dashboard Metrics**: Use `from=-1` for latest values
2. **Price Charts**: Use `dateindex` with `close` values  
3. **Historical Analysis**: Use larger `from` values (e.g., `-10000`)
4. **Real-time Updates**: Fetch latest block data with `height` index
5. **Ratio Calculations**: Fetch multiple metrics and calculate client-side

This API provides comprehensive Bitcoin on-chain data without authentication. Use the query endpoint with appropriate index, values, and from parameters for most use cases. 