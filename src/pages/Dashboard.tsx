import { MainLayout } from "@/components/layout/MainLayout";
import { HealthCard } from "@/components/dashboard/HealthCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { MetricsChart, MetricsChartProps } from "@/components/dashboard/MetricsChart";
import { WebSocketStatus } from "@/components/dashboard/WebSocketStatus";
import { Server, Send, CheckCircle2, AlertTriangle, Clock, Activity, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useIntegrator } from "@/contexts/IntegratorContext";
// SIDECAR_API removed


interface DashboardData {
  sourceClusters: any[];
  destinationCluster: any;
  dashboardStats: {
    successfulToday: number;
    errorsToday: number;
    avgProcessingTime: string;
    latency?: {
      avg: number;
      max: number;
      p95: number;
      p50: number;
    };
  };
  chartData: MetricsChartProps['data'];
  recentErrors: any[];
}

import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const { selectedIntegrator } = useIntegrator();
  const [data, setData] = useState<DashboardData | null>(null);

  // Use integrator's WebSocket URL or fallback
  const WS_URL = selectedIntegrator?.wsUrl || import.meta.env.VITE_WS_URL || "ws://localhost:3001/logs";

  const fetchDashboardData = async () => {
    if (!selectedIntegrator?.apiUrl) return;

    try {
      // Use dynamic API URL
      const res = await fetch(`${selectedIntegrator.apiUrl}/dashboard`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      console.log("Dashboard Data Received:", json); // Debug
      if (json.chartData) {
        console.log("Chart Data Length:", json.chartData.length);
      }
      setData(json);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando datos del dashboard");
    }
  };

  const messageBuffer = useRef<any[]>([]);
  const lastUpdate = useRef<number>(Date.now());

  // Adaptive Polling: Only poll when visible
  useEffect(() => {
    const poll = () => {
      if (!document.hidden) {
        fetchDashboardData();
      }
    };

    poll(); // Initial fetch
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  // Flush buffer to state every 1 second to prevent UI freezing
  useEffect(() => {
    const flushInterval = setInterval(() => {
      if (messageBuffer.current.length === 0) return;

      const messages = [...messageBuffer.current];
      messageBuffer.current = []; // Clear buffer

      setData(prev => {
        if (!prev) return null;

        const newStats = { ...prev.dashboardStats };
        const newChartData = [...(prev.chartData || [])];
        let newRecentErrors = [...(prev.recentErrors || [])];

        messages.forEach(content => {
          let newActivity = null;
          let isError = false;
          let isSuccess = false;

          if (content.includes("Transacción expirada")) {
            isError = true;
            const correlationId = content.split("timeout: ")[1]?.trim() || "Desconocido";
            newActivity = {
              time: new Date().toLocaleTimeString(),
              event: "Transacción Expirada",
              details: `ID: ${correlationId}`,
              status: "error"
            };
          } else if (content.includes("Integrated correlation") && content.includes("successfully")) {
            isSuccess = true;
          }

          // Update Stats
          if (isError) newStats.errorsToday++;
          if (isSuccess) newStats.successfulToday++;

          // Update Chart (Last bucket)
          const now = new Date();
          const timeKey = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const lastEntry = newChartData[newChartData.length - 1];

          if (lastEntry && lastEntry.time === timeKey) {
            if (isError) lastEntry.errors = (lastEntry.errors || 0) + 1;
            if (isSuccess) lastEntry.messages = (lastEntry.messages || 0) + 1;
          } else {
            newChartData.push({
              time: timeKey,
              messages: isSuccess ? 1 : 0,
              errors: isError ? 1 : 0
            });
            if (newChartData.length > 20) newChartData.shift();
          }

          // Update Recent Errors
          if (newActivity && isError) {
            newRecentErrors.unshift(newActivity);
          }
        });

        // Trim errors once after processing batch
        if (newRecentErrors.length > 10) newRecentErrors = newRecentErrors.slice(0, 10);

        return {
          ...prev,
          dashboardStats: newStats,
          chartData: newChartData,
          recentErrors: newRecentErrors
        };
      });
    }, 1000); // Update UI max once per second

    return () => clearInterval(flushInterval);
  }, []);

  const { status, lastMessage, reconnectAttempts, connect, disconnect } = useWebSocket({
    url: WS_URL,
    onMessage: (message) => {
      const msg = message as any;
      const content = msg.message || msg.payload || "";
      if (typeof content === 'string') {
        messageBuffer.current.push(content);
      }
    },
    onConnect: () => {
      toast.success("Conectado al servidor de logs");
    },
    onDisconnect: () => {
      toast.error("Desconectado del servidor de logs");
    },
  });

  if (!data) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Cargando dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Monitoreo en tiempo real del integrador de transacciones
            </p>
          </div>
          <WebSocketStatus
            status={status}
            reconnectAttempts={reconnectAttempts}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(() => {
            const total = data.dashboardStats.successfulToday + data.dashboardStats.errorsToday;

            const rawSuccessRate = total > 0 ? (data.dashboardStats.successfulToday / total) * 100 : 0;
            const formattedSuccessRate = rawSuccessRate < 100 && rawSuccessRate > 99 ? parseFloat(rawSuccessRate.toFixed(1)) : Math.round(rawSuccessRate);

            const rawErrorRate = total > 0 ? (data.dashboardStats.errorsToday / total) * 100 : 0;
            // Format error rate to 1 decimal if small, otherwise integer
            const formattedErrorRate = rawErrorRate > 0 && rawErrorRate < 1 ? parseFloat(rawErrorRate.toFixed(1)) : Math.round(rawErrorRate);

            return (
              <>
                <StatCard
                  title="Transacciones Exitosas"
                  value={data.dashboardStats.successfulToday.toString()}
                  icon={CheckCircle2}
                  trend={{ value: formattedSuccessRate, isPositive: true }}
                  variant="success"
                />
                <StatCard
                  title="Transacciones Incompletas"
                  value={data.dashboardStats.errorsToday.toString()}
                  icon={AlertTriangle}
                  trend={{ value: formattedErrorRate, isPositive: false }}
                  variant={data.dashboardStats.errorsToday > 0 ? "error" : "default"}
                />

                {/* Latency Card (Promedio) */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Zap className="h-24 w-24" />
                  </div>
                  <div className="flex items-center justify-between z-10">
                    <h3 className="text-sm font-medium text-muted-foreground">Latencia (Promedio)</h3>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-1 z-10 mt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{data.dashboardStats.latency?.avg || 0}ms</span>
                      <span className="text-xs text-muted-foreground">Tiempo Promedio</span>
                    </div>
                    {/* Visual Health Indicator */}
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full transition-all duration-500 ${(data.dashboardStats.latency?.avg || 0) > 1000 ? 'bg-destructive' :
                          (data.dashboardStats.latency?.avg || 0) > 500 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 mt-auto z-10">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground">P95:</span>
                      {data.dashboardStats.latency?.p95 || 0}ms
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground">Max:</span>
                      {data.dashboardStats.latency?.max || 0}ms
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          {/* Charts Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="col-span-4"
          >
            <MetricsChart data={data.chartData} />
          </motion.div>

          {/* Recent Activity - Now next to chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="col-span-3 glass-card p-6 h-full"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Errores Recientes</h3>
            <div className="space-y-3">
              {(!data.recentErrors || data.recentErrors.length === 0) ? (
                <p className="text-muted-foreground text-sm">Sin errores recientes</p>
              ) : (
                data.recentErrors.map((activity, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      const correlationId = activity.details.replace("ID: ", "");
                      navigate(`/traceability?id=${correlationId}`);
                    }}
                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0 cursor-pointer hover:bg-white/5 transition-colors rounded px-2"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2 h-2 rounded-full ${activity.status === "success"
                          ? "bg-success"
                          : activity.status === "error"
                            ? "bg-destructive"
                            : "bg-primary"
                          }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{activity.event}</p>
                        <p className="text-xs text-muted-foreground">{activity.details}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Cluster Health Summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <HealthCard
            title="Kafka Source Clusters"
            status={(() => {
              const onlineCount = data.sourceClusters.filter(c => c.status === "online").length;
              if (onlineCount === data.sourceClusters.length) return "online";
              if (onlineCount === 0) return "offline";
              return "warning";
            })()}
            icon={Server}
            details={`${data.sourceClusters.filter(c => c.status === "online").length}/${data.sourceClusters.length} Online`}
            onClick={() => navigate("/clusters")}
          />
          <HealthCard
            title="Kafka Destination Cluster"
            status={data.destinationCluster.status}
            icon={Send}
            details={`Topic: ${data.destinationCluster.topic}`}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
