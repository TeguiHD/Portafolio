/**
 * Currency formatting utilities
 * Client-safe version (no server dependencies)
 */

// Supported currencies
export const SUPPORTED_CURRENCIES = [
    'CLP', 'USD', 'EUR', 'BRL', 'ARS', 'MXN', 'PEN', 'COP', 'GBP', 'JPY'
] as const;

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Currency display configuration
const CURRENCY_CONFIG: Record<SupportedCurrency, { symbol: string; decimals: number; locale: string }> = {
    CLP: { symbol: '$', decimals: 0, locale: 'es-CL' },
    USD: { symbol: '$', decimals: 2, locale: 'en-US' },
    EUR: { symbol: '€', decimals: 2, locale: 'de-DE' },
    BRL: { symbol: 'R$', decimals: 2, locale: 'pt-BR' },
    ARS: { symbol: '$', decimals: 0, locale: 'es-AR' },
    MXN: { symbol: '$', decimals: 2, locale: 'es-MX' },
    PEN: { symbol: 'S/', decimals: 2, locale: 'es-PE' },
    COP: { symbol: '$', decimals: 0, locale: 'es-CO' },
    GBP: { symbol: '£', decimals: 2, locale: 'en-GB' },
    JPY: { symbol: '¥', decimals: 0, locale: 'ja-JP' },
};

/**
 * Format a number as currency
 */
export function formatCurrency(
    amount: number,
    currency: SupportedCurrency = 'CLP',
    options?: { compact?: boolean }
): string {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.CLP;
    
    if (options?.compact && Math.abs(amount) >= 1000000) {
        const millions = amount / 1000000;
        return `${config.symbol}${millions.toFixed(1)}M`;
    }
    
    if (options?.compact && Math.abs(amount) >= 1000) {
        const thousands = amount / 1000;
        return `${config.symbol}${thousands.toFixed(0)}K`;
    }

    return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: config.decimals,
        maximumFractionDigits: config.decimals,
    }).format(amount);
}

/**
 * Format a number with thousands separator
 */
export function formatNumber(amount: number, decimals: number = 0): string {
    return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount);
}

/**
 * Parse a formatted currency string back to number
 */
export function parseCurrency(value: string): number {
    const cleaned = value.replace(/[^0-9,-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

/**
 * Get currency configuration
 */
export function getCurrencyConfig(currency: SupportedCurrency) {
    return CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.CLP;
}
