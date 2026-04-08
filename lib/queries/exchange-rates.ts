import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";

/**
 * Returns the most recent exchange rate for a currency on or before a given date.
 * This ensures historical immutability: invoices always use the rate at emission time.
 */
export async function getExchangeRate(
  currency: Currency,
  date: Date = new Date()
): Promise<number> {
  if (currency === "USD") return 1;

  const rate = await prisma.exchangeRate.findFirst({
    where: {
      currency,
      date: { lte: date },
    },
    orderBy: { date: "desc" },
  });

  if (!rate) {
    throw new Error(
      `No exchange rate found for ${currency} on or before ${date.toISOString()}`
    );
  }

  return Number(rate.rate_vs_usd);
}

/**
 * Get all exchange rates grouped by currency, most recent first.
 */
export async function getAllExchangeRates() {
  return prisma.exchangeRate.findMany({
    orderBy: [{ currency: "asc" }, { date: "desc" }],
  });
}
