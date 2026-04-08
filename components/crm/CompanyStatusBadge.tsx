import { CompanyStatus } from "@prisma/client";
import { cn } from "@/lib/utils/cn";

const STATUS_CONFIG: Record<CompanyStatus, { label: string; className: string }> = {
  PENDIENTE:   { label: "Pendiente",   className: "bg-gray-100 text-gray-600" },
  CONTACTADO:  { label: "Contactado",  className: "bg-blue-100 text-blue-700" },
  RESPONDIO:   { label: "Respondió",   className: "bg-cyan-100 text-cyan-700" },
  REUNION:     { label: "Reunión",     className: "bg-violet-100 text-violet-700" },
  ACTIVA:      { label: "Activa",      className: "bg-green-100 text-green-700" },
  NO_INTERESA: { label: "No interesa", className: "bg-orange-100 text-orange-700" },
  NO_ENCAJA:   { label: "No encaja",   className: "bg-red-100 text-red-700" },
};

export function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
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
