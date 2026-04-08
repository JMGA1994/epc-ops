import { Currency } from "@prisma/client";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  MXN: "MX$",
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  USD: "en-US",
  EUR: "es-ES",
  MXN: "es-MX",
};

export function formatCurrency(
  amount: number | string,
  currency: Currency = "USD"
): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function toUSD(amount: number, rateVsUsd: number): number {
  // rate_vs_usd = how many units of the currency = 1 USD
  // e.g. for MXN: rate = 17.5 means 17.5 MXN = 1 USD
  return amount / rateVsUsd;
}

export function currencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}
