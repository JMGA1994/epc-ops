import { cn } from "@/lib/utils/cn";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  highlight?: boolean;
}

export function KpiCard({ label, value, sub, trend, highlight }: KpiCardProps) {
  return (
    <div className={cn(
      "rounded-lg border bg-white p-4",
      highlight && "border-amber-200 bg-amber-50"
    )}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className={cn(
        "mt-1 text-2xl font-bold",
        highlight ? "text-amber-700" : "text-gray-900"
      )}>
        {value}
      </p>
      {sub && (
        <p className={cn(
          "mt-0.5 text-xs",
          trend === "up" && "text-green-600",
          trend === "down" && "text-red-600",
          trend === "neutral" && "text-gray-500",
          !trend && "text-gray-500"
        )}>
          {sub}
        </p>
      )}
    </div>
  );
}
