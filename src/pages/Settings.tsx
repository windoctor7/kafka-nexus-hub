import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { destinationCluster } from "@/data/mockData";
import {
  Settings as SettingsIcon,
  Server,
  Bell,
  Shield,
  Database,
  RefreshCw,
  Save,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const Settings = () => {
  const [destination, setDestination] = useState(destinationCluster);
  const [retryConfig, setRetryConfig] = useState({
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
  });
  const [notifications, setNotifications] = useState({
    errorAlerts: true,
    performanceAlerts: true,
    weeklyReports: false,
    slackWebhook: "",
  });

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground">
            <span className="text-primary text-glow-cyan">Configuración</span> Global
          </h1>
          <p className="text-muted-foreground mt-1">
            Ajustes generales del integrador de transacciones
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Destination Cluster */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Server className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Cluster Destino</h3>
                <p className="text-sm text-muted-foreground">Configuración del tópico de salida</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nombre</label>
                <Input value={destination.name} readOnly className="bg-muted/30" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Bootstrap Servers</label>
                <Input
                  value={destination.bootstrapServers}
                  onChange={(e) => setDestination({ ...destination, bootstrapServers: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tópico de Salida</label>
                <Input
                  value={destination.topic}
                  onChange={(e) => setDestination({ ...destination, topic: e.target.value })}
                />
              </div>
            </div>
          </motion.div>

          {/* Retry Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Políticas de Retry</h3>
                <p className="text-sm text-muted-foreground">Configuración de reintentos</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Máximo de Reintentos</label>
                <Input
                  type="number"
                  value={retryConfig.maxRetries}
                  onChange={(e) => setRetryConfig({ ...retryConfig, maxRetries: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Delay Inicial (ms)</label>
                <Input
                  type="number"
                  value={retryConfig.retryDelay}
                  onChange={(e) => setRetryConfig({ ...retryConfig, retryDelay: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Multiplicador de Backoff</label>
                <Input
                  type="number"
                  step="0.1"
                  value={retryConfig.backoffMultiplier}
                  onChange={(e) =>
                    setRetryConfig({ ...retryConfig, backoffMultiplier: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Notificaciones</h3>
                <p className="text-sm text-muted-foreground">Alertas y reportes</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { key: "errorAlerts", label: "Alertas de Error", desc: "Notificar errores críticos" },
                { key: "performanceAlerts", label: "Alertas de Rendimiento", desc: "Latencia alta o bajo throughput" },
                { key: "weeklyReports", label: "Reportes Semanales", desc: "Resumen semanal por email" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        [item.key]: !notifications[item.key as keyof typeof notifications],
                      })
                    }
                    className={cn(
                      "relative w-12 h-6 rounded-full transition-colors",
                      notifications[item.key as keyof typeof notifications]
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform",
                        notifications[item.key as keyof typeof notifications]
                          ? "translate-x-6"
                          : "translate-x-0.5"
                      )}
                    />
                  </button>
                </label>
              ))}

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-foreground">Slack Webhook URL</label>
                <Input
                  value={notifications.slackWebhook}
                  onChange={(e) => setNotifications({ ...notifications, slackWebhook: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 border-destructive/30"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Zona de Peligro</h3>
                <p className="text-sm text-muted-foreground">Acciones irreversibles</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <p className="font-medium text-foreground">Limpiar Cola de Errores</p>
                  <p className="text-sm text-muted-foreground">Elimina todos los mensajes en cola de DLQ</p>
                </div>
                <Button variant="destructive" size="sm">
                  Limpiar
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <p className="font-medium text-foreground">Reset de Offsets</p>
                  <p className="text-sm text-muted-foreground">Reinicia los consumer group offsets</p>
                </div>
                <Button variant="destructive" size="sm">
                  Resetear
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-end"
        >
          <Button variant="neon" size="lg" className="gap-2">
            <Save className="w-5 h-5" />
            Guardar Configuración
          </Button>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Settings;
