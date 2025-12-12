import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthCardProps {
  title: string;
  status: "online" | "offline";
  icon: LucideIcon;
  details?: string;
  delay?: number;
}

export function HealthCard({ title, status, icon: Icon, details, delay = 0 }: HealthCardProps) {
  const isOnline = status === "online";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="glass-card-hover p-6 relative overflow-hidden"
    >
      {/* Glow effect based on status */}
      <div
        className={cn(
          "absolute inset-0 opacity-20",
          isOnline
            ? "bg-gradient-to-br from-success/20 to-transparent"
            : "bg-gradient-to-br from-destructive/20 to-transparent"
        )}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isOnline ? "bg-success/10" : "bg-destructive/10"
            )}
          >
            <Icon
              className={cn(
                "w-6 h-6",
                isOnline ? "text-success" : "text-destructive"
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("status-indicator", isOnline ? "online" : "offline")} />
            <span
              className={cn(
                "text-sm font-semibold uppercase tracking-wide",
                isOnline ? "text-success text-glow-green" : "text-destructive text-glow-red"
              )}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        {details && <p className="text-sm text-muted-foreground">{details}</p>}
      </div>
    </motion.div>
  );
}
