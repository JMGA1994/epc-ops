import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProposalSchema } from "@/lib/validations/proposal";
import { getExchangeRate } from "@/lib/queries/exchange-rates";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deal_id = searchParams.get("deal_id");

  const proposals = await prisma.proposal.findMany({
    where: { ...(deal_id && { deal_id }) },
    orderBy: [{ deal_id: "asc" }, { version: "desc" }],
  });

  return NextResponse.json({ data: proposals });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createProposalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Get current version for this deal
  const lastProposal = await prisma.proposal.findFirst({
    where: { deal_id: parsed.data.deal_id },
    orderBy: { version: "desc" },
  });
  const version = (lastProposal?.version ?? 0) + 1;

  // Get exchange rate at today's date
  const exchangeRate = await getExchangeRate(parsed.data.currency);
  const amountUsd = parsed.data.amount / exchangeRate;

  const proposal = await prisma.proposal.create({
    data: {
      ...parsed.data,
      version,
      exchange_rate: exchangeRate,
      amount_usd: amountUsd,
    },
  });

  return NextResponse.json({ data: proposal }, { status: 201 });
}
