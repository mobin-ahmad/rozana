import { getSettings } from './storage';
import { convertAmount, formatCurrencyValue } from './currency';

export function calcCft(widthInches: number, lengthFeet: number): number {
  if (!widthInches || !lengthFeet || widthInches <= 0 || lengthFeet <= 0) return 0;
  return Math.round(((widthInches * widthInches * lengthFeet) / 2304) * 10000) / 10000;
}

export function formatCurrency(
  amountInBase: number,
  customSymbolOrCode?: string,
  forceRaw: boolean = false
): string {
  if (isNaN(amountInBase) || amountInBase === null || amountInBase === undefined) {
    return 'Rs. 0';
  }

  const settings = getSettings();
  const currencies = (settings.currencies && settings.currencies.length > 0) ? settings.currencies : [];
  const baseCode = settings.base_currency || 'PKR';
  const activeCode = settings.active_display_currency || baseCode;

  if (forceRaw && customSymbolOrCode) {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amountInBase || 0);
    const sym = (customSymbolOrCode === 'PKR' || customSymbolOrCode === 'Rs' || customSymbolOrCode === 'Rs.') ? 'Rs.' : customSymbolOrCode;
    return `${sym} ${formatted}`;
  }

  let targetCode = activeCode;

  if (customSymbolOrCode && customSymbolOrCode !== settings.currency_symbol) {
    const matchCode = currencies.find(
      (c) => c.code.toUpperCase() === customSymbolOrCode.toUpperCase()
    );
    if (matchCode) {
      targetCode = matchCode.code;
    } else {
      const matchSymbol = currencies.find((c) => c.symbol === customSymbolOrCode);
      if (matchSymbol) {
        targetCode = matchSymbol.code;
      }
    }
  }

  // Convert amount from base currency to target display currency
  const converted = convertAmount(amountInBase, targetCode, currencies, baseCode);

  return formatCurrencyValue(converted, targetCode, currencies);
}

export function formatCft(cft: number): string {
  return `${(cft || 0).toFixed(2)} CFT`;
}
