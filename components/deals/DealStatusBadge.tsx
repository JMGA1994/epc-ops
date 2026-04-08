import { DealStatus } from "@prisma/client";
import { cn } from "@/lib/utils/cn";

const STATUS_CONFIG: Record<DealStatus, { label: string; className: string }> = {
  OPORTUNIDAD: { label: "Oportunidad", className: "bg-gray-100 text-gray-700" },
  ANALISIS:    { label: "Análisis",    className: "bg-blue-100 text-blue-700" },
  PROPUESTA:   { label: "Propuesta",   className: "bg-violet-100 text-violet-700" },
  NEGOCIACION: { label: "Negociación", className: "bg-amber-100 text-amber-700" },
  GANADO:      { label: "Ganado",      className: "bg-green-100 text-green-700" },
  PERDIDO:     { label: "Perdido",     className: "bg-red-100 text-red-700" },
};

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      config.className
    )}>
      {config.label}
    </span>
  );
}
