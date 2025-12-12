import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { sourceFields, destinationFields, integrationRules } from "@/data/mockData";
import { Code2, Eye, Workflow, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import { FlowMapper } from "@/components/integration/FlowMapper";
import { toast } from "sonner";

type ViewMode = "visual" | "flow" | "code";

const IntegrationRules = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("flow");
  const [mappings, setMappings] = useState(
    integrationRules.map((r) => ({
      source: r.source,
      field: r.field,
      target: r.target,
    }))
  );

  const rulesJson = JSON.stringify(
    mappings.map((m) => ({
      source: m.source,
      field: m.field,
      name: m.target.split(".").pop(),
    })),
    null,
    2
  );

  const handleMappingsChange = useCallback((newMappings: { source: string; field: string; target: string }[]) => {
    setMappings(newMappings);
  }, []);

  const handleSave = () => {
    // Here you would send to your backend via WebSocket or REST
    toast.success("Reglas guardadas exitosamente", {
      description: `${mappings.length} mapeos configurados`,
    });
    console.log("Mappings to save:", mappings);
  };

  const handleCodeChange = (value: string | undefined) => {
    if (!value) return;
    try {
      const parsed = JSON.parse(value);
      const newMappings = parsed.map((rule: { source: string; field: string; name: string }) => ({
        source: rule.source,
        field: rule.field,
        target: `transaction.${rule.name}`,
      }));
      setMappings(newMappings);
    } catch {
      // Invalid JSON, ignore
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              <span className="text-primary text-glow-cyan">Reglas</span> de Integración
            </h1>
            <p className="text-muted-foreground mt-1">
              Mapea campos de origen al mensaje destino unificado
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
              <Button
                variant={viewMode === "flow" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("flow")}
                className="gap-2"
              >
                <Workflow className="w-4 h-4" />
                Flow
              </Button>
              <Button
                variant={viewMode === "visual" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("visual")}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Lista
              </Button>
              <Button
                variant={viewMode === "code" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("code")}
                className="gap-2"
              >
                <Code2 className="w-4 h-4" />
                Código
              </Button>
            </div>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Guardar
            </Button>
          </div>
        </motion.div>

        {/* Flow Mode - React Flow */}
        {viewMode === "flow" && (
          <FlowMapper
            sourceFields={sourceFields}
            destinationFields={destinationFields}
            initialMappings={mappings}
            onMappingsChange={handleMappingsChange}
          />
        )}

        {/* Visual Mode - List View */}
        {viewMode === "visual" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Mapeos Activos</h3>
            <div className="space-y-3">
              {mappings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay mapeos configurados. Usa el modo Flow para crear conexiones.
                </p>
              ) : (
                mappings.map((mapping, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-background/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                          {mapping.source}
                        </span>
                        <code className="text-sm font-mono text-foreground">{mapping.field}</code>
                      </div>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div className="flex-1">
                      <code className="text-sm font-mono text-accent">{mapping.target}</code>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Code Mode */}
        {viewMode === "code" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-1">integration_rules.json</h3>
              <p className="text-sm text-muted-foreground">
                Edita directamente el JSON de reglas de mapeo
              </p>
            </div>
            <div className="rounded-lg overflow-hidden border border-border/50">
              <Editor
                height="500px"
                language="json"
                value={rulesJson}
                onChange={handleCodeChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "JetBrains Mono, monospace",
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  readOnly: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </motion.div>
        )}

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-6"
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Conexión activa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Campo origen</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-sm text-muted-foreground">Campo destino</span>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default IntegrationRules;
