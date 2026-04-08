import { prisma } from "@/lib/prisma";
import { DealStatusBadge } from "@/components/deals/DealStatusBadge";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/currency";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DealStatus } from "@prisma/client";

const PIPELINE_STAGES: DealStatus[] = [
  "OPORTUNIDAD",
  "ANALISIS",
  "PROPUESTA",
  "NEGOCIACION",
];

const SERVICE_LABELS = {
  BID: "BID",
  INGENIERIA_EPC: "Ing. EPC",
  STAFF_AUGMENTATION: "Staff Aug",
};

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    where: { deleted_at: null, status: { notIn: ["GANADO", "PERDIDO"] } },
    include: {
      company: { select: { id: true, name: true } },
      proposals: { where: { is_current: true } },
    },
    orderBy: { updated_at: "desc" },
  });

  const dealsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter((d) => d.status === stage);
    return acc;
  }, {} as Record<DealStatus, typeof deals>);

  return (
    <div className="p-6 max-w-full space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500">{deals.length} oportunidades activas</p>
        </div>
        <Link
          href="/deals/new"
          className="flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo deal
        </Link>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage} className="flex-shrink-0 w-72">
            <div className="mb-3 flex items-center justify-between">
              <DealStatusBadge status={stage} />
              <span className="text-xs text-gray-400">
                {dealsByStage[stage].length}
              </span>
            </div>
            <div className="space-y-3">
              {dealsByStage[stage].map((deal) => (
                <Link key={deal.id} href={`/deals/${deal.id}`}>
                  <div className="rounded-lg border bg-white p-3 hover:border-amber-200 hover:shadow-sm transition-all cursor-pointer">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {deal.company.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {deal.need}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                        {SERVICE_LABELS[deal.service]}
                      </span>
                      {deal.proposals[0] ? (
                        <span className="text-xs font-medium text-gray-700">
                          {formatCurrency(
                            Number(deal.proposals[0].amount_usd),
                            "USD"
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sin propuesta</span>
                      )}
                    </div>
                    {deal.next_step_date && (
                      <p className="mt-2 text-xs text-amber-600 border-t pt-2">
                        → {deal.next_step_date ? formatDate(deal.next_step_date) : ""}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
              {dealsByStage[stage].length === 0 && (
                <div className="rounded-lg border border-dashed bg-gray-50 p-4 text-center text-xs text-gray-400">
                  Sin deals
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
