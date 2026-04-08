import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInvoiceSchema } from "@/lib/validations/invoice";
import { getExchangeRate } from "@/lib/queries/exchange-rates";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const project_id = searchParams.get("project_id");
  const status = searchParams.get("status");

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(project_id && { project_id }),
      ...(status && { status: status as any }),
    },
    include: {
      project: {
        include: { deal: { include: { company: { select: { name: true } } } } },
      },
      items: true,
    },
    orderBy: { issue_date: "desc" },
  });

  // Auto-mark overdue
  const now = new Date();
  const overdueIds = invoices
    .filter((inv) => inv.status === "EMITIDA" && new Date(inv.due_date) < now)
    .map((inv) => inv.id);

  if (overdueIds.length > 0) {
    await prisma.invoice.updateMany({
      where: { id: { in: overdueIds } },
      data: { status: "VENCIDA" },
    });
    overdueIds.forEach((id) => {
      const inv = invoices.find((i) => i.id === id);
      if (inv) inv.status = "VENCIDA";
    });
  }

  return NextResponse.json({ data: invoices });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, currency, issue_date, ...invoiceData } = parsed.data;

  // Get exchange rate at emission date
  const issueDate = new Date(issue_date);
  const exchangeRate = await getExchangeRate(currency, issueDate);
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const amountUsd = totalAmount / exchangeRate;

  // Generate invoice number
  const year = issueDate.getFullYear();
  const count = await prisma.invoice.count({
    where: { issue_date: { gte: new Date(`${year}-01-01`) } },
  });
  const invoiceNumber = `INV-${year}-${String(count + 1).padStart(3, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      ...invoiceData,
      currency,
      issue_date: issueDate,
      invoice_number: invoiceNumber,
      amount: totalAmount,
      exchange_rate_historic: exchangeRate,
      amount_usd: amountUsd,
      items: {
        create: items.map((item) => ({
          ...item,
          total: item.quantity * item.unit_price,
        })),
      },
    },
    include: { items: true },
  });

  // If hito invoice, mark milestone as FACTURADO
  if (invoiceData.milestone_id) {
    await prisma.milestone.update({
      where: { id: invoiceData.milestone_id },
      data: { status: "FACTURADO" },
    });
  }

  return NextResponse.json({ data: invoice }, { status: 201 });
}
