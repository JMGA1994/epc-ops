import { prisma } from "@/lib/prisma";

export async function getCommercialKPIs() {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    activeDealsByService,
    closedDeals90d,
    proposalsByStatus,
    companiesByStatus,
  ] = await Promise.all([
    prisma.deal.groupBy({
      by: ["service", "status"],
      where: { deleted_at: null, status: { notIn: ["GANADO", "PERDIDO"] } },
      _count: true,
    }),

    prisma.deal.findMany({
      where: {
        deleted_at: null,
        status: { in: ["GANADO", "PERDIDO"] },
        updated_at: { gte: ninetyDaysAgo },
      },
      select: { status: true, service: true },
    }),

    prisma.proposal.groupBy({
      by: ["status"],
      _count: true,
    }),

    prisma.company.groupBy({
      by: ["status"],
      where: { deleted_at: null },
      _count: true,
    }),
  ]);

  const won = closedDeals90d.filter((d) => d.status === "GANADO").length;
  const lost = closedDeals90d.filter((d) => d.status === "PERDIDO").length;
  const closeRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  return {
    activeDealsByService,
    closeRate,
    won90d: won,
    lost90d: lost,
    proposalsByStatus,
    companiesByStatus,
  };
}

export async function getFinancialKPIs() {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) };
  }).reverse();

  const [monthlyRevenue, backlog, projectMargins] = await Promise.all([
    // Facturación mensual últimos 6 meses
    Promise.all(
      months.map(async (m) => {
        const agg = await prisma.invoice.aggregate({
          where: {
            status: "COBRADA",
            issue_date: { gte: m.start, lt: m.end },
          },
          _sum: { amount_usd: true },
        });
        return {
          month: m.start.toISOString().slice(0, 7),
          revenue_usd: Number(agg._sum.amount_usd ?? 0),
        };
      })
    ),

    // Backlog: revenue previsto de proyectos activos - ya facturado
    prisma.project.findMany({
      where: { deleted_at: null, status: { in: ["PENDIENTE", "ACTIVO"] } },
      include: {
        invoices: {
          where: { status: { not: "VENCIDA" } },
          select: { amount_usd: true },
        },
      },
    }).then((projects) =>
      projects.reduce((sum, p) => {
        const invoiced = p.invoices.reduce(
          (s, i) => s + Number(i.amount_usd),
          0
        );
        return sum + (Number(p.revenue_planned ?? 0) - invoiced);
      }, 0)
    ),

    // Margen por proyecto
    prisma.project.findMany({
      where: { deleted_at: null },
      include: {
        deal: { include: { company: { select: { name: true } } } },
        invoices: {
          where: { status: "COBRADA" },
          select: { amount_usd: true },
        },
        time_entries: {
          include: { resource: { select: { cost_per_hour: true, cost_currency: true } } },
        },
      },
    }).then((projects) =>
      projects.map((p) => {
        const revenueActual = p.invoices.reduce(
          (s, i) => s + Number(i.amount_usd),
          0
        );
        const costActual = p.time_entries.reduce(
          (s, te) => s + Number(te.hours) * Number(te.resource.cost_per_hour),
          0
        );
        return {
          id: p.id,
          name: p.deal.company.name,
          service: p.service,
          status: p.status,
          revenue_actual: revenueActual,
          cost_actual: costActual,
          margin: revenueActual - costActual,
          margin_pct:
            revenueActual > 0
              ? Math.round(((revenueActual - costActual) / revenueActual) * 100)
              : 0,
        };
      })
    ),
  ]);

  return { monthlyRevenue, backlog, projectMargins };
}
