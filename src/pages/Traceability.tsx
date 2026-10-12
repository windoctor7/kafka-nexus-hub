import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Search, CheckCircle2, XCircle, Clock, FileText, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogViewer } from "@/components/LogViewer";

// SIDECAR imports removed
import { useIntegrator } from "@/contexts/IntegratorContext";

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
  const { selectedIntegrator } = useIntegrator();
  const [searchId, setSearchId] = useState("");
  const [currentTrace, setCurrentTrace] = useState<{
    transactionId: string;
    steps: TraceStep[];
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Store all logs received from WS
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const [searchParams] = useSearchParams();
  const initialSearchTriggered = useRef(false);

  useEffect(() => {
    if (!selectedIntegrator?.wsUrl) return;

    const ws = new WebSocket(selectedIntegrator.wsUrl);
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
  }, [selectedIntegrator?.wsUrl]);

  // Auto-search from URL param
  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl && !initialSearchTriggered.current) {
      setSearchId(idFromUrl);
      initialSearchTriggered.current = true;

      // Fetch logs from API instead of relying on WS history
      if (selectedIntegrator?.apiUrl) {
        fetch(`${selectedIntegrator.apiUrl}/logs/search?q=${idFromUrl}`)
          .then(res => res.json())
          .then(logs => {
            if (logs.length > 0) {
              let expectedTopics: string[] = [];
              const receivedTopics: Set<string> = new Set();
              const steps: TraceStep[] = [];

              // First pass: Identify expected topics and build initial steps
              logs.forEach((log: any) => {
                let stepName = "Evento Procesado";
                let status: StepStatus = "completed";
                let details = log.message;
                let topic = undefined;

                if (log.message.includes("Plan dinámico registrado")) {
                  stepName = "Planificación de Integración";
                  // Extract expected topics from message
                  // Format seen: "{TP-TOPIC-1=1, TP-TOPIC-2=1}" (Java Map.toString())
                  try {
                    // Try to extract content inside {}
                    const mapContentMatch = log.message.match(/\{([^}]+)\}/);
                    if (mapContentMatch) {
                      const mapContent = mapContentMatch[1];
                      // Split by comma and extract keys (Topic names)
                      // Entry format: "TOPIC_NAME=1"
                      expectedTopics = mapContent.split(",").map((entry: string) => {
                        const parts = entry.trim().split("=");
                        return parts[0].trim();
                      });
                    } else {
                      // Fallback: try JSON if it was JSON
                      const jsonPart = log.message.substring(log.message.indexOf("{"));
                      const plan = JSON.parse(jsonPart);
                      if (plan.topicosIntegrados) {
                        expectedTopics = plan.topicosIntegrados.map((t: any) => t.nombre);
                      }
                    }
                  } catch (e) {
                    console.warn("Failed to parse plan:", e);
                    // Fallback regex if simple string [Topic1, Topic2]
                    const match = log.message.match(/\[(.*?)\]/);
                    if (match) {
                      expectedTopics = match[1].split(",").map(t => t.trim());
                    }
                  }
                } else if (log.message.includes("Evento recibido del tópico")) {
                  // Just track received topics, don't show step
                  const match = log.message.match(/tópico\s+([A-Za-z0-9._-]+)/);
                  if (match) {
                    receivedTopics.add(match[1]);
                  }
                  return; // Skip adding step
                } else if (log.message.includes("READY")) {
                  stepName = "Validación Completa";
                } else if (log.message.includes("Integrated correlation")) {
                  stepName = "Integración Exitosa";
                } else if (log.level === "ERROR") {
                  stepName = "Error en Procesamiento";
                  status = "error";
                }

                steps.push({
                  step: stepName,
                  status: status,
                  timestamp: log["@timestamp"],
                  details: details,
                  topic: topic
                });
              });

              // Calculate missing topics
              const missingTopics = expectedTopics.filter(t => !receivedTopics.has(t));

              // Check if we have an error step
              const errorStepIndex = steps.findIndex(s => s.status === "error");
              let errorTimestamp = null;

              if (errorStepIndex !== -1) {
                errorTimestamp = steps[errorStepIndex].timestamp;
                // If we have missing topics, remove the generic error step to replace it
                if (missingTopics.length > 0) {
                  steps.splice(errorStepIndex, 1);
                }
              }

              if (missingTopics.length > 0) {
                steps.push({
                  step: "Eventos Faltantes",
                  status: "error",
                  timestamp: errorTimestamp, // Use timeout timestamp if available
                  details: missingTopics.map(t => `• ${t}`).join('\n'),
                  topic: undefined
                });
              }

              // Sort steps: existing ones by timestamp, missing ones at the end
              steps.sort((a, b) => {
                if (!a.timestamp) return 1;
                if (!b.timestamp) return -1;
                return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
              });

              setCurrentTrace({
                transactionId: idFromUrl,
                steps: steps
              });
              setNotFound(false);
            } else {
              setNotFound(true);
            }
          })
          .catch(err => {
            console.error("Error searching logs:", err);
            setNotFound(true);
          });
      }
    }
  }, [searchParams]);

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
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.details}</p>
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
