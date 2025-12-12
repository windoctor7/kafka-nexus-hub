import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  Background,
  Controls,
  MarkerType,
  NodeTypes,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { Database, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SourceField {
  id: string;
  path: string;
  type: string;
  topic: string;
}

interface DestinationField {
  id: string;
  path: string;
  type: string;
  required: boolean;
}

interface FlowMapperProps {
  sourceFields: SourceField[];
  destinationFields: DestinationField[];
  initialMappings?: { source: string; field: string; target: string }[];
  onMappingsChange?: (mappings: { source: string; field: string; target: string }[]) => void;
}

// Custom Source Node with topic color
const SourceNode = ({ data }: { data: { label: string; type: string; topic: string; topicColor?: string } }) => (
  <div 
    className="px-4 py-3 rounded-lg border bg-background/90 backdrop-blur-sm min-w-[220px] shadow-lg"
    style={{ 
      borderColor: data.topicColor || 'hsl(var(--primary))',
      boxShadow: `0 4px 20px ${data.topicColor || 'hsl(var(--primary))'}20`
    }}
  >
    <Handle 
      type="source" 
      position={Position.Right} 
      className="!w-3 !h-3 !border-2 !border-primary-foreground"
      style={{ backgroundColor: data.topicColor || 'hsl(var(--primary))' }}
    />
    <div className="flex items-center gap-2 mb-1">
      <Database className="w-4 h-4" style={{ color: data.topicColor || 'hsl(var(--primary))' }} />
      <span 
        className="text-xs font-medium px-2 py-0.5 rounded"
        style={{ 
          backgroundColor: `${data.topicColor || 'hsl(var(--primary))'}20`,
          color: data.topicColor || 'hsl(var(--primary))'
        }}
      >
        {data.topic}
      </span>
    </div>
    <code className="text-sm font-mono text-foreground">{data.label}</code>
    <div className="mt-1">
      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{data.type}</span>
    </div>
  </div>
);

// Custom Destination Node
const DestinationNode = ({ data }: { data: { label: string; type: string; required: boolean } }) => (
  <div className={cn(
    "px-4 py-3 rounded-lg border bg-background/90 backdrop-blur-sm min-w-[200px] shadow-lg",
    data.required ? "border-accent/50 shadow-accent/10" : "border-muted/50"
  )}>
    <Handle 
      type="target" 
      position={Position.Left}
      className="!w-3 !h-3 !bg-accent !border-2 !border-accent-foreground"
    />
    <div className="flex items-center gap-2 mb-1">
      <Send className="w-4 h-4 text-accent" />
      <span className="text-xs text-muted-foreground">TP-LOAN-INTEGRATED</span>
      {data.required && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">req</span>
      )}
    </div>
    <code className="text-sm font-mono text-foreground">{data.label}</code>
    <div className="mt-1">
      <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">{data.type}</span>
    </div>
  </div>
);

const nodeTypes: NodeTypes = {
  source: SourceNode,
  destination: DestinationNode,
};

export const FlowMapper = ({
  sourceFields,
  destinationFields,
  initialMappings = [],
  onMappingsChange,
}: FlowMapperProps) => {
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);

  // Create initial nodes grouped by topic
  const initialNodes: Node[] = useMemo(() => {
    // Group source fields by topic
    const groupedByTopic = sourceFields.reduce((acc, field) => {
      if (!acc[field.topic]) acc[field.topic] = [];
      acc[field.topic].push(field);
      return acc;
    }, {} as Record<string, typeof sourceFields>);

    const topics = Object.keys(groupedByTopic);
    const sources: Node[] = [];
    let yOffset = 50;

    topics.forEach((topic, topicIndex) => {
      const fields = groupedByTopic[topic];
      const topicColor = `hsl(${(topicIndex * 60) % 360}, 70%, 50%)`;
      
      fields.forEach((field, fieldIndex) => {
        sources.push({
          id: `source-${field.id}`,
          type: 'source',
          position: { x: 50, y: yOffset },
          data: { 
            label: field.path, 
            type: field.type, 
            topic: field.topic,
            topicColor,
          },
          draggable: true,
        });
        yOffset += 85;
      });
      
      // Add spacing between topic groups
      yOffset += 30;
    });

    const destinations: Node[] = destinationFields.map((field, index) => ({
      id: `dest-${field.id}`,
      type: 'destination',
      position: { x: 500, y: 50 + index * 85 },
      data: { label: field.path, type: field.type, required: field.required },
      draggable: true,
    }));

    return [...sources, ...destinations];
  }, [sourceFields, destinationFields]);

  // Create initial edges from mappings
  const initialEdges: Edge[] = useMemo(() => {
    return initialMappings.map((mapping, index) => {
      const sourceField = sourceFields.find(f => f.path === mapping.field);
      const destField = destinationFields.find(f => f.path === mapping.target);
      
      if (!sourceField || !destField) return null;

      return {
        id: `edge-${index}`,
        source: `source-${sourceField.id}`,
        target: `dest-${destField.id}`,
        animated: true,
        style: { stroke: 'hsl(var(--success))', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'hsl(var(--success))',
        },
      };
    }).filter(Boolean) as Edge[];
  }, [initialMappings, sourceFields, destinationFields]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const getMappingsFromEdges = useCallback((currentEdges: Edge[]) => {
    return currentEdges.map(edge => {
      const sourceId = edge.source.replace('source-', '');
      const destId = edge.target.replace('dest-', '');
      
      const sourceField = sourceFields.find(f => f.id === sourceId);
      const destField = destinationFields.find(f => f.id === destId);

      if (!sourceField || !destField) return null;

      return {
        source: sourceField.topic,
        field: sourceField.path,
        target: destField.path,
      };
    }).filter(Boolean) as { source: string; field: string; target: string }[];
  }, [sourceFields, destinationFields]);

  const onConnect = useCallback(
    (params: Connection) => {
      // Only allow source -> destination connections
      if (!params.source?.startsWith('source-') || !params.target?.startsWith('dest-')) {
        return;
      }

      // Remove existing edge to this target
      const newEdges = edges.filter(e => e.target !== params.target);
      
      const newEdge: Edge = {
        ...params,
        id: `edge-${Date.now()}`,
        animated: true,
        style: { stroke: 'hsl(var(--success))', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'hsl(var(--success))',
        },
      } as Edge;

      const updatedEdges = addEdge(newEdge, newEdges);
      setEdges(updatedEdges);
      onMappingsChange?.(getMappingsFromEdges(updatedEdges));
    },
    [edges, setEdges, onMappingsChange, getMappingsFromEdges]
  );

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(selectedEdge === edge.id ? null : edge.id);
  }, [selectedEdge]);

  const deleteSelectedEdge = useCallback(() => {
    if (selectedEdge) {
      const newEdges = edges.filter(e => e.id !== selectedEdge);
      setEdges(newEdges);
      setSelectedEdge(null);
      onMappingsChange?.(getMappingsFromEdges(newEdges));
    }
  }, [selectedEdge, edges, setEdges, onMappingsChange, getMappingsFromEdges]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-[600px] rounded-lg border border-border/50 overflow-hidden bg-background/50"
    >
      {selectedEdge && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="destructive"
            size="sm"
            onClick={deleteSelectedEdge}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar conexión
          </Button>
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges.map(e => ({
          ...e,
          style: {
            ...e.style,
            stroke: selectedEdge === e.id ? 'hsl(var(--destructive))' : 'hsl(var(--success))',
          },
        }))}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="touch-none"
      >
        <Background color="hsl(var(--muted))" gap={20} size={1} />
        <Controls className="!bg-background/80 !border-border/50 !rounded-lg [&>button]:!bg-background [&>button]:!border-border/50 [&>button]:!text-foreground [&>button:hover]:!bg-muted" />
      </ReactFlow>

      {/* Instructions overlay */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/50">
        Arrastra desde un campo origen al destino para crear conexiones • Click en una conexión para eliminarla
      </div>
    </motion.div>
  );
};
