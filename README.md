# ClarionChain.io

ClarionChain is a next-generation Bitcoin on-chain analytics and AI insights platform, hosted on Vercel. It connects to your private BRK (Bitcoin Research Kit) instance to pull advanced Bitcoin on-chain metrics, and delivers actionable insights, AI-driven analysis, and professional-grade charting for both casual users and pro analysts.

---

## 🚀 What is ClarionChain?

ClarionChain is not just a dashboard for displaying Bitcoin metrics. It is an **AI-powered analytics platform** that:
- **Connects to your BRK instance** (via secure tunnel) to access the full universe of Bitcoin on-chain data.
- **Provides advanced statistical tools** (like a full z-score suite) for deep market analysis.
- **Integrates AI** to deliver instant, actionable insights—so users don't have to manually sift through dozens of charts.
- **Empowers both casual users and professional analysts** with a seamless, modern, dark-mode web experience.

---

## 🎯 Key Features
- **AI Insights:** Ask questions or get instant summaries from an integrated AI trained on Bitcoin on-chain data and market structure.
- **Z-Score Suite:** Multi-timeframe z-score analytics (30d, 90d, 1y, 2y, 8y, etc.) for all major metrics.
- **Pro Charting:** Interactive, high-performance charts for all metrics, with both quick-glance and deep-dive modes.
- **Customizable Dashboards:** Save, share, and organize your favorite metrics and chart layouts.
- **Real-Time Data:** Live updates from your BRK instance, securely tunneled for privacy and performance.
- **Analyst Workbench:** Advanced tools for power users, including custom metric creation, overlays, and export options.
- **Modern UI:** Built with Next.js, shadcn/ui, Tailwind CSS, and Plotly for a beautiful, responsive, and accessible experience.

---

## 🏗️ System Architecture

```
Bitcoin Network
    ↓
Your BRK Instance (private, secure)
    ↓
ClarionChain (Vercel-hosted frontend)
    ↓
AI Insights Engine + Charting Suite
    ↓
User (web, mobile, pro analyst)
```

---

## ⚡ Quick Start

1. **Deploy ClarionChain to Vercel** (or run locally for development)
2. **Connect your BRK instance** (via secure tunnel or public endpoint)
3. **Configure your API endpoint** in the app settings or `.env.local`
4. **Start exploring Bitcoin on-chain data with AI-powered insights!**

---

## 📊 Example Use Cases
- **Get a daily AI summary** of Bitcoin's on-chain health and market structure
- **Ask the AI**: "What is the current MVRV z-score and what does it mean?"
- **View all major metrics** (price, market cap, volume, realized cap, STH/CTH, etc.) in one place
- **Deep-dive with pro charts** or let the AI surface the most important trends
- **Export charts and insights** for research or publication

---

## 🔒 Security & Best Practices
- No credentials or secrets are ever stored in the codebase
- All sensitive config is managed via environment variables (see `.env.example`)
- Secure, read-only access to your BRK instance
- Open-source, auditable codebase

---

## 🛠️ Tech Stack
- **Frontend:** Next.js, React, shadcn/ui, Tailwind CSS, Plotly.js
- **AI/Insights:** Integrated with OpenAI or custom LLMs (configurable)
- **Data Source:** Your private BRK instance (self-hosted, secure)
- **Hosting:** Vercel (or self-hosted)

---

## 📄 License
MIT License. See LICENSE file for details.

---

## 👤 Author & Contact
ClarionChain is developed and maintained by [tjw74](https://github.com/tjw74). For questions, support, or partnership inquiries, please open an issue or contact via GitHub.

---

## 📝 Legacy & Advanced Documentation
For advanced usage, BRK collector details, and API examples, see the legacy documentation below (from My_README.md):

<details>
<summary>Click to expand legacy BRK/collector documentation</summary>

# Bitcoin Research Kit (BRK) Data Collection System

A comprehensive Bitcoin data collection and monitoring system that extracts on-chain metrics from a local BRK instance and stores them in DigitalOcean PostgreSQL with sophisticated statistical analysis.

## System Architecture

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

## Project Structure

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

## Quick Start, Features, Metrics, Security, Performance, Advanced Usage, Monitoring, License, API Guide

(See full My_README.md for details)

</details>

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
