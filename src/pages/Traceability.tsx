import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { traceData } from "@/data/mockData";
import { Search, CheckCircle2, XCircle, Clock, ArrowRight, FileText, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepStatus = "completed" | "error" | "pending";

interface TraceStep {
  step: string;
  status: StepStatus;
  timestamp: string | null;
  topic?: string;
  details: string;
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success",
    borderColor: "border-success",
  },
  error: {
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive",
    borderColor: "border-destructive",
  },
  pending: {
    icon: Clock,
    color: "text-muted-foreground",
    bgColor: "bg-muted-foreground",
    borderColor: "border-muted-foreground",
  },
};

const Traceability = () => {
  const [searchId, setSearchId] = useState("");
  const [currentTrace, setCurrentTrace] = useState<{
    transactionId: string;
    steps: TraceStep[];
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = () => {
    const trace = traceData[searchId as keyof typeof traceData];
    if (trace) {
      setCurrentTrace(trace as { transactionId: string; steps: TraceStep[] });
      setNotFound(false);
    } else {
      setCurrentTrace(null);
      setNotFound(true);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground">
            <span className="text-primary text-glow-cyan">Trazabilidad</span> de Transacciones
          </h1>
          <p className="text-muted-foreground mt-1">
            Rastrea el flujo completo de una transacción a través del sistema
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Ingresa el Transaction ID (ej: TXN-2024-001234)"
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} variant="neon">
              Buscar
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">IDs de ejemplo:</span>
            {Object.keys(traceData).map((id) => (
              <button
                key={id}
                onClick={() => {
                  setSearchId(id);
                  const trace = traceData[id as keyof typeof traceData];
                  setCurrentTrace(trace as { transactionId: string; steps: TraceStep[] });
                  setNotFound(false);
                }}
                className="text-sm text-primary hover:underline"
              >
                {id}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Results */}
        {notFound && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center"
          >
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-warning" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Transacción no encontrada</h3>
            <p className="text-muted-foreground">
              No se encontró ninguna transacción con el ID "{searchId}"
            </p>
          </motion.div>
        )}

        {currentTrace && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Transaction Header */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{currentTrace.transactionId}</h2>
                  <p className="text-sm text-muted-foreground">
                    {currentTrace.steps.some((s) => s.status === "error")
                      ? "Procesamiento con errores"
                      : currentTrace.steps.every((s) => s.status === "completed")
                      ? "Completada exitosamente"
                      : "En proceso"}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-8">Flujo de la Transacción</h3>
              
              <div className="relative">
                {currentTrace.steps.map((step, index) => {
                  const config = statusConfig[step.status];
                  const Icon = config.icon;
                  const isLast = index === currentTrace.steps.length - 1;

                  return (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.15 }}
                      className="flex gap-6 relative"
                    >
                      {/* Timeline line */}
                      {!isLast && (
                        <div
                          className={cn(
                            "absolute left-[23px] top-12 w-0.5 h-[calc(100%-24px)]",
                            step.status === "completed" ? "bg-success/50" : "bg-border/50"
                          )}
                        />
                      )}

                      {/* Icon */}
                      <div
                        className={cn(
                          "relative z-10 w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                          `${config.bgColor}/10`
                        )}
                      >
                        <Icon className={cn("w-6 h-6", config.color)} />
                      </div>

                      {/* Content */}
                      <div className={cn("flex-1 pb-8", isLast && "pb-0")}>
                        <div
                          className={cn(
                            "p-4 rounded-lg border",
                            step.status === "completed"
                              ? "border-success/30 bg-success/5"
                              : step.status === "error"
                              ? "border-destructive/30 bg-destructive/5"
                              : "border-border/50"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-foreground">{step.step}</h4>
                              {step.topic && (
                                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                  {step.topic}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatTimestamp(step.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{step.details}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!currentTrace && !notFound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-16 text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Search className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Busca una transacción
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Ingresa un Transaction ID para ver el flujo completo de la transacción
              a través de los diferentes stages del pipeline
            </p>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
};

export default Traceability;
