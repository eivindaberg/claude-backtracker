# CLAUDE.md — Backtracker

## Overview

**Backtracker** is a stock trade analysis tool that identifies behavioral weaknesses from historical trades and generates concrete, actionable trading rules to improve performance. Upload your Nordnet CSV, get a coaching report.

**Tagline:** "Stop making bad decisions. Show me your trades. I'll tell you your weaknesses and how to fix them."

## Stack

- **Framework:** SvelteKit 5
- **Styling:** Tailwind CSS + shadcn-svelte (clean/minimal light theme, lots of whitespace, focused on readability)
- **Charts:** Developer's choice (Lightweight Charts from TradingView recommended for financial data)
- **CSV Parsing:** Client-side (PapaParse or similar)
- **Market Data:** Yahoo Finance (free), fetched server-side via SvelteKit server routes
- **LLM:** Anthropic Claude API (server-side), receives only pre-computed aggregated stats — never raw trade data
- **Deployment:** Vercel
- **Language:** English (all UI and analysis output)

## Architecture

### Data Flow

1. **Client:** User uploads Nordnet CSV
2. **Client:** CSV parsed in browser (UTF-16 tab-delimited, Norwegian column headers, comma decimals)
3. **Client:** User confirms/corrects ticker mapping (Nordnet instrument names → Yahoo Finance tickers, e.g., "Equinor" → "EQNR.OL")
4. **Server:** Fetch historical price data from Yahoo Finance for all mapped tickers
5. **Server:** Compute all metrics and behavioral analysis algorithmically
6. **Server:** Send only aggregated summary stats to Claude API (no raw trades, tickers, amounts, or dates)
7. **Server:** Claude generates coaching narrative and trading rulebook
8. **Client:** Render single-page report

### Privacy Model

Raw trade data never leaves the browser/server boundary to the LLM. Only pre-computed, anonymized aggregate statistics are sent to the Anthropic API. Example of what gets sent: "User holds losing positions 3x longer than winning ones. Win rate: 45%. Average hold time: 23 days." This means actual stock names, trade amounts, and dates are never exposed to the LLM.

## Data Input

### Nordnet CSV Format

- Source: Nordnet "Transaksjoner og notater" export
- File: `data/transactions-and-notes-export.csv`
- Encoding: **UTF-16** (must convert to UTF-8 before parsing)
- Delimiter: **Tab-separated** (TSV)
- Column headers are in **Norwegian**
- Decimal separator: **comma** (e.g., `29,42` not `29.42`)
- Only Nordnet format is supported initially

#### Columns

| Column | Norwegian Header | Description |
|--------|-----------------|-------------|
| Id | Id | Transaction ID |
| Booking date | Bokføringsdag | Date booked |
| Trade date | Handelsdag | Date traded (use this) |
| Settlement date | Oppgjørsdag | Settlement date |
| Portfolio | Portefølje | Portfolio ID |
| Transaction type | Transaksjonstype | `KJØPT` (buy) or `SALG` (sell) |
| Security | Verdipapir | Instrument name (e.g., "GitLab A", "Snowflake Inc.") |
| ISIN | ISIN | ISIN code (e.g., US37637K1088) |
| Quantity | Antall | Number of shares |
| Price | Kurs | Price per share (in trade currency) |
| Interest | Rente | Interest (usually 0 for stocks) |
| Total fees | Totale Avgifter | Fees in NOK |
| Currency | Valuta | Currency of fees/amount (NOK) |
| Amount | Beløp | Total amount in NOK (negative for buys) |
| Currency | Valuta | Currency of amount |
| Purchase value | Kjøpsverdi | Cost basis (for buys, in trade currency) |
| Currency | Valuta | Currency of purchase value (e.g., USD) |
| Result | Resultat | Realized P&L (for sells, in trade currency) |
| Currency | Valuta | Currency of result |
| Total quantity | Totalt antall | Position size after trade |
| Balance | Saldo | Account balance after trade |
| Exchange rate | Vekslingskurs | NOK/foreign currency rate |
| Transaction text | Transaksjonstekst | Free text (usually empty) |
| Cancellation date | Makuleringsdato | Cancellation date (usually empty) |
| Trade note no. | Sluttseddelnummer | Trade confirmation number |
| Verification no. | Verifikationsnummer | Verification number |
| Commission | Kurtasje | Brokerage commission |
| Currency | Valuta | Currency of commission |
| Currency rate | Valutakurs | Currency rate (usually empty) |
| Opening interest | Innledende rente | Opening interest (usually empty) |

#### Sample Data Profile

- **220 rows** (125 buys, 95 sells)
- **~55 unique instruments** including stocks, ETFs, and funds
- Most traded: GitLab (18), Snowflake (10), Datadog (10), Monday.com (9)
- Mix of US stocks and Norwegian funds (Landkreditt, KLP, DNB)
- Trades denominated in USD and NOK
- Date range: check actual file for earliest/latest trades

### Ticker Mapping

Nordnet uses instrument names (e.g., "Equinor"), not Yahoo Finance tickers (e.g., "EQNR.OL"). After CSV parsing, show the user a mapping confirmation step where detected instrument names are listed and the user can confirm or correct each ticker symbol.

### Scope

- **Asset classes:** Stocks only
- **Trade volume:** 100–500 trades expected
- **Open positions:** Excluded from analysis (only completed buy→sell round-trips are analyzed)

## Analysis & Output

### Report Structure (Single Scrollable Page)

**Section 1 — Summary Cards (top)**
Key aggregate stats at a glance.

**Section 2 — Detailed Analysis (middle)**
Charts and data supporting the behavioral analysis:

- **Disposition effect:** Selling winners too early, holding losers too long
- **Timing patterns:** Overtrading, revenge trading after losses, FOMO buying, panic selling
- **Position sizing:** Concentration risk, inconsistent bet sizes, poor risk management
- **Entry timing analysis:** Context around buy decisions (e.g., "You bought after a 20% run-up")
- **Post-sell analysis:** What happened to each stock from sell date until today (current price vs sell price)
- **Per-stock patterns:** Identify stocks where the user consistently underperforms (e.g., "You've traded Equinor 7 times and lost money 6 times")

**Section 3 — Coaching & Rulebook (bottom)**
LLM-generated content:

- **Coaching narrative:** Written like a trading coach review, identifying patterns and explaining why they matter
- **Concrete trading rulebook:** Numbered, specific rules with supporting data (e.g., "Rule 1: Do not sell any position within 365 days of purchase. Evidence: Your average hold time on winners is 12 days, and 73% of your premature sells continued to rise.")
- **Evidence:** Data-heavy — each recommendation backed by specific stats and examples

### No Benchmark Comparison

The tool focuses purely on the user's own behavioral patterns. No comparison against market indices.

## UX Flow

1. Open app → immediately see CSV upload area (no landing page)
2. Upload Nordnet CSV
3. Ticker mapping confirmation step
4. Loading/processing state while server fetches market data and runs analysis
5. Single-page report renders with all sections

## Deployment & Access

- **Current scope:** Personal use, but built to support public access later
- **Hosting:** Vercel
- **No user accounts:** Stateless — upload, analyze, view results. No data persistence.
- **No export:** View in browser only

## Environment Variables

- `ANTHROPIC_API_KEY` — Claude API key (server-side only)
- Never commit `.env` files

## File Structure

```
claude-backtracker/
├── CLAUDE.md
├── .env.example                       # Template for required env vars
├── src/
│   ├── app.html                       # lang="en"
│   ├── app.css                        # Tailwind directives + theme colors
│   ├── app.d.ts
│   ├── routes/
│   │   ├── +layout.svelte             # Imports app.css, Toaster
│   │   ├── +page.svelte               # State machine: upload → mapping → processing → report
│   │   └── api/
│   │       ├── prices/+server.ts      # Yahoo Finance historical price fetcher
│   │       └── analyze/+server.ts     # Claude API coaching generator
│   └── lib/
│       ├── utils.ts                   # cn(), formatCurrency(), formatPercent()
│       ├── types/
│       │   └── index.ts               # All types including Phase 2: TickerMapping, EntryTiming, PostSell, Coaching
│       ├── parser/
│       │   └── nordnet.ts             # UTF-16 tab-delimited parser, comma decimals
│       ├── matching/
│       │   └── fifo.ts                # FIFO buy→sell pairing per instrument
│       ├── mapping/
│       │   └── ticker-mapper.ts       # Nordnet instrument → Yahoo Finance ticker mapping
│       ├── api/
│       │   ├── prices.ts              # Client: fetch price data from /api/prices
│       │   ├── coaching.ts            # Client: fetch coaching from /api/analyze
│       │   └── anonymizer.ts          # Strip PII from report before sending to LLM
│       ├── analysis/
│       │   ├── engine.ts              # Orchestrator: trades → AnalysisReport
│       │   ├── disposition.ts         # Disposition effect (hold losers vs sell winners)
│       │   ├── timing.ts              # Overtrading, revenge trading, streaks
│       │   ├── sizing.ts              # Position sizing consistency, concentration
│       │   ├── per-stock.ts           # Per-instrument patterns
│       │   ├── summary.ts             # Aggregate stats
│       │   ├── entry-timing.ts        # Pre-buy price movement analysis (FOMO detection)
│       │   └── post-sell.ts           # Post-sell price analysis (missed gains/dodged losses)
│       └── components/
│           ├── ui/
│           │   ├── index.ts
│           │   ├── button.svelte
│           │   ├── card.svelte
│           │   └── badge.svelte
│           ├── FileUpload.svelte      # Drag-and-drop CSV upload
│           ├── TickerMapping.svelte   # Ticker confirmation/editing step
│           └── report/
│               ├── SummaryCards.svelte
│               ├── DispositionSection.svelte
│               ├── TimingSection.svelte
│               ├── SizingSection.svelte
│               ├── PerStockSection.svelte
│               ├── PnlTimeline.svelte
│               ├── TradeListTable.svelte
│               ├── EntryTimingSection.svelte   # FOMO buy patterns
│               ├── PostSellSection.svelte      # Missed gains / dodged losses
│               ├── CoachingSection.svelte      # AI coaching narrative + trading rules
│               └── CoachingPlaceholder.svelte  # Fallback when API unavailable
├── data/                              # Nordnet CSV export (UTF-16 TSV)
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
└── .env                               # API keys (not committed)
```
