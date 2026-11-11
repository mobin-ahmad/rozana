import { Currency, SystemSettings } from '../types';

export const defaultCurrencies: Currency[] = [
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs.', exchange_rate: 1.0, is_base: true, is_active: true },
  { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 0.0036, is_base: false, is_active: true },
  { code: 'EUR', name: 'Euro', symbol: '€', exchange_rate: 0.0033, is_base: false, is_active: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', exchange_rate: 0.0028, is_base: false, is_active: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', exchange_rate: 0.30, is_base: false, is_active: true },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', exchange_rate: 0.013, is_base: false, is_active: true },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', exchange_rate: 0.014, is_base: false, is_active: true },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', exchange_rate: 0.44, is_base: false, is_active: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', exchange_rate: 0.0049, is_base: false, is_active: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', exchange_rate: 0.0054, is_base: false, is_active: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', exchange_rate: 0.55, is_base: false, is_active: true },
  { code: 'CNY', name: 'Chinese Yuan', symbol: 'CN¥', exchange_rate: 0.026, is_base: false, is_active: true },
];

/**
 * Convert an amount from base currency to target display currency
 */
export function convertAmount(
  amountInBase: number,
  targetCurrencyCode: string,
  settingsCurrencies: Currency[] = defaultCurrencies,
  baseCurrencyCode: string = 'PKR'
): number {
  if (!amountInBase || amountInBase === 0) return 0;

  const baseCurr = settingsCurrencies.find((c) => c.code === baseCurrencyCode) ||
    settingsCurrencies.find((c) => c.is_base) ||
    defaultCurrencies[0];

  const targetCurr = settingsCurrencies.find((c) => c.code === targetCurrencyCode || c.symbol === targetCurrencyCode) || baseCurr;

  if (baseCurr.code === targetCurr.code) return amountInBase;

  // Convert from base currency to target currency using exchange rates
  const baseRate = baseCurr.exchange_rate || 1.0;
  const targetRate = targetCurr.exchange_rate || 1.0;

  const converted = (amountInBase / baseRate) * targetRate;
  return Math.round(converted * 100) / 100;
}

/**
 * Convert an amount from target display currency back to base currency
 */
export function convertToBaseAmount(
  amountInTarget: number,
  targetCurrencyCode: string,
  settingsCurrencies: Currency[] = defaultCurrencies,
  baseCurrencyCode: string = 'PKR'
): number {
  if (!amountInTarget || amountInTarget === 0) return 0;

  const baseCurr = settingsCurrencies.find((c) => c.code === baseCurrencyCode) ||
    settingsCurrencies.find((c) => c.is_base) ||
    defaultCurrencies[0];

  const targetCurr = settingsCurrencies.find((c) => c.code === targetCurrencyCode || c.symbol === targetCurrencyCode) || baseCurr;

  if (baseCurr.code === targetCurr.code) return amountInTarget;

  const baseRate = baseCurr.exchange_rate || 1.0;
  const targetRate = targetCurr.exchange_rate || 1.0;

  const converted = (amountInTarget / targetRate) * baseRate;
  return Math.round(converted * 100) / 100;
}

/**
 * Format a numeric currency value with symbol and proper locale formatting
 */
export function formatCurrencyValue(
  amount: number,
  currencyCode: string = 'PKR',
  currencies: Currency[] = defaultCurrencies,
  showCode: boolean = false
): string {
  const codeOrSym = currencyCode || 'PKR';
  const curr = currencies.find((c) => c.code === codeOrSym || c.symbol === codeOrSym) ||
    defaultCurrencies.find((c) => c.code === codeOrSym || c.symbol === codeOrSym) || {
      symbol: (codeOrSym === 'PKR' || codeOrSym === 'Rs.' || codeOrSym === 'Rs') ? 'Rs.' : codeOrSym,
      code: 'PKR',
    };

  const isNegative = (amount || 0) < 0;
  const absAmount = Math.abs(amount || 0);

  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(absAmount);

  const symbolStr = curr.symbol || 'Rs.';
  const prefix = isNegative ? '-' : '';

  if (showCode) {
    return `${prefix}${symbolStr} ${formattedNum} ${curr.code}`;
  }
  return `${prefix}${symbolStr} ${formattedNum}`;
}

/**
 * Convert and format in one step
 */
export function formatConvertedCurrency(
  baseAmount: number,
  settings: SystemSettings,
  targetCode?: string
): string {
  const targetCurrency = targetCode || settings.active_display_currency || settings.base_currency || 'BDT';
  const currencies = settings.currencies || defaultCurrencies;
  const baseCode = settings.base_currency || 'BDT';

  const converted = convertAmount(baseAmount, targetCurrency, currencies, baseCode);
  return formatCurrencyValue(converted, targetCurrency, currencies);
}

/**
 * Return formatted dual-currency string (e.g. "$ 1,000 USD (৳ 119,000 BDT)")
 */
export function formatDualCurrency(
  baseAmount: number,
  settings: SystemSettings,
  targetCode?: string
): { primary: string; secondary?: string } {
  const baseCode = settings.base_currency || 'BDT';
  const displayCode = targetCode || settings.active_display_currency || baseCode;
  const currencies = settings.currencies || defaultCurrencies;

  const primaryFormatted = formatConvertedCurrency(baseAmount, settings, displayCode);

  if (displayCode === baseCode) {
    return { primary: primaryFormatted };
  }

  const baseFormatted = formatCurrencyValue(baseAmount, baseCode, currencies, true);
  return {
    primary: primaryFormatted,
    secondary: `(${baseFormatted})`,
  };
}
