import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";
import { z } from "zod";

const createRateSchema = z.object({
  currency: z.nativeEnum(Currency),
  date: z.string().min(1),
  rate_vs_usd: z.number().positive(),
});

export async function GET() {
  const rates = await prisma.exchangeRate.findMany({
    orderBy: [{ currency: "asc" }, { date: "desc" }],
  });
  return NextResponse.json({ data: rates });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createRateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rate = await prisma.exchangeRate.upsert({
    where: {
      currency_date: {
        currency: parsed.data.currency,
        date: new Date(parsed.data.date),
      },
    },
    update: { rate_vs_usd: parsed.data.rate_vs_usd },
    create: {
      currency: parsed.data.currency,
      date: new Date(parsed.data.date),
      rate_vs_usd: parsed.data.rate_vs_usd,
    },
  });

  return NextResponse.json({ data: rate }, { status: 201 });
}
