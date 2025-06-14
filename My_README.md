# Bitcoin Research Kit (BRK) Data Collection System

A comprehensive Bitcoin data collection and monitoring system that extracts on-chain metrics from a local BRK instance and stores them in DigitalOcean PostgreSQL with sophisticated statistical analysis.

## 🏗️ System Architecture

```
Bitcoin Network
    ↓
BRK Instance (127.0.0.1:3110) 
    ↓
brk_collector.py (Data Collection + Z-Score Analysis)
    ↓
DigitalOcean PostgreSQL (29,990+ rows collected)
    ↑
BRK Controller Web Interface (Real-time Monitoring)
```

## 📁 Project Structure

```
dc_brk/
├── brk_collector.py          # Main data collection engine
├── brk_metrics.json          # Metrics configuration (auto-generated)
├── brk-controller/           # Next.js web interface
│   ├── app/api/              # API endpoints for status, stats, control
│   ├── components/           # React components for dashboard
│   └── README.md             # Web interface documentation
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.8+ with required packages
- Node.js 18+ for web interface
- Local BRK instance running on 127.0.0.1:3110
- DigitalOcean PostgreSQL database

### 2. Environment Setup

```bash
# Set required environment variables
export DB_URL_DO="your_digitalocean_postgres_connection_string"
export BRK_BASE_URL="http://127.0.0.1:3110"
```

### 3. Generate Metrics Configuration

```bash
# Auto-discover available metrics from BRK instance
python brk_collector.py --generate-config essential
```

### 4. Start Data Collection

```bash
# Collect essential metrics with real-time progress tracking
python brk_collector.py --priority essential
```

### 5. Launch Web Interface

```bash
cd brk-controller
npm install
npm run dev
```

Visit: http://localhost:3000

## 🎯 Key Features

### Data Collection Engine
- **Auto-discovery**: Discovers 9,002+ available metrics from BRK instance
- **Priority-based collection**: Essential, Important, Extended, or All metrics
- **Real-time progress tracking**: JSON-based progress monitoring
- **Statistical analysis**: 9 z-score time windows (30d, 90d, 1y, 2y, 8y, etc.)
- **Incremental updates**: Only collects new data since last run
- **Robust error handling**: Retry logic and connection management

### Web Interface
- **Real-time monitoring**: Live status cards with health indicators
- **Collection control**: Start/stop data collection with progress bars
- **Database statistics**: Table counts, row counts, data freshness
- **System health**: BRK instance status, database connectivity
- **Responsive UI**: Dark mode, modern design with Tailwind CSS

### Advanced Analytics
- **Z-score calculations**: Multi-timeframe statistical analysis
- **Derived metrics**: MVRV ratios, STH metrics computed from base data
- **Data quality checks**: Missing value detection and reporting
- **Performance optimization**: Batch processing and connection pooling

## 📊 Metrics Coverage

### Essential Metrics (14 metrics)
- OHLC price data with volume
- Market cap, realized cap, supply metrics
- Short-term holder (STH) analysis
- Profit/loss ratios and risk indicators

### Full Coverage (9,002+ metrics available)
- All Bitcoin on-chain metrics from BRK instance
- Lazy calculation: computed on-demand
- Storage estimate: 2-3GB for complete collection

## 🔒 Security & Best Practices

- **No credentials in code**: Uses environment variables exclusively
- **GitHub-safe**: Comprehensive .gitignore protection
- **SSL/TLS**: Secure database connections to DigitalOcean
- **Error isolation**: Failed metrics don't stop collection
- **Progress persistence**: Resumable collection processes

## 📈 Performance

- **5,998 days** of historical data (2009-01-03 to current)
- **29,990+ rows** successfully collected and stored
- **Fast API responses**: ~7ms from local BRK instance
- **Efficient storage**: Optimized PostgreSQL schema with indexes

## 🛠️ Advanced Usage

### Collection Modes
```bash
# Essential metrics only (recommended for daily runs)
python brk_collector.py --priority essential

# Full refresh (rebuilds all tables)
python brk_collector.py --refresh --priority important

# Specific metrics only
python brk_collector.py --metrics close open high low volume
```

### Configuration Management
```bash
# Generate different priority configurations
python brk_collector.py --generate-config essential    # 14 metrics
python brk_collector.py --generate-config important    # 24 metrics  
python brk_collector.py --generate-config extended     # 32 metrics
python brk_collector.py --generate-config all          # 9,002 metrics
```

## 📋 Requirements

### Python Dependencies
- requests, psycopg2, numpy, python-dotenv
- pandas (optional, for enhanced analytics)

### System Requirements
- Local BRK instance with Bitcoin Core data
- DigitalOcean PostgreSQL (or compatible)
- 2-4GB disk space for full metrics collection

## 🔍 Monitoring & Debugging

The web interface provides comprehensive monitoring:
- **Collection progress**: Real-time percentage and current metric
- **System health**: BRK instance connectivity and response times
- **Database status**: Connection health and table statistics
- **Error tracking**: Failed metrics and retry attempts

## 📄 License

Private project for Bitcoin on-chain data analysis and research.

---

**Built with**: Python, PostgreSQL, Next.js, React, Tailwind CSS, TypeScript 

# BRK API Data Access Guide

This guide explains how to retrieve data from your BRK API instance at `brk.openonchain.dev` for use in your frontend applications.

---

## 1. Basic GET Request (with curl)

Fetch a list of available vector indexes:
```bash
curl https://brk.openonchain.dev/api/vecs/indexes
```
- **What it does:** Returns a list of all vector indexes available from the BRK API.

---

## 2. Fetch All Metrics

Retrieve all available metrics:
```bash
curl https://brk.openonchain.dev/api/metrics
```
- **What it does:** Returns a JSON array of all metrics tracked by your BRK instance.

---

## 3. Fetch a Specific Metric

Get data for a specific metric:
```bash
curl "https://brk.openonchain.dev/api/metrics/<metric_name>"
```
- **What it does:** Returns the data for the metric you specify. Replace `<metric_name>` with the actual metric name (e.g., `price_btc_usd`).

---

## 4. Fetch Data in Python

Example using the `requests` library:
```python
import requests
response = requests.get("https://brk.openonchain.dev/api/vecs/indexes")
data = response.json()
print(data)
```
- **What it does:** Fetches the vector indexes and prints them as a Python object.

---

## 5. Fetch Data in JavaScript (Frontend Example)

```javascript
fetch('https://brk.openonchain.dev/api/vecs/indexes')
  .then(response => response.json())
  .then(data => console.log(data));
```
- **What it does:** Fetches the vector indexes and logs them to the browser console.

---

## 6. Notes
- All requests should use `https://brk.openonchain.dev` as the base URL.
- Endpoints and parameters may vary; check your BRK API documentation for more details.
- No authentication is required unless you have configured it.

---

**Use these examples as templates for your frontend or backend code to pull and display BRK data.** 