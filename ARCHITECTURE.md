# Backtracker — Architecture

## Overview

Backtracker analyzes stock trading behavior from Nordnet CSV exports. It runs analysis client-side, fetches market data server-side, and sends only anonymized aggregate stats to an LLM for coaching.

**Core principle:** Raw trade data never reaches the LLM. Only behavioral statistics do.

## System Diagram

```
                                 BROWSER (Client)
 ┌──────────────────────────────────────────────────────────────────────┐
 │                                                                      │
 │  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐  │
 │  │ CSV Upload   │───>│ Nordnet      │───>│ Ticker Mapping UI       │  │
 │  │ (drag/drop)  │    │ Parser       │    │ (confirm/skip/edit)     │  │
 │  │              │    │ UTF-16 → TSV │    │                         │  │
 │  └─────────────┘    └──────────────┘    └────────────┬────────────┘  │
 │                                                      │               │
 │                                                      ▼               │
 │                                          ┌───────────────────────┐   │
 │                                          │ FIFO Trade Matcher    │   │
 │                                          │ (buy→sell pairing)    │   │
 │                                          └───────────┬───────────┘   │
 │                                                      │               │
 │                                                      ▼               │
 │  ┌───────────────────────────────────────────────────────────────┐   │
 │  │                    Analysis Engine (all client-side)           │   │
 │  │  ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ │   │
 │  │  │Disposition│ │Timing  │ │Sizing  │ │Per-Stock │ │Summary │ │   │
 │  │  │Effect    │ │Patterns│ │Analysis│ │Patterns  │ │Stats   │ │   │
 │  │  └──────────┘ └────────┘ └────────┘ └──────────┘ └────────┘ │   │
 │  └───────────────────────────────────┬───────────────────────────┘   │
 │                                      │                               │
 │               ┌──────────────────────┼──────────────────────┐        │
 │               ▼                      ▼                      ▼        │
 │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
 │  │ Entry Timing     │  │ Post-Sell        │  │ Anonymizer       │   │
 │  │ (FOMO detection) │  │ (missed gains)   │  │ (strips all PII) │   │
 │  │ needs prices ◄───┤  │ needs prices ◄───┤  │                  │   │
 │  └──────────────────┘  └──────────────────┘  └────────┬─────────┘   │
 │                                                        │             │
 │  ┌─────────────────────────────────────────────────────┼──────────┐  │
 │  │                   Report (single page)              │          │  │
 │  │  Summary · Disposition · Timing · Sizing · Stocks   │          │  │
 │  │  Entry Timing · Post-Sell · PnL Timeline · Trades   │          │  │
 │  │  Coaching Narrative · Trading Rulebook ◄────────────┤          │  │
 │  └─────────────────────────────────────────────────────┼──────────┘  │
 │                                                        │             │
 └────────────────────────────────────────────────────────┼─────────────┘
                                                          │
                         SVELTEKIT SERVER                 │
 ┌────────────────────────────────────────────────────────┼─────────────┐
 │                                                        │             │
 │  /api/ticker-search ──────────> Yahoo Finance          │             │
 │  (ISIN/name lookup)            Search API              │             │
 │                                                        │             │
 │  /api/prices ─────────────────> Yahoo Finance          │             │
 │  (historical daily closes)      Historical API         │             │
 │                                                        │             │
 │  /api/analyze ────────────────> Anthropic API          │             │
 │  (anonymized stats only) ◄──────────────────────────────             │
 │                                                        │             │
 └──────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Step 1 — CSV Upload & Parse (Client)

```
User's Nordnet CSV ─── UTF-16 decode ─── Tab-split ─── Filter KJØPT/SALG
                                                              │
                                                              ▼
                                                      ParsedTrade[]
                                                      (stays in browser)
```

The CSV never leaves the browser. Parsing handles UTF-16LE encoding, Norwegian column headers, comma decimals, and multi-currency portfolios (NOK, USD, CAD).

### Step 2 — Ticker Mapping (Client + Server)

The user confirms mappings from Nordnet instrument names to Yahoo Finance tickers. 60+ instruments are hardcoded. Unknown instruments are auto-searched via the server.

### Step 3 — Analysis (Client)

All behavioral analysis runs in the browser:

| Module | What it computes |
|--------|-----------------|
| `fifo.ts` | FIFO buy→sell matching, multi-currency P&L |
| `disposition.ts` | Hold time winners vs losers, disposition ratio |
| `timing.ts` | Overtrading, revenge trades, streaks, day-of-week |
| `sizing.ts` | Position size consistency, concentration risk |
| `per-stock.ts` | Per-instrument win rate, pattern classification |
| `summary.ts` | Aggregate stats (win rate, total P&L, trade count) |

### Step 4 — Market Data (Server → Yahoo Finance)

Price data is fetched server-side to avoid CORS issues. Used for two optional analyses:

- **Entry Timing:** Was the stock running up before you bought? (FOMO detection)
- **Post-Sell:** What happened to the price after you sold? (missed gains vs dodged losses)

### Step 5 — AI Coaching (Server → Claude API)

This is the critical privacy boundary:

```
Full Analysis Report          Anonymizer           Claude API
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 47 round trips  │     │ totalRoundTrips: │     │                 │
│ NVDA: +45%      │────>│   47             │────>│ "You hold losers│
│ SNOW: -23%      │     │ winRate: 42      │     │  3x longer than │
│ Buy: 2023-03-15 │     │ avgHoldDays: 23  │     │  winners..."    │
│ Sell: 2023-04-02│     │ dispositionRatio:│     │                 │
│ Amount: 45,000  │     │   3.1            │     │ Rule 1: Never   │
│ ...             │     │ revengeTradeCount│     │ sell within 30d │
│                 │     │   : 4            │     │ ...             │
└─────────────────┘     │ ...21 fields     │     └─────────────────┘
                        └─────────────────┘
    FULL DATA              ANONYMIZED              COACHING
    (stays local)          (sent to API)           (returned)
```

**What gets sent (21 anonymized fields):**

```
Summary:      totalRoundTrips, winRate, avgHoldDays, medianHoldDays, tradingPeriodDays
Disposition:  avgHoldDaysWinners/Losers, dispositionRatio, severity, prematureSellCount
Timing:       tradesPerWeek, revengeTradeCount, longestWin/LossStreak
Sizing:       positionSizeConsistency, concentrationTop3Percent
Patterns:     consistentLoserCount, reliableWinnerCount, quickFlipperCount, overtradedLoserCount
Price-based:  pctBoughtAfterRunup, pctBoughtDuringDip, pctSoldTooEarly (optional)
```

**What is never sent:**
- Stock names, tickers, or ISIN codes
- Trade dates or time periods
- Trade amounts, prices, or account values
- Individual trade details
- Number of shares or position sizes in currency

## Cost Analysis

### Per-Analysis Cost

| Service | Calls | Cost per call | Cost per analysis |
|---------|-------|--------------|-------------------|
| **Claude API** (Sonnet) | 1 | ~$0.01-0.02 | **~$0.015** |
| **Yahoo Finance** (prices) | ~10-50 tickers | Free | **$0** |
| **Yahoo Finance** (search) | ~5-20 lookups | Free | **$0** |
| **Vercel** (serverless) | ~3 function calls | Free tier | **$0** |

**Breakdown of Claude API cost:**
- Input: ~800-1,200 tokens (system prompt + 21 stat fields)
- Output: ~800-1,500 tokens (narrative + 5-8 rules)
- At Sonnet pricing ($3/M input, $15/M output): **~$0.01-0.03 per analysis**

### Scaling Scenarios

| Users/month | Analyses/month | Claude API cost | Vercel cost | Total |
|-------------|---------------|-----------------|-------------|-------|
| 10 | 30 | $0.45 | Free tier | **~$0.50** |
| 100 | 300 | $4.50 | Free tier | **~$5** |
| 1,000 | 3,000 | $45 | Free tier | **~$45** |
| 10,000 | 30,000 | $450 | ~$20 Pro | **~$470** |
| 50,000 | 150,000 | $2,250 | ~$20 Pro | **~$2,270** |

### Why Costs Stay Low

1. **No database** — stateless, no storage costs
2. **Client-side analysis** — the heavy computation (FIFO matching, 5 analysis modules) runs in the browser, not on the server
3. **Minimal LLM tokens** — only 21 aggregate stats sent, not raw trades. A portfolio with 500 trades sends the same ~1,000 tokens as one with 50 trades
4. **Yahoo Finance is free** — no market data costs
5. **One LLM call per analysis** — not per-trade or per-instrument

### Cost Optimization Levers (if needed)

| Lever | Savings | Trade-off |
|-------|---------|-----------|
| Switch to Haiku | ~80% | Slightly less nuanced coaching |
| Cache coaching for identical stat profiles | ~50-70% | Repeat users get same advice |
| Make coaching opt-in | ~90% | Users must click "Generate coaching" |
| Rate limit to 3 analyses/day/IP | Prevents abuse | Limits power users |

### Break-Even Pricing

If monetized at **$1/analysis** (or $5/month subscription):

| Pricing | Users needed to break even |
|---------|---------------------------|
| $1/analysis | 50 analyses/month covers 1,000 users |
| $5/month | 10 subscribers covers 1,000 free users |
| Freemium (3 free, then $2) | Self-sustaining at ~500 active users |

## Tech Stack

```
Frontend:    SvelteKit 5 + Tailwind CSS + svelte-sonner (toasts)
Backend:     SvelteKit server routes (API proxies only)
LLM:         Claude Sonnet 4.5 via Anthropic SDK
Market Data: yahoo-finance2 (free, no API key)
Deployment:  Vercel (serverless)
State:       None — fully stateless, no database
```

## File Structure

```
src/
├── routes/
│   ├── +page.svelte              # State machine: upload → mapping → processing → report
│   ├── +layout.svelte            # Global layout + toast provider
│   └── api/
│       ├── analyze/+server.ts    # Claude API proxy (anonymized stats → coaching)
│       ├── prices/+server.ts     # Yahoo Finance historical prices
│       └── ticker-search/+server.ts  # Yahoo Finance symbol search
└── lib/
    ├── parser/nordnet.ts         # CSV parser (UTF-16, Norwegian, multi-currency)
    ├── matching/fifo.ts          # FIFO buy→sell pairing with currency handling
    ├── mapping/ticker-mapper.ts  # Instrument → Yahoo ticker mapping
    ├── analysis/
    │   ├── engine.ts             # Orchestrates all analysis modules
    │   ├── disposition.ts        # Disposition effect analysis
    │   ├── timing.ts             # Timing patterns (revenge trades, streaks)
    │   ├── sizing.ts             # Position sizing analysis
    │   ├── per-stock.ts          # Per-instrument patterns
    │   ├── summary.ts            # Aggregate statistics
    │   ├── entry-timing.ts       # Pre-buy price movement (FOMO detection)
    │   └── post-sell.ts          # Post-sell price movement
    ├── api/
    │   ├── anonymizer.ts         # Strips PII, outputs 21 aggregate fields
    │   ├── coaching.ts           # Client-side coaching fetch
    │   └── prices.ts             # Client-side price data fetch
    ├── components/
    │   ├── FileUpload.svelte
    │   ├── TickerMapping.svelte
    │   └── report/               # 10 report section components
    └── types/index.ts            # All TypeScript interfaces
```
