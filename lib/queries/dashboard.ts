import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const now = new Date();

  const [
    dealsWithoutNextStep,
    upcomingActions,
    projectsAtRisk,
    overdueInvoices,
    kpis,
  ] = await Promise.all([
    // Deals activos sin siguiente paso definido o con fecha vencida
    prisma.deal.findMany({
      where: {
        deleted_at: null,
        status: { notIn: ["GANADO", "PERDIDO"] },
        OR: [
          { next_step: null },
          { next_step_date: { lt: now } },
        ],
      },
      include: { company: { select: { name: true } } },
      orderBy: { updated_at: "asc" },
      take: 10,
    }),

    // Próximas acciones comerciales (siguientes 7 días)
    prisma.interaction.findMany({
      where: {
        next_step_date: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        company: { select: { name: true } },
        contact: { select: { name: true } },
      },
      orderBy: { next_step_date: "asc" },
      take: 10,
    }),

    // Proyectos con >85% de horas consumidas
    prisma.project.findMany({
      where: {
        deleted_at: null,
        status: "ACTIVO",
        hours_planned: { not: null },
      },
      include: {
        deal: { include: { company: { select: { name: true } } } },
        time_entries: { select: { hours: true } },
      },
    }).then((projects) =>
      projects
        .map((p) => {
          const hoursActual = p.time_entries.reduce(
            (sum, te) => sum + Number(te.hours),
            0
          );
          const hoursPct = p.hours_planned
            ? (hoursActual / Number(p.hours_planned)) * 100
            : 0;
          return { ...p, hoursActual, hoursPct };
        })
        .filter((p) => p.hoursPct > 85)
        .sort((a, b) => b.hoursPct - a.hoursPct)
    ),

    // Facturas vencidas
    prisma.invoice.findMany({
      where: {
        status: "EMITIDA",
        due_date: { lt: now },
      },
      include: {
        project: {
          include: { deal: { include: { company: { select: { name: true } } } } },
        },
      },
      orderBy: { due_date: "asc" },
    }).then((invoices) =>
      invoices.map((inv) => ({
        ...inv,
        daysOverdue: Math.floor(
          (now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))
    ),

    // KPIs summary
    Promise.all([
      prisma.deal.count({
        where: { deleted_at: null, status: { notIn: ["GANADO", "PERDIDO"] } },
      }),
      prisma.proposal.count({ where: { status: "ENVIADO" } }),
      prisma.project.count({ where: { deleted_at: null, status: "ACTIVO" } }),
      prisma.timeEntry.aggregate({
        where: {
          type: "FACTURABLE",
          date: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
            lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        },
        _sum: { hours: true },
      }),
    ]).then(([activeDeals, pendingProposals, activeProjects, hoursAgg]) => ({
      activeDeals,
      pendingProposals,
      activeProjects,
      billableHoursThisMonth: Number(hoursAgg._sum.hours ?? 0),
    })),
  ]);

  return {
    dealsWithoutNextStep,
    upcomingActions,
    projectsAtRisk,
    overdueInvoices,
    kpis,
  };
}
