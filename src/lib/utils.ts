import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'NOK'): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
	return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatDays(days: number): string {
	if (days < 1) return '<1 day';
	if (days === 1) return '1 day';
	return `${Math.round(days)} days`;
}

export function formatNumber(value: number, decimals = 0): string {
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value);
}
