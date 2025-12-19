import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Server, Database, Cpu, Hash, ArrowDown, Zap, Layers } from "lucide-react";
import { useEffect, useState, useRef, forwardRef, useLayoutEffect } from "react";
import { SIDECAR_API } from "@/lib/api";
import { motion } from "framer-motion";

interface ClusterMetadata {
  clusterId?: string;
  controllerId?: number;
  brokerCount?: number;
  topicMessages?: Record<string, number>;
  brokers?: any[];
}

interface ClusterConfig {
  name: string;
  bootstrapServers: string;
  topics: string[];
  status: "online" | "offline" | "pending";
  metadata?: ClusterMetadata;
}

// --- Components ---

const ClusterCard = forwardRef<HTMLDivElement, { cluster: ClusterConfig, isDestination?: boolean }>(
  ({ cluster, isDestination = false }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md z-10 ${isDestination ? 'border-primary/50 ring-1 ring-primary/20 w-full max-w-2xl mx-auto' : 'h-full'
          }`}
      >
        {/* Status Indicator Line */}
        <div className={`absolute top-0 left-0 w-1 h-full ${cluster.status === "online" ? "bg-success" :
          cluster.status === "offline" ? "bg-destructive" : "bg-muted"
          }`} />

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cluster.status === "online" ? "bg-success/10 text-success" :
                cluster.status === "offline" ? "bg-destructive/10 text-destructive" : "bg-muted/10 text-muted-foreground"
                }`}>
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base leading-none tracking-tight">{cluster.name}</h3>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">{cluster.bootstrapServers}</p>
              </div>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cluster.status === "online" ? "bg-success/10 text-success border-success/20" :
              cluster.status === "offline" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted/10 text-muted-foreground border-muted/20"
              }`}>
              {cluster.status.toUpperCase()}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                <Database className="w-3 h-3" /> Brokers
              </div>
              <p className="text-lg font-bold text-foreground">
                {cluster.metadata?.brokerCount !== undefined ? cluster.metadata.brokerCount : "—"}
              </p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
                <Activity className="w-3 h-3" /> {isDestination ? "Integrados" : "Mensajes"}
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-lg font-bold text-foreground">
                  {(() => {
                    if (!cluster.metadata?.topicMessages) return "—";
                    const counts = Object.values(cluster.metadata.topicMessages) as number[];
                    if (counts.length === 0) return "0";
                    const total = counts.reduce((a, b) => a + b, 0);
                    return total.toLocaleString();
                  })()}
                </p>
                {!isDestination && (() => {
                  if (!cluster.metadata?.topicMessages) return null;
                  const counts = Object.values(cluster.metadata.topicMessages) as number[];
                  if (counts.length < 2) return null;
                  const allEqual = counts.every(v => v === counts[0]);
                  if (!allEqual) {
                    return (
                      <span className="text-[10px] font-bold text-warning bg-warning/10 px-1 py-0.5 rounded animate-pulse">
                        ⚠️ Desbalance
                      </span>
                    );
                  }
                  return (
                    <span className="text-[10px] font-bold text-success bg-success/10 px-1 py-0.5 rounded">
                      ✅ Sync
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Topics List */}
          {cluster.topics.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
              <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-2">
                Tópicos Configurados
              </p>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                {cluster.topics.map((topic) => (
                  <div key={topic} className="flex items-center justify-between text-xs group">
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[140px]" title={topic}>
                      {topic}
                    </span>
                    <span className="font-mono font-medium bg-muted/30 px-1.5 py-0.5 rounded text-[10px]">
                      {cluster.metadata?.topicMessages?.[topic]?.toLocaleString() || "0"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);
ClusterCard.displayName = "ClusterCard";

const IntegratorNode = forwardRef<HTMLDivElement, { totalProcessed: number, totalIntegrated: number }>(
  ({ totalProcessed, totalIntegrated }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-20 w-64 mx-auto"
      >
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
        <div className="relative bg-card border border-primary/50 shadow-[0_0_30px_-10px_rgba(var(--primary),0.3)] rounded-2xl p-6 text-center">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background border border-primary/30 text-primary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
            <Zap className="w-3 h-3 fill-current" />
            CORE INTEGRATOR
          </div>

          <div className="mt-2 space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Layers className="w-5 h-5" />
              <span className="text-sm font-medium">Procesando Transacciones</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Recibidos</p>
                <p className="text-xl font-bold text-foreground">{totalProcessed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Integrados</p>
                <p className="text-xl font-bold text-primary">{totalIntegrated.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
);
IntegratorNode.displayName = "IntegratorNode";

// --- Topology Overlay ---
// Draws lines connecting the exact DOM positions of the components

const TopologyOverlay = ({
  sourceNodes,
  integratorNode,
  destNode,
  activeSources,
  isDestActive
}: {
  sourceNodes: Map<number, HTMLDivElement>,
  integratorNode: HTMLDivElement | null,
  destNode: HTMLDivElement | null,
  activeSources: Set<number>,
  isDestActive: boolean
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ d: string, id: string, index: number }[]>([]);
  const [bottomPath, setBottomPath] = useState<string>("");

  const updatePaths = () => {
    if (!containerRef.current || !integratorNode) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const integratorRect = integratorNode.getBoundingClientRect();

    // Calculate Integrator Center relative to container
    const intCenterX = (integratorRect.left + integratorRect.width / 2) - containerRect.left;
    const intTopY = integratorRect.top - containerRect.top;
    const intBottomY = (integratorRect.top + integratorRect.height) - containerRect.top;

    // 1. Source -> Integrator Paths
    const newPaths = Array.from(sourceNodes.entries()).map(([i, node]) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();

      const startX = (rect.left + rect.width / 2) - containerRect.left;
      const startY = (rect.top + rect.height) - containerRect.top;

      // Control points for cubic bezier
      const cp1Y = startY + (intTopY - startY) * 0.5;
      const cp2Y = intTopY - (intTopY - startY) * 0.5;

      return {
        id: `source-path-${i}`,
        index: i,
        d: `M ${startX} ${startY} C ${startX} ${cp1Y}, ${intCenterX} ${cp2Y}, ${intCenterX} ${intTopY}`
      };
    }).filter(Boolean) as { d: string, id: string, index: number }[];

    setPaths(newPaths);

    // 2. Integrator -> Destination Path
    if (destNode) {
      const destRect = destNode.getBoundingClientRect();
      const destCenterX = (destRect.left + destRect.width / 2) - containerRect.left;
      const destTopY = destRect.top - containerRect.top;

      setBottomPath(`M ${intCenterX} ${intBottomY} L ${destCenterX} ${destTopY}`);
    } else {
      setBottomPath("");
    }
  };

  useLayoutEffect(() => {
    updatePaths();

    // Update on resize and scroll
    window.addEventListener('resize', updatePaths);
    window.addEventListener('scroll', updatePaths, true);

    // Polling for safety (animations)
    const interval = setInterval(updatePaths, 50);

    return () => {
      window.removeEventListener('resize', updatePaths);
      window.removeEventListener('scroll', updatePaths, true);
      clearInterval(interval);
    };
  }, [sourceNodes, integratorNode, destNode]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0 overflow-visible">
      <svg className="w-full h-full" style={{ overflow: 'visible' }}>
        {/* Source Paths */}
        {paths.map((path) => (
          <g key={path.id}>
            {/* Solid Line */}
            <path
              id={path.id}
              d={path.d}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeOpacity="0.4"
            />
            {/* Particle - Only visible if active */}
            <circle
              r="4"
              fill="hsl(var(--primary))"
              style={{
                opacity: activeSources.has(path.index) ? 1 : 0,
                transition: 'opacity 0.5s ease-in-out'
              }}
            >
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#${path.id}`} />
              </animateMotion>
            </circle>
          </g>
        ))}

        {/* Bottom Path */}
        {bottomPath && (
          <g>
            {/* Solid Line */}
            <path
              id="bottom-path"
              d={bottomPath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeOpacity="0.4"
            />
            {/* Particle - Only visible if active */}
            <circle
              r="4"
              fill="hsl(var(--primary))"
              style={{
                opacity: isDestActive ? 1 : 0,
                transition: 'opacity 0.5s ease-in-out'
              }}
            >
              <animateMotion
                dur="1.5s"
                repeatCount="indefinite"
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href="#bottom-path" />
              </animateMotion>
            </circle>
          </g>
        )}
      </svg>
    </div>
  );
};

const Clusters = () => {
  const [sourceClusters, setSourceClusters] = useState<ClusterConfig[]>([]);
  const [destinationCluster, setDestinationCluster] = useState<ClusterConfig | null>(null);

  // State for DOM nodes
  // Use a ref for source nodes to avoid constant re-renders from inline ref callbacks
  const sourceNodesRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const [integratorNode, setIntegratorNode] = useState<HTMLDivElement | null>(null);
  const [destNode, setDestNode] = useState<HTMLDivElement | null>(null);

  // Activity State
  const [activeSources, setActiveSources] = useState<Set<number>>(new Set());
  const [isDestActive, setIsDestActive] = useState(false);
  const lastCountsRef = useRef<{ sources: number[], dest: number }>({ sources: [], dest: 0 });

  // Force update to trigger topology redraw when source nodes change
  const [, forceUpdate] = useState({});

  // Stable callback for source refs
  const setSourceRef = (node: HTMLDivElement | null, index: number) => {
    if (node) {
      if (sourceNodesRef.current.get(index) !== node) {
        sourceNodesRef.current.set(index, node);
        forceUpdate({}); // Notify change only if node is different
      }
    } else {
      if (sourceNodesRef.current.has(index)) {
        sourceNodesRef.current.delete(index);
        // We generally don't need to force update on unmount of a single card 
        // unless it leaves a ghost line, but the map update handles it.
      }
    }
  };

  const fetchClusters = async () => {
    try {
      const configRes = await fetch(`${SIDECAR_API}/config`);
      const config = await configRes.json();
      const healthRes = await fetch(`${SIDECAR_API}/health/check`);
      const healthData = await healthRes.json();

      const mappedSource = config.source_clusters.map((c: any, i: number) => ({
        name: `Source Cluster ${i + 1}`,
        bootstrapServers: c.bootstrap_servers,
        topics: c.topics.map((t: any) => t.topic),
        status: healthData[c.bootstrap_servers]?.status || "pending",
        metadata: healthData[c.bootstrap_servers]?.metadata
      }));

      // Calculate Activity (Delta > 0)
      const currentSourceCounts = mappedSource.map((c: any) => {
        if (!c.metadata?.topicMessages) return 0;
        return Object.values(c.metadata.topicMessages).reduce((a: any, b: any) => a + b, 0) as number;
      });

      const newActiveSources = new Set<number>();
      currentSourceCounts.forEach((count: number, i: number) => {
        const prev = lastCountsRef.current.sources[i] || 0;
        if (count > prev) {
          newActiveSources.add(i);
        }
      });
      setActiveSources(newActiveSources);

      // Only update state if data changed to prevent re-renders
      setSourceClusters(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(mappedSource)) {
          return mappedSource;
        }
        return prev;
      });

      if (config.destination_cluster) {
        const dest = config.destination_cluster;
        const newDest = {
          name: "Destination Cluster",
          bootstrapServers: dest.bootstrap_servers,
          topics: [dest.topic],
          status: healthData[dest.bootstrap_servers]?.status || "pending",
          metadata: healthData[dest.bootstrap_servers]?.metadata
        };

        const currentDestCount = newDest.metadata?.topicMessages
          ? Object.values(newDest.metadata.topicMessages).reduce((a: any, b: any) => a + b, 0) as number
          : 0;

        const destActive = currentDestCount > lastCountsRef.current.dest;
        setIsDestActive(destActive);

        // Update Ref
        lastCountsRef.current = { sources: currentSourceCounts, dest: currentDestCount };

        setDestinationCluster(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newDest)) {
            return newDest;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error fetching clusters:", error);
    }
  };

  useEffect(() => {
    fetchClusters();
    const interval = setInterval(fetchClusters, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate aggregates
  const totalProcessed = sourceClusters.reduce((acc, c) => {
    if (!c.metadata?.topicMessages) return acc;
    return acc + Object.values(c.metadata.topicMessages).reduce((a, b) => a + b, 0);
  }, 0);

  const totalIntegrated = destinationCluster?.metadata?.topicMessages
    ? Object.values(destinationCluster.metadata.topicMessages).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <MainLayout>
      <div className="relative max-w-7xl mx-auto py-12 px-4 flex flex-col justify-evenly min-h-[85vh]">

        {/* Topology Overlay */}
        <TopologyOverlay
          sourceNodes={sourceNodesRef.current}
          integratorNode={integratorNode}
          destNode={destNode}
          activeSources={activeSources}
          isDestActive={isDestActive}
        />

        {/* 1. Source Clusters Layer */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {sourceClusters.map((cluster, i) => (
            <ClusterCard
              key={cluster.bootstrapServers}
              cluster={cluster}
              ref={(node) => setSourceRef(node, i)}
            />
          ))}
        </div>

        {/* 2. Integrator Layer */}
        <div className="relative z-20 flex justify-center">
          <IntegratorNode
            ref={setIntegratorNode}
            totalProcessed={totalProcessed}
            totalIntegrated={totalIntegrated}
          />
        </div>

        {/* 3. Destination Cluster Layer */}
        <div className="relative z-10 flex justify-center">
          {destinationCluster && (
            <ClusterCard
              key={destinationCluster.bootstrapServers}
              ref={setDestNode}
              cluster={destinationCluster}
              isDestination={true}
            />
          )}
        </div>

      </div>
    </MainLayout>
  );
};

export default Clusters;
