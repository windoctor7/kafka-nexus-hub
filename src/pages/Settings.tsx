import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Save, Plus, X, Server, Clock, Activity, ArrowRight, Zap, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIntegrator } from "@/contexts/IntegratorContext";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fetchConfig } from "@/lib/api";
import { Label } from "@/components/ui/label";

interface SourceClusterConfig {
  bootstrap_servers: string;
  topics: { topic: string }[];
}

interface DestinationClusterConfig {
  bootstrap_servers: string;
  topic: string;
}

const Settings = () => {
  const { selectedIntegrator, updateIntegrator } = useIntegrator();

  // Form States
  const [monitoringInterval, setMonitoringInterval] = useState<number>(30);
  const [logFilePath, setLogFilePath] = useState<string>("");
  const [sourceClusters, setSourceClusters] = useState<SourceClusterConfig[]>([{ bootstrap_servers: "", topics: [{ topic: "" }] }]);
  const [destinationCluster, setDestinationCluster] = useState<DestinationClusterConfig>({ bootstrap_servers: "", topic: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedIntegrator) {
      // Priority: Local DB Config > Remote Config > Default Empty
      const loadData = async () => {
        let config: any = null;

        if (selectedIntegrator.configuration) {
          config = typeof selectedIntegrator.configuration === 'string'
            ? JSON.parse(selectedIntegrator.configuration)
            : selectedIntegrator.configuration;
        } else if (selectedIntegrator.apiUrl) {
          try {
            config = await fetchConfig(selectedIntegrator.apiUrl);
          } catch (e) {
            console.error("Failed to load remote template");
          }
        }

        if (config) {
          setMonitoringInterval(config.monitoringInterval || 30);
          setLogFilePath(config.logFilePath || "/var/log/app.log"); // Default placeholder

          if (config.source_clusters && Array.isArray(config.source_clusters)) {
            setSourceClusters(config.source_clusters);
          }

          if (config.destination_cluster) {
            setDestinationCluster(config.destination_cluster);
          }
        }
      };
      loadData();
    }
  }, [selectedIntegrator?.id]);


  // Handlers
  const handleSourceChange = (index: number, field: keyof SourceClusterConfig, value: any) => {
    const newSources = [...sourceClusters];
    // @ts-ignore
    newSources[index][field] = value;
    setSourceClusters(newSources);
  };

  const handleTopicChange = (clusterIndex: number, topicString: string) => {
    const topics = topicString.split(',').map(t => ({ topic: t.trim() })).filter(t => t.topic.length > 0);
    const newSources = [...sourceClusters];
    newSources[clusterIndex].topics = topics;
    setSourceClusters(newSources);
  };

  const addSourceCluster = () => {
    setSourceClusters([...sourceClusters, { bootstrap_servers: "", topics: [{ topic: "" }] }]);
  };

  const removeSourceCluster = (index: number) => {
    if (sourceClusters.length === 1) return;
    setSourceClusters(sourceClusters.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedIntegrator) return;

    setIsSaving(true);
    try {
      const configObject = {
        monitoringInterval,
        logFilePath, // New Field
        source_clusters: sourceClusters,
        destination_cluster: destinationCluster
      };

      await updateIntegrator({
        ...selectedIntegrator,
        configuration: configObject
      });

      toast.success("Configuración guardada", {
        description: "Los parámetros de monitoreo han sido actualizados."
      });
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-8 space-y-8 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              <span className="text-primary text-glow-cyan">Configuración</span> de Monitoreo
            </h1>
            <p className="text-muted-foreground mt-1">
              Define los parámetros para el monitoreo activo de la infraestructura Kafka.
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2" size="lg">
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </motion.div>

        {/* 1. General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Configuración General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interval */}
              <div className="grid gap-2 max-w-sm">
                <Label>Frecuencia de Health Check (segundos)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="5"
                    max="300"
                    value={monitoringInterval}
                    onChange={(e) => setMonitoringInterval(parseInt(e.target.value) || 30)}
                  />
                  <span className="text-sm text-muted-foreground">segundos</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Determina cada cuánto el sidecar verificará el estado de los clústeres.
                </p>
              </div>

              {/* Log File Path */}
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Ruta del Archivo de Log
                </Label>
                <Input
                  value={logFilePath}
                  onChange={(e) => setLogFilePath(e.target.value)}
                  placeholder="/var/log/app.log"
                  className="font-mono text-sm bg-muted/20"
                />
                <p className="text-[10px] text-muted-foreground">
                  Ruta absoluta donde el sidecar buscará los logs de la aplicación para este integrador.
                </p>
              </div>

            </CardContent>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 2. Source Clusters */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Origen (Sources)
              </h2>
              <Button variant="ghost" size="sm" onClick={addSourceCluster} className="text-primary hover:text-primary/80">
                <Plus className="w-4 h-4 mr-1" /> Añadir Cluster
              </Button>
            </div>

            {sourceClusters.map((cluster, i) => (
              <Card key={i} className="border-border/50 bg-card/30 backdrop-blur-sm relative group hover:border-primary/30 transition-colors">
                <CardContent className="p-4 space-y-4">
                  {sourceClusters.length > 1 && (
                    <button
                      onClick={() => removeSourceCluster(i)}
                      className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">BOOTSTRAP SERVERS</Label>
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-muted-foreground" />
                      <Input
                        value={cluster.bootstrap_servers}
                        onChange={(e) => handleSourceChange(i, 'bootstrap_servers', e.target.value)}
                        placeholder="localhost:9092"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">TOPICS (Separados por coma)</Label>
                    <Input
                      value={cluster.topics.map(t => t.topic).join(', ')}
                      onChange={(e) => handleTopicChange(i, e.target.value)}
                      placeholder="TOPIC.A, TOPIC.B"
                      className="font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* 3. Destination Cluster */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Destino (Destination)
            </h2>

            <Card className="border-border/50 bg-card/30 backdrop-blur-sm border-l-4 border-l-yellow-400/50">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">BOOTSTRAP SERVERS</Label>
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <Input
                      value={destinationCluster.bootstrap_servers}
                      onChange={(e) => setDestinationCluster({ ...destinationCluster, bootstrap_servers: e.target.value })}
                      placeholder="localhost:9092"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">TOPIC DE SALIDA</Label>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Input
                      value={destinationCluster.topic}
                      onChange={(e) => setDestinationCluster({ ...destinationCluster, topic: e.target.value })}
                      placeholder="INTEGRATED.TOPIC"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
