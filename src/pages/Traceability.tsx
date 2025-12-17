import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Search, CheckCircle2, XCircle, Clock, FileText, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogViewer } from "@/components/LogViewer";
import { SIDECAR_WS } from "@/lib/api";

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

  // Store all logs received from WS
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(SIDECAR_WS);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setAllLogs(prev => [...prev, data]);
      } catch (e) {
        // ignore non-json
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleSearch = () => {
    // Filter logs that contain the searchId
    const relevantLogs = allLogs.filter(log =>
      JSON.stringify(log).includes(searchId)
    );

    if (relevantLogs.length === 0) {
      setCurrentTrace(null);
      setNotFound(true);
      return;
    }

    // Reconstruct steps from logs
    const steps: TraceStep[] = relevantLogs.map(log => {
      let stepName = "Evento Procesado";
      let status: StepStatus = "completed";
      let details = log.message;

      if (log.message.includes("Plan dinámico registrado")) {
        stepName = "Planificación de Integración";
      } else if (log.message.includes("READY")) {
        stepName = "Validación Completa";
      } else if (log.message.includes("Integrated correlation")) {
        stepName = "Integración Exitosa";
      } else if (log.level === "ERROR") {
        stepName = "Error en Procesamiento";
        status = "error";
      }

      return {
        step: stepName,
        status: status,
        timestamp: log["@timestamp"],
        details: details
      };
    });

    setCurrentTrace({
      transactionId: searchId,
      steps: steps
    });
    setNotFound(false);
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
                placeholder="Ingresa el Transaction ID (ej: e615a573...)"
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} variant="neon">
              Buscar
            </Button>
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
            <h3 className="text-xl font-semibold text-foreground mb-2">Transacción no encontrada en los logs actuales</h3>
            <p className="text-muted-foreground">
              Asegúrate de que la transacción ocurrió mientras esta página estaba abierta (o recarga los logs).
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
                      : "Procesado"}
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
                      key={index}
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

        {/* Live Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <LogViewer />
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Traceability;
