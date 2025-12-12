import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  variant?: "default" | "success" | "warning" | "error";
  delay?: number;
}

const variantStyles = {
  default: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    valueShadow: "text-glow-cyan",
  },
  success: {
    iconBg: "bg-success/10",
    iconColor: "text-success",
    valueShadow: "text-glow-green",
  },
  warning: {
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    valueShadow: "",
  },
  error: {
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    valueShadow: "text-glow-red",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  delay = 0,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card-hover p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", styles.iconBg)}>
          <Icon className={cn("w-6 h-6", styles.iconColor)} />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}
          >
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            <span>{trend.value}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm text-muted-foreground">{title}</h3>
        <p className={cn("text-3xl font-bold text-foreground", styles.valueShadow)}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      </div>
    </motion.div>
  );
}
