# this is a chang eto see if it makes it to github

# brk.openonchain.dev API Instructions (Updated)

## Overview
The brk.openonchain.dev API provides comprehensive Bitcoin on-chain data and metrics. No authentication required. All endpoints return JSON data.

**Base URL:** `https://brk.openonchain.dev`

## Key Endpoints (Recommended)

### 1. Vector Time Series Endpoints (Preferred)
Use these endpoints for all time series data:

```
GET /api/vecs/date-to-{ID}?from=-N
```
- `{ID}` is the metric or vector you want (e.g. `close`, `sth-supply`, `sth-realized-cap`, `ohlc`, etc.)
- `from=-N` gets the last N values (e.g. `from=-100` for the latest 100 values)

#### Examples:

**Get the latest 100 close prices:**
```sh
curl 'https://brk.openonchain.dev/api/vecs/date-to-close?from=-100'
```

**Get the latest 100 STH supply values:**
```sh
curl 'https://brk.openonchain.dev/api/vecs/date-to-sth-supply?from=-100'
```

**Get the latest 100 STH realized cap values:**
```sh
curl 'https://brk.openonchain.dev/api/vecs/date-to-sth-realized-cap?from=-100'
```

**Get the latest 100 OHLC values:**
```sh
curl 'https://brk.openonchain.dev/api/vecs/date-to-ohlc?from=-100'
```

- All endpoints return a JSON array of values (or arrays for OHLC).
- No timestamps are included; generate dates based on the number of values and the current date.

#### List all available vector IDs:
```sh
curl 'https://brk.openonchain.dev/api/vecs/indexes'
```

---

### 2. Legacy Endpoints (Not Recommended)

The following endpoints are legacy and may not be supported in the future. Prefer the `/api/vecs/date-to-{ID}` endpoints above.

#### Query Endpoint (Legacy)
```sh
curl 'https://brk.openonchain.dev/api/query?index=dateindex&values=close&from=-100'
```

#### Metrics Endpoint (Legacy)
```sh
curl 'https://brk.openonchain.dev/api/metrics/price_btc_usd'
```

---

## Date Handling
The API does not return timestamps. To generate date labels for charting:
```js
function generateDates(dataLength) {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < dataLength; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (dataLength - 1 - i));
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}
```

---

## Summary
- **Always use `/api/vecs/date-to-{ID}?from=-N` for time series data.**
- Legacy `/api/query` and `/api/metrics` endpoints are not recommended.
- All endpoints return JSON arrays.
- Use `/api/vecs/indexes` to discover available metrics.

This documentation is up to date as of June 2025 and reflects the current best practices for the BRK API.

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

## Common Use Cases
1. **Dashboard Metrics**: Use `