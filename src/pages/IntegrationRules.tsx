import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { sourceFields, destinationFields, integrationRules } from "@/data/mockData";
import { Code2, Eye, ArrowRight, Link2, Unlink, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";

type ViewMode = "visual" | "code";

const IntegrationRules = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  const [rules, setRules] = useState(integrationRules);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const rulesJson = JSON.stringify(
    rules.map((r) => ({
      source: r.source,
      field: r.field,
      name: r.target.split(".").pop(),
    })),
    null,
    2
  );

  const getConnectionForTarget = (targetPath: string) => {
    return rules.find((r) => r.target === targetPath);
  };

  const isFieldMapped = (sourcePath: string) => {
    return rules.some((r) => r.field === sourcePath);
  };

  const handleConnect = () => {
    if (selectedSource && selectedTarget) {
      const sourceField = sourceFields.find((f) => f.path === selectedSource);
      if (sourceField) {
        const newRule = {
          source: sourceField.topic,
          field: selectedSource,
          target: selectedTarget,
        };
        setRules([...rules.filter((r) => r.target !== selectedTarget), newRule]);
      }
      setSelectedSource(null);
      setSelectedTarget(null);
    }
  };

  const handleDisconnect = (targetPath: string) => {
    setRules(rules.filter((r) => r.target !== targetPath));
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
              <span className="text-primary text-glow-cyan">Reglas</span> de Integración
            </h1>
            <p className="text-muted-foreground mt-1">
              Mapea campos de origen al mensaje destino unificado
            </p>
          </div>
          <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/50">
            <Button
              variant={viewMode === "visual" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("visual")}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Visual
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
        </motion.div>

        {viewMode === "visual" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Source Fields */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GripVertical className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Campos de Origen</h3>
                  <p className="text-sm text-muted-foreground">Selecciona un campo para mapear</p>
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-cyber pr-2">
                {sourceFields.map((field) => {
                  const isMapped = isFieldMapped(field.path);
                  const isSelected = selectedSource === field.path;

                  return (
                    <motion.button
                      key={field.id}
                      onClick={() => setSelectedSource(isSelected ? null : field.path)}
                      whileHover={{ x: 4 }}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : isMapped
                          ? "border-success/30 bg-success/5"
                          : "border-border/50 hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {isMapped && <Link2 className="w-4 h-4 text-success" />}
                        <div>
                          <code className="text-sm font-mono text-foreground">{field.path}</code>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {field.type}
                            </span>
                            <span className="text-xs text-muted-foreground">{field.topic}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className={cn("w-4 h-4 transition-opacity", isSelected ? "text-primary opacity-100" : "opacity-0")} />
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Destination Fields */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <GripVertical className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Mensaje Destino</h3>
                  <p className="text-sm text-muted-foreground">TP-LOAN-INTEGRATED</p>
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-cyber pr-2">
                {destinationFields.map((field) => {
                  const connection = getConnectionForTarget(field.path);
                  const isSelected = selectedTarget === field.path;

                  return (
                    <motion.div
                      key={field.id}
                      className={cn(
                        "w-full p-3 rounded-lg border transition-all",
                        isSelected
                          ? "border-accent bg-accent/10"
                          : connection
                          ? "border-success/30 bg-success/5"
                          : "border-border/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono text-foreground">{field.path}</code>
                              {field.required && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                                  required
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{field.type}</span>
                          </div>
                        </div>

                        {connection ? (
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <code className="text-xs font-mono text-success">{connection.field}</code>
                              <p className="text-xs text-muted-foreground">{connection.source}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDisconnect(field.path)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8"
                            >
                              <Unlink className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTarget(null);
                              } else {
                                setSelectedTarget(field.path);
                                if (selectedSource) {
                                  setTimeout(handleConnect, 0);
                                }
                              }
                            }}
                          >
                            {selectedSource ? "Conectar" : "Seleccionar"}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-1">integration_rules.json</h3>
              <p className="text-sm text-muted-foreground">
                Estructura JSON de las reglas de mapeo
              </p>
            </div>
            <div className="rounded-lg overflow-hidden border border-border/50">
              <Editor
                height="500px"
                language="json"
                value={rulesJson}
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
            <span className="text-sm text-muted-foreground">Campo mapeado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Seleccionado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-border" />
            <span className="text-sm text-muted-foreground">Sin mapear</span>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default IntegrationRules;
