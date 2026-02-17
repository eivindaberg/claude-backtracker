import type { ParsedTrade, RoundTrip, OpenPosition } from '$lib/types';

interface BuyLot {
	trade: ParsedTrade;
	remainingQuantity: number;
}

function daysBetween(a: Date, b: Date): number {
	return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** Convert a fee amount to NOK given the fee's currency and an exchange rate */
function feeInNOK(fee: number, feeCurrency: string, exchangeRate: number): number {
	if (feeCurrency === 'NOK' || exchangeRate <= 0) return fee;
	return fee * exchangeRate;
}

export function matchTrades(trades: ParsedTrade[]): {
	roundTrips: RoundTrip[];
	openPositions: OpenPosition[];
} {
	// Group trades by ISIN
	const byIsin = new Map<string, ParsedTrade[]>();
	for (const trade of trades) {
		const existing = byIsin.get(trade.isin) || [];
		existing.push(trade);
		byIsin.set(trade.isin, existing);
	}

	const roundTrips: RoundTrip[] = [];
	const openPositions: OpenPosition[] = [];

	for (const [isin, isinTrades] of byIsin) {
		// Sort by trade date, then buys before sells on same date
		const sorted = [...isinTrades].sort((a, b) => {
			const dateDiff = a.tradeDate.getTime() - b.tradeDate.getTime();
			if (dateDiff !== 0) return dateDiff;
			// Buys before sells on the same day
			if (a.type === 'buy' && b.type === 'sell') return -1;
			if (a.type === 'sell' && b.type === 'buy') return 1;
			return 0;
		});

		const buyQueue: BuyLot[] = [];

		for (const trade of sorted) {
			if (trade.type === 'buy') {
				buyQueue.push({ trade, remainingQuantity: trade.quantity });
			} else {
				// Sell: consume buy lots FIFO
				let sellRemaining = trade.quantity;

				while (sellRemaining > 0 && buyQueue.length > 0) {
					const lot = buyQueue[0];
					const matched = Math.min(sellRemaining, lot.remainingQuantity);

					const buyFraction = matched / lot.trade.quantity;
					const sellFraction = matched / trade.quantity;

					const isForeignCurrency = trade.currency !== 'NOK';

					let buyAmountNOK: number;
					let sellAmountNOK: number;
					let profitNOK: number;

					if (isForeignCurrency) {
						// For foreign currency trades, calculate P&L in trade currency
						// then convert at a consistent exchange rate to avoid phantom FX effects.
						// Use best available rate: sell's rate, then buy's rate.
						const rate = trade.exchangeRate > 0
							? trade.exchangeRate
							: lot.trade.exchangeRate > 0
								? lot.trade.exchangeRate
								: 1;

						const buyGross = lot.trade.price * matched;
						const sellGross = trade.price * matched;
						buyAmountNOK = buyGross * rate;
						sellAmountNOK = sellGross * rate;

						// Fees may be in NOK or trade currency
						const buyFees = feeInNOK(
							lot.trade.totalFees * buyFraction,
							lot.trade.feeCurrency,
							rate
						);
						const sellFees = feeInNOK(
							trade.totalFees * sellFraction,
							trade.feeCurrency,
							rate
						);
						profitNOK = (sellGross - buyGross) * rate - buyFees - sellFees;
					} else {
						// NOK trades: use the actual amountNOK directly
						buyAmountNOK = Math.abs(lot.trade.amountNOK) * buyFraction;
						sellAmountNOK = Math.abs(trade.amountNOK) * sellFraction;
						profitNOK = sellAmountNOK - buyAmountNOK;
					}

					const profitPercent = buyAmountNOK > 0 ? (profitNOK / buyAmountNOK) * 100 : 0;
					const holdDays = daysBetween(lot.trade.tradeDate, trade.tradeDate);

					roundTrips.push({
						instrument: trade.instrument,
						isin,
						buyDate: lot.trade.tradeDate,
						sellDate: trade.tradeDate,
						quantity: matched,
						buyPrice: lot.trade.price,
						sellPrice: trade.price,
						buyAmountNOK,
						sellAmountNOK,
						profitNOK,
						profitPercent,
						holdDays,
						currency: trade.currency
					});

					lot.remainingQuantity -= matched;
					sellRemaining -= matched;

					if (lot.remainingQuantity <= 0) {
						buyQueue.shift();
					}
				}

				if (sellRemaining > 0) {
					console.warn(
						`Warning: ${trade.instrument} has ${sellRemaining} shares sold without matching buys`
					);
				}
			}
		}

		// Remaining buy lots are open positions
		const remainingLots = buyQueue.filter((lot) => lot.remainingQuantity > 0);
		if (remainingLots.length > 0) {
			const totalQuantity = remainingLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
			const totalCostNOK = remainingLots.reduce((sum, lot) => {
				const fraction = lot.remainingQuantity / lot.trade.quantity;
				return sum + Math.abs(lot.trade.amountNOK) * fraction;
			}, 0);
			const weightedPrice =
				remainingLots.reduce((sum, lot) => sum + lot.trade.price * lot.remainingQuantity, 0) /
				totalQuantity;

			openPositions.push({
				instrument: remainingLots[0].trade.instrument,
				isin,
				quantity: totalQuantity,
				avgBuyPrice: weightedPrice,
				totalCostNOK,
				currency: remainingLots[0].trade.currency,
				firstBuyDate: remainingLots[0].trade.tradeDate,
				lastBuyDate: remainingLots[remainingLots.length - 1].trade.tradeDate
			});
		}
	}

	// Sort round trips by sell date
	roundTrips.sort((a, b) => a.sellDate.getTime() - b.sellDate.getTime());

	return { roundTrips, openPositions };
}
