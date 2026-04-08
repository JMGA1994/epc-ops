import { cn } from "@/lib/utils/cn";
import { AlertTriangle, Clock, TrendingDown, FileWarning } from "lucide-react";

type AlertType = "deal" | "project" | "invoice" | "action";

interface AlertCardProps {
  type: AlertType;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: "warning" | "danger" | "info";
  href?: string;
}

const icons: Record<AlertType, React.ElementType> = {
  deal: Clock,
  project: TrendingDown,
  invoice: FileWarning,
  action: AlertTriangle,
};

const badgeClasses: Record<string, string> = {
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

export function AlertCard({
  type,
  title,
  subtitle,
  badge,
  badgeVariant = "warning",
}: AlertCardProps) {
  const Icon = icons[type];

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 bg-white hover:bg-gray-50 transition-colors">
      <div className={cn(
        "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
        type === "invoice" ? "bg-red-100" : "bg-amber-100"
      )}>
        <Icon className={cn(
          "h-3.5 w-3.5",
          type === "invoice" ? "text-red-600" : "text-amber-600"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      {badge && (
        <span className={cn(
          "flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
          badgeClasses[badgeVariant]
        )}>
          {badge}
        </span>
      )}
    </div>
  );
}
