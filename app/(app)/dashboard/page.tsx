import { getDashboardData } from "@/lib/queries/dashboard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";
import Link from "next/link";

export default async function DashboardPage() {
  const { dealsWithoutNextStep, upcomingActions, projectsAtRisk, overdueInvoices, kpis } =
    await getDashboardData();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vista operativa del día</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Deals activos" value={kpis.activeDeals} />
        <KpiCard label="Propuestas enviadas" value={kpis.pendingProposals} />
        <KpiCard label="Proyectos activos" value={kpis.activeProjects} />
        <KpiCard
          label="Horas fact. este mes"
          value={`${kpis.billableHoursThisMonth.toFixed(0)}h`}
          highlight
        />
      </div>

      {/* Alert sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deals sin siguiente paso */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
            Deals sin siguiente paso
            {dealsWithoutNextStep.length > 0 && (
              <span className="ml-auto text-xs font-normal text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                {dealsWithoutNextStep.length}
              </span>
            )}
          </h2>
          <div className="space-y-2">
            {dealsWithoutNextStep.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Todo en orden ✓</p>
            ) : (
              dealsWithoutNextStep.map((deal) => (
                <Link key={deal.id} href={`/deals/${deal.id}`}>
                  <AlertCard
                    type="deal"
                    title={deal.company.name}
                    subtitle={deal.need.slice(0, 60) + (deal.need.length > 60 ? "…" : "")}
                    badge={deal.status}
                    badgeVariant="warning"
                  />
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Próximas acciones */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
            Próximas acciones (7 días)
          </h2>
          <div className="space-y-2">
            {upcomingActions.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin acciones programadas</p>
            ) : (
              upcomingActions.map((action) => (
                <AlertCard
                  key={action.id}
                  type="action"
                  title={action.company.name}
                  subtitle={action.next_step}
                  badge={action.next_step_date ? formatDate(action.next_step_date) : undefined}
                  badgeVariant="info"
                />
              ))
            )}
          </div>
        </section>

        {/* Proyectos en riesgo */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" />
            Proyectos con riesgo de horas
          </h2>
          <div className="space-y-2">
            {projectsAtRisk.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin alertas</p>
            ) : (
              projectsAtRisk.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <AlertCard
                    type="project"
                    title={p.deal.company.name}
                    subtitle={`${p.hoursActual.toFixed(0)}h de ${p.hours_planned}h previstas`}
                    badge={`${p.hoursPct?.toFixed(0)}%`}
                    badgeVariant={p.hoursPct! > 100 ? "danger" : "warning"}
                  />
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Facturas vencidas */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
            Facturas vencidas
            {overdueInvoices.length > 0 && (
              <span className="ml-auto text-xs font-normal text-red-600 bg-red-100 rounded-full px-2 py-0.5">
                {overdueInvoices.length}
              </span>
            )}
          </h2>
          <div className="space-y-2">
            {overdueInvoices.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin facturas vencidas ✓</p>
            ) : (
              overdueInvoices.map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`}>
                  <AlertCard
                    type="invoice"
                    title={inv.project.deal.company.name}
                    subtitle={`${inv.invoice_number} — ${formatCurrency(Number(inv.amount_usd), "USD")}`}
                    badge={`+${inv.daysOverdue}d`}
                    badgeVariant="danger"
                  />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
