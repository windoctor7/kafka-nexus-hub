import { MainLayout } from "@/components/layout/MainLayout";
import { HealthCard } from "@/components/dashboard/HealthCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { MetricsChart } from "@/components/dashboard/MetricsChart";
import { WebSocketStatus } from "@/components/dashboard/WebSocketStatus";
import { Server, Send, CheckCircle2, AlertTriangle, Clock, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useIntegrator } from "@/contexts/IntegratorContext";
import { SIDECAR_API } from "@/lib/api";

interface DashboardData {
  sourceClusters: any[];
  destinationCluster: any;
  dashboardStats: {
    successfulToday: number;
    errorsToday: number;
    avgProcessingTime: string;
  };
  chartData: MetricsChartProps['data'];
}

const Dashboard = () => {
  const { selectedIntegrator } = useIntegrator();
  const [data, setData] = useState<DashboardData | null>(null);

  // Use integrator's WebSocket URL or fallback
  const WS_URL = selectedIntegrator?.wsUrl || import.meta.env.VITE_WS_URL || "ws://localhost:3001/logs";

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${SIDECAR_API}/dashboard`);
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

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const [activities, setActivities] = useState<any[]>([]);

  const { status, lastMessage, reconnectAttempts, connect, disconnect } = useWebSocket({
    url: WS_URL,
    onMessage: (message) => {
      // Handle real-time updates here
      const msg = message as any;
      const content = msg.message || msg.payload || "";

      if (typeof content === 'string') {
        let newActivity = null;
        let isError = false;
        let isSuccess = false;

        if (content.includes("Transacción expirada")) {
          isError = true;
          const correlationId = content.split("timeout: ")[1]?.trim() || "Desconocido";
          toast.error(`Alerta: Transacción expirada (${correlationId})`);
          newActivity = {
            time: new Date().toLocaleTimeString(),
            event: "Transacción Expirada",
            details: `ID: ${correlationId}`,
            status: "error"
          };
        } else if (content.includes("Integrated correlation") && content.includes("successfully")) {
          isSuccess = true;
          newActivity = {
            time: new Date().toLocaleTimeString(),
            event: "Integración Exitosa",
            details: "Mensaje unificado enviado",
            status: "success"
          };
        }

        // Update stats and chart locally
        setData(prev => {
          if (!prev) return null;

          const newStats = { ...prev.dashboardStats };
          if (isError) newStats.errorsToday++;
          if (isSuccess) newStats.successfulToday++;

          // Update Chart Data
          const now = new Date();
          const timeKey = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newChartData = [...(prev.chartData || [])];

          const lastEntry = newChartData[newChartData.length - 1];

          if (lastEntry && lastEntry.time === timeKey) {
            // Update existing bucket
            if (isError) lastEntry.errors = (lastEntry.errors || 0) + 1;
            if (isSuccess) lastEntry.messages = (lastEntry.messages || 0) + 1;
          } else {
            // Create new bucket
            newChartData.push({
              time: timeKey,
              messages: isSuccess ? 1 : 0,
              errors: isError ? 1 : 0
            });
            // Keep only last 20 points
            if (newChartData.length > 20) newChartData.shift();
          }

          return {
            ...prev,
            dashboardStats: newStats,
            chartData: newChartData
          };
        });

        if (newActivity) {
          setActivities(prev => [newActivity, ...prev].slice(0, 5));
        }
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
          <StatCard
            title="Transacciones Exitosas"
            value={data.dashboardStats.successfulToday.toString()}
            icon={CheckCircle2}
            trend={{ value: 12, isPositive: true }}
            variant="success"
          />
          <StatCard
            title="Errores de Validación"
            value={data.dashboardStats.errorsToday.toString()}
            icon={AlertTriangle}
            trend={{ value: 2, isPositive: false }}
            variant={data.dashboardStats.errorsToday > 0 ? "error" : "default"}
          />
          <StatCard
            title="Tiempo Promedio"
            value={data.dashboardStats.avgProcessingTime}
            icon={Clock}
            trend={{ value: 5, isPositive: true }}
          />
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
            <h3 className="text-lg font-semibold text-foreground mb-4">Actividad Reciente</h3>
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-sm">Esperando actividad...</p>
              ) : (
                activities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
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
            status={data.sourceClusters.some(c => c.status === "online") ? "online" : "offline"}
            icon={Server}
            details={`${data.sourceClusters.length} clusters configurados`}
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
