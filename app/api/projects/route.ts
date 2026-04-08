import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const projects = await prisma.project.findMany({
    where: {
      deleted_at: null,
      ...(status && { status: status as any }),
    },
    include: {
      deal: { include: { company: { select: { id: true, name: true } } } },
      _count: { select: { time_entries: true, invoices: true, milestones: true } },
    },
    orderBy: { updated_at: "desc" },
  });

  // Compute live metrics
  const projectsWithMetrics = await Promise.all(
    projects.map(async (p) => {
      const [hoursAgg, revenueAgg, costResult] = await Promise.all([
        prisma.timeEntry.aggregate({
          where: { project_id: p.id },
          _sum: { hours: true },
        }),
        prisma.invoice.aggregate({
          where: { project_id: p.id, status: "COBRADA" },
          _sum: { amount_usd: true },
        }),
        prisma.timeEntry.findMany({
          where: { project_id: p.id },
          include: { resource: { select: { cost_per_hour: true } } },
        }),
      ]);

      const hoursActual = Number(hoursAgg._sum.hours ?? 0);
      const revenueActual = Number(revenueAgg._sum.amount_usd ?? 0);
      const costActual = costResult.reduce(
        (sum, te) => sum + Number(te.hours) * Number(te.resource.cost_per_hour),
        0
      );

      return {
        ...p,
        hoursActual,
        revenueActual,
        costActual,
        margin: revenueActual - costActual,
        hoursPct: p.hours_planned
          ? Math.round((hoursActual / Number(p.hours_planned)) * 100)
          : null,
      };
    })
  );

  return NextResponse.json({ data: projectsWithMetrics });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { deal_id, proposal_id, ...rest } = body;

  // Validate deal is WON
  const deal = await prisma.deal.findFirst({
    where: { id: deal_id, status: "GANADO", deleted_at: null },
  });
  if (!deal) {
    return NextResponse.json(
      { error: "Project can only be created from a WON deal" },
      { status: 422 }
    );
  }

  // Validate proposal is ACCEPTED
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposal_id, status: "ACEPTADO" },
  });
  if (!proposal) {
    return NextResponse.json(
      { error: "Project requires an accepted proposal" },
      { status: 422 }
    );
  }

  // Check no project already exists for this deal
  const existing = await prisma.project.findUnique({ where: { deal_id } });
  if (existing) {
    return NextResponse.json(
      { error: "A project already exists for this deal" },
      { status: 409 }
    );
  }

  const project = await prisma.project.create({
    data: {
      deal_id,
      proposal_id,
      service: deal.service,
      revenue_planned: proposal.amount_usd,
      currency: proposal.currency,
      ...rest,
    },
  });

  return NextResponse.json({ data: project }, { status: 201 });
}
