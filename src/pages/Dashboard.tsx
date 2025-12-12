import { MainLayout } from "@/components/layout/MainLayout";
import { HealthCard } from "@/components/dashboard/HealthCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { MetricsChart } from "@/components/dashboard/MetricsChart";
import { sourceClusters, destinationCluster, dashboardStats } from "@/data/mockData";
import { Server, Send, CheckCircle2, AlertTriangle, Clock, Activity } from "lucide-react";
import { motion } from "framer-motion";

const Dashboard = () => {
  const sourceStatus = sourceClusters.some((c) => c.status === "online") ? "online" : "offline";

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              <span className="text-primary text-glow-cyan">Dashboard</span> de Monitoreo
            </h1>
            <p className="text-muted-foreground mt-1">
              Estado en tiempo real del integrador de transacciones Kafka
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 glass-card">
            <div className="status-indicator online" />
            <span className="text-sm text-foreground">Sistema Operativo</span>
          </div>
        </motion.div>

        {/* Health Check Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HealthCard
            title="Kafka Source"
            status={sourceStatus}
            icon={Server}
            details={`${sourceClusters.filter((c) => c.status === "online").length}/${sourceClusters.length} clusters conectados`}
            delay={0.1}
          />
          <HealthCard
            title="Kafka Destination"
            status={destinationCluster.status}
            icon={Send}
            details={destinationCluster.topic}
            delay={0.2}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Transacciones Exitosas Hoy"
            value={dashboardStats.successfulToday}
            icon={CheckCircle2}
            variant="success"
            trend={{ value: 12.5, isPositive: true }}
            delay={0.3}
          />
          <StatCard
            title="Errores de Validación"
            value={dashboardStats.errorsToday}
            icon={AlertTriangle}
            variant="error"
            trend={{ value: 3.2, isPositive: false }}
            delay={0.4}
          />
          <StatCard
            title="Tiempo Promedio"
            value={dashboardStats.avgProcessingTime}
            icon={Clock}
            variant="default"
            delay={0.5}
          />
          <StatCard
            title="Uptime"
            value={dashboardStats.uptime}
            icon={Activity}
            variant="success"
            delay={0.6}
          />
        </div>

        {/* Metrics Chart */}
        <MetricsChart />

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            {[
              { time: "Hace 2 min", event: "Mensaje procesado", topic: "TP-LOAN-ORIGINATION", status: "success" },
              { time: "Hace 5 min", event: "Nuevo cluster conectado", topic: "Production Alpha", status: "info" },
              { time: "Hace 12 min", event: "Error de validación", topic: "TP-LOAN-DISBURSEMENT", status: "error" },
              { time: "Hace 25 min", event: "Regla actualizada", topic: "transaction.id mapping", status: "info" },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.status === "success"
                        ? "bg-success"
                        : activity.status === "error"
                        ? "bg-destructive"
                        : "bg-primary"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.event}</p>
                    <p className="text-xs text-muted-foreground">{activity.topic}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
