export interface ParsedTrade {
	id: string;
	tradeDate: Date;
	type: 'buy' | 'sell';
	instrument: string;
	isin: string;
	quantity: number;
	price: number; // in trade currency
	totalFees: number; // in fee currency (usually NOK, check feeCurrency)
	feeCurrency: string; // currency of totalFees
	amount: number; // Beløp value (negative for buys) — may be NOK or trade currency
	amountCurrency: string; // currency of the amount field
	amountNOK: number; // total amount converted to NOK (computed)
	purchaseValue: number; // cost basis in trade currency (buys only)
	result: number; // realized P&L in trade currency (sells only)
	totalQuantity: number; // position size after trade
	exchangeRate: number; // best available NOK/foreign rate (Vekslingskurs or Valutakurs)
	currency: string; // trade currency (from purchaseValue or result currency)
}

export interface RoundTrip {
	instrument: string;
	isin: string;
	buyDate: Date;
	sellDate: Date;
	quantity: number;
	buyPrice: number; // per share in trade currency
	sellPrice: number; // per share in trade currency
	buyAmountNOK: number;
	sellAmountNOK: number;
	profitNOK: number;
	profitPercent: number;
	holdDays: number;
	currency: string;
}

export interface OpenPosition {
	instrument: string;
	isin: string;
	quantity: number;
	avgBuyPrice: number;
	totalCostNOK: number;
	currency: string;
	firstBuyDate: Date;
	lastBuyDate: Date;
}

export interface SummaryStats {
	totalTrades: number;
	totalBuys: number;
	totalSells: number;
	totalRoundTrips: number;
	totalProfitNOK: number;
	winRate: number; // 0-100
	avgHoldDays: number;
	medianHoldDays: number;
	bestTradeNOK: number;
	bestTradeInstrument: string;
	worstTradeNOK: number;
	worstTradeInstrument: string;
	uniqueInstruments: number;
	tradingPeriodDays: number;
	firstTradeDate: Date;
	lastTradeDate: Date;
	openPositions: number;
}

export interface DispositionAnalysis {
	avgHoldDaysWinners: number;
	avgHoldDaysLosers: number;
	medianHoldDaysWinners: number;
	medianHoldDaysLosers: number;
	dispositionRatio: number; // losers hold / winners hold
	severity: 'none' | 'mild' | 'moderate' | 'severe';
	winnersCount: number;
	losersCount: number;
	prematureSells: PrematureSell[];
}

export interface PrematureSell {
	instrument: string;
	sellDate: Date;
	holdDays: number;
	profitPercent: number;
}

export interface TimingAnalysis {
	tradesPerWeek: number;
	tradesPerMonth: { month: string; count: number }[];
	busiestMonth: string;
	busiestMonthCount: number;
	revengeTrades: RevengeTrade[];
	revengeTradeCount: number;
	dayOfWeekDistribution: { day: string; count: number }[];
	winStreaks: Streak[];
	lossStreaks: Streak[];
	longestWinStreak: number;
	longestLossStreak: number;
}

export interface RevengeTrade {
	lossTrade: RoundTrip;
	followUpBuy: ParsedTrade;
	daysBetween: number;
}

export interface Streak {
	length: number;
	startDate: Date;
	endDate: Date;
	totalProfitNOK: number;
}

export interface SizingAnalysis {
	avgPositionSizeNOK: number;
	medianPositionSizeNOK: number;
	minPositionSizeNOK: number;
	maxPositionSizeNOK: number;
	sizeStdDev: number;
	concentrationTop3Percent: number; // % of total capital in top 3 positions
	sizeVsOutcome: SizeVsOutcome[];
	positionSizeConsistency: 'consistent' | 'moderate' | 'inconsistent';
}

export interface SizeVsOutcome {
	sizeQuartile: string; // 'Small', 'Medium', 'Large', 'Very Large'
	avgReturnPercent: number;
	count: number;
	winRate: number;
}

export interface PerStockAnalysis {
	instrument: string;
	isin: string;
	roundTrips: number;
	wins: number;
	losses: number;
	winRate: number;
	totalProfitNOK: number;
	avgProfitPercent: number;
	avgHoldDays: number;
	pattern: string; // e.g., "Consistent loser", "Quick flipper"
}

export interface AnalysisReport {
	summary: SummaryStats;
	disposition: DispositionAnalysis;
	timing: TimingAnalysis;
	sizing: SizingAnalysis;
	perStock: PerStockAnalysis[];
	roundTrips: RoundTrip[];
	openPositions: OpenPosition[];
}

// --- Phase 2 types ---

export interface TickerMapping {
	instrument: string;
	isin: string;
	ticker: string;
	status: 'confirmed' | 'skipped' | 'pending';
	isNorwegianFund: boolean;
}

export interface PricePoint {
	date: string; // YYYY-MM-DD
	close: number;
}

export interface TickerPriceHistory {
	ticker: string;
	isin: string;
	prices: PricePoint[];
}

export interface EntryTimingItem {
	instrument: string;
	isin: string;
	buyDate: Date;
	buyPrice: number;
	priceChange7d: number; // % change in 7 days before buy
	priceChange30d: number; // % change in 30 days before buy
	pattern: 'after-runup' | 'during-dip' | 'neutral';
}

export interface EntryTimingReport {
	items: EntryTimingItem[];
	pctAfterRunup: number;
	pctDuringDip: number;
	pctNeutral: number;
	topFomoBuys: EntryTimingItem[]; // biggest run-ups before purchase
}

export interface PostSellWindow {
	days: number;
	pctChange: number | null; // null if price data unavailable for this window
	estimatedNOK: number; // gain/loss in NOK based on sellAmountNOK
}

export interface PostSellItem {
	instrument: string;
	isin: string;
	sellDate: Date;
	sellPrice: number;
	sellAmountNOK: number;
	windows: PostSellWindow[]; // 30d, 90d, 365d
}

export interface PostSellWindowSummary {
	days: number;
	label: string; // "30 days", "3 months", "1 year"
	avgPctChange: number;
	pctWouldHaveGained: number; // % of sells where holding longer would have been better
	totalMissedNOK: number; // sum of positive outcomes
	totalDodgedNOK: number; // sum of negative outcomes (absolute)
	itemCount: number; // how many sells have data for this window
}

export interface PostSellReport {
	items: PostSellItem[];
	windowSummaries: PostSellWindowSummary[];
	biggestMissedOpportunities: (PostSellItem & { windowPct: number; windowDays: number })[]; // best 90d missed gains
}

// --- Averaging Down ---

export interface AveragingDownSequence {
	instrument: string;
	isin: string;
	buys: { date: Date; price: number; quantity: number }[];
	priceDrop: number; // % drop from first to last buy in the sequence
	outcome: 'sold-at-loss' | 'sold-at-profit' | 'open';
	profitNOK?: number;
}

export interface AveragingDownReport {
	sequences: AveragingDownSequence[];
	totalInstances: number;
	pctEndedInLoss: number;
	avgPriceDropPct: number;
}

// --- Break-Even Anchoring ---

export interface AnchoringReport {
	sellsNearBreakEven: number; // within ±3% of avg buy price
	totalSells: number;
	pctNearBreakEven: number;
	severity: 'none' | 'mild' | 'strong';
	examples: { instrument: string; pctFromBreakEven: number; holdDays: number }[];
}

// --- Conviction (sizing enhancement) ---

export interface ConvictionVerdict {
	bigBetsAvgReturn: number;
	smallBetsAvgReturn: number;
	bigBetsWinRate: number;
	smallBetsWinRate: number;
	verdict: 'big-bets-outperform' | 'big-bets-underperform' | 'similar';
}

export interface TradingRule {
	number: number;
	title: string;
	description: string;
	evidence: string;
}

export interface CoachingResponse {
	narrative: string;
	rules: TradingRule[];
}

export interface ExtendedAnalysisReport extends AnalysisReport {
	entryTiming?: EntryTimingReport;
	postSell?: PostSellReport;
	averagingDown?: AveragingDownReport;
	anchoring?: AnchoringReport;
	conviction?: ConvictionVerdict;
	coaching?: CoachingResponse;
}
