import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthCardProps {
  title: string;
  status: "online" | "offline" | "warning";
  icon: LucideIcon;
  details?: string;
  delay?: number;
  onClick?: () => void;
  className?: string;
}

export function HealthCard({ title, status, icon: Icon, details, delay = 0, onClick, className }: HealthCardProps) {
  const isOnline = status === "online";
  const isWarning = status === "warning";

  let statusColor = "text-destructive";
  let statusBg = "bg-destructive/10";
  let statusGlow = "text-glow-red";
  let gradient = "from-destructive/20";
  let statusText = "Offline";

  if (isOnline) {
    statusColor = "text-success";
    statusBg = "bg-success/10";
    statusGlow = "text-glow-green";
    gradient = "from-success/20";
    statusText = "Online";
  } else if (isWarning) {
    statusColor = "text-warning";
    statusBg = "bg-warning/10";
    statusGlow = "text-glow-yellow";
    gradient = "from-warning/20";
    statusText = "Degraded";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      onClick={onClick}
      className={cn(
        "glass-card-hover p-6 relative overflow-hidden",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Glow effect based on status */}
      <div
        className={cn(
          "absolute inset-0 opacity-20 bg-gradient-to-br to-transparent",
          gradient
        )}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              statusBg
            )}
          >
            <Icon
              className={cn(
                "w-6 h-6",
                statusColor
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("status-indicator", status)} />
            <span
              className={cn(
                "text-sm font-semibold uppercase tracking-wide",
                statusColor,
                statusGlow
              )}
            >
              {statusText}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        {details && <p className="text-sm text-muted-foreground">{details}</p>}
      </div>
    </motion.div>
  );
}
