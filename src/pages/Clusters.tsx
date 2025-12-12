import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { sourceClusters } from "@/data/mockData";
import {
  Server,
  Plus,
  Edit2,
  Trash2,
  X,
  Shield,
  Key,
  FileKey,
  ShieldOff,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthType = "PEM" | "JKS" | "KERBEROS" | "NONE";

interface ClusterForm {
  name: string;
  bootstrapServers: string;
  topics: string[];
  authType: AuthType;
}

const authTypes: { type: AuthType; label: string; icon: React.ElementType }[] = [
  { type: "PEM", label: "PEM Certificate", icon: FileKey },
  { type: "JKS", label: "Java Keystore", icon: Key },
  { type: "KERBEROS", label: "Kerberos", icon: Shield },
  { type: "NONE", label: "No Auth", icon: ShieldOff },
];

const Clusters = () => {
  const [clusters, setClusters] = useState(sourceClusters);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<string | null>(null);
  const [form, setForm] = useState<ClusterForm>({
    name: "",
    bootstrapServers: "",
    topics: [],
    authType: "NONE",
  });
  const [topicInput, setTopicInput] = useState("");

  const openModal = (clusterId?: string) => {
    if (clusterId) {
      const cluster = clusters.find((c) => c.id === clusterId);
      if (cluster) {
        setForm({
          name: cluster.name,
          bootstrapServers: cluster.bootstrapServers,
          topics: cluster.topics,
          authType: cluster.authType,
        });
        setEditingCluster(clusterId);
      }
    } else {
      setForm({ name: "", bootstrapServers: "", topics: [], authType: "NONE" });
      setEditingCluster(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCluster(null);
    setTopicInput("");
  };

  const addTopic = () => {
    if (topicInput.trim() && !form.topics.includes(topicInput.trim())) {
      setForm({ ...form, topics: [...form.topics, topicInput.trim()] });
      setTopicInput("");
    }
  };

  const removeTopic = (topic: string) => {
    setForm({ ...form, topics: form.topics.filter((t) => t !== topic) });
  };

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
              <span className="text-primary text-glow-cyan">Gestión</span> de Clusters
            </h1>
            <p className="text-muted-foreground mt-1">
              Configura los clusters de Kafka de origen
            </p>
          </div>
          <Button onClick={() => openModal()} variant="neon" className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar Cluster
          </Button>
        </motion.div>

        {/* Clusters Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Nombre</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Bootstrap Servers</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Topics</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Auth</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Msgs/min</th>
                  <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clusters.map((cluster, index) => (
                  <motion.tr
                    key={cluster.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className={cn("status-indicator", cluster.status === "online" ? "online" : "offline")} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Server className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{cluster.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded font-mono">
                        {cluster.bootstrapServers.length > 40
                          ? cluster.bootstrapServers.substring(0, 40) + "..."
                          : cluster.bootstrapServers}
                      </code>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {cluster.topics.map((topic) => (
                          <span
                            key={topic}
                            className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        cluster.authType === "NONE"
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                      )}>
                        {cluster.authType}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-foreground font-mono">{cluster.messagesPerMinute.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openModal(cluster.id)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-2xl p-6 border border-primary/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  {editingCluster ? "Editar Cluster" : "Nuevo Cluster"}
                </h2>
                <Button variant="ghost" size="icon" onClick={closeModal}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Nombre del Cluster</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Production Cluster..."
                  />
                </div>

                {/* Bootstrap Servers */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bootstrap Servers</label>
                  <Input
                    value={form.bootstrapServers}
                    onChange={(e) => setForm({ ...form, bootstrapServers: e.target.value })}
                    placeholder="kafka-server:9092,kafka-server2:9092"
                  />
                </div>

                {/* Topics */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Topics</label>
                  <div className="flex gap-2">
                    <Input
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      placeholder="Nombre del topic..."
                      onKeyDown={(e) => e.key === "Enter" && addTopic()}
                    />
                    <Button onClick={addTopic} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.topics.map((topic) => (
                      <span
                        key={topic}
                        className="flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                      >
                        {topic}
                        <button onClick={() => removeTopic(topic)} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Auth Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tipo de Autenticación</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {authTypes.map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => setForm({ ...form, authType: type })}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                          form.authType === type
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Certificate Upload (shown for PEM/JKS) */}
                {(form.authType === "PEM" || form.authType === "JKS") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-medium text-foreground">Certificado</label>
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Arrastra tu certificado {form.authType} aquí o haz clic para seleccionar
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                  <Button variant="ghost" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button variant="default">
                    {editingCluster ? "Guardar Cambios" : "Crear Cluster"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default Clusters;
