# ClarionChain: Bitcoin Research Kit (BRK) Data Collection System

A comprehensive Bitcoin data collection and monitoring system that extracts on-chain metrics from a local BRK instance and stores them in DigitalOcean PostgreSQL with sophisticated statistical analysis.

---

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
- **Auto-discovery**: Discovers 9,002+ available metrics from BRK instance
- **Priority-based collection**: Essential, Important, Extended, or All metrics
- **Real-time progress tracking**: JSON-based progress monitoring
- **Statistical analysis**: 9 z-score time windows (30d, 90d, 1y, 2y, 8y, etc.)
- **Incremental updates**: Only collects new data since last run
- **Robust error handling**: Retry logic and connection management
- **Real-time monitoring**: Live status cards with health indicators
- **Collection control**: Start/stop data collection with progress bars
- **Database statistics**: Table counts, row counts, data freshness
- **System health**: BRK instance status, database connectivity
- **Responsive UI**: Dark mode, modern design with Tailwind CSS
- **Z-score calculations**: Multi-timeframe statistical analysis
- **Derived metrics**: MVRV ratios, STH metrics computed from base data
- **Data quality checks**: Missing value detection and reporting
- **Performance optimization**: Batch processing and connection pooling

## 📊 Metrics Coverage
- **Essential Metrics (14 metrics)**: OHLC price data with volume, market cap, realized cap, supply metrics, STH analysis, profit/loss ratios, risk indicators
- **Full Coverage (9,002+ metrics)**: All Bitcoin on-chain metrics from BRK instance, lazy calculation, 2-3GB storage for complete collection

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
- See My_README.md for advanced collection modes, configuration management, and requirements.

## 🔍 Monitoring & Debugging
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

## 2. Fetch All Metrics
Retrieve all available metrics:
```bash
curl https://brk.openonchain.dev/api/metrics
```
- **What it does:** Returns a JSON array of all metrics tracked by your BRK instance.

## 3. Fetch a Specific Metric
Get data for a specific metric:
```bash
curl "https://brk.openonchain.dev/api/metrics/<metric_name>"
```
- **What it does:** Returns the data for the metric you specify. Replace `<metric_name>` with the actual metric name (e.g., `price_btc_usd`).

## 4. Fetch Data in Python
Example using the `requests` library:
```python
import requests
response = requests.get("https://brk.openonchain.dev/api/vecs/indexes")
data = response.json()
print(data)
```
- **What it does:** Fetches the vector indexes and prints them as a Python object.

## 5. Fetch Data in JavaScript (Frontend Example)
```javascript
fetch('https://brk.openonchain.dev/api/vecs/indexes')
  .then(response => response.json())
  .then(data => console.log(data));
```
- **What it does:** Fetches the vector indexes and logs them to the browser console.

## 6. Notes
- All requests should use `https://brk.openonchain.dev` as the base URL.
- Endpoints and parameters may vary; check your BRK API documentation for more details.
- No authentication is required unless you have configured it.

---

**Use these examples as templates for your frontend or backend code to pull and display BRK data.**

---

# Next.js Project Bootstrapped with create-next-app

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
