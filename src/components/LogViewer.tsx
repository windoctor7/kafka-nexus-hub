import { useEffect, useState, useRef } from 'react';
import { SIDECAR_WS } from '@/lib/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Terminal, XCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    logger?: string;
    context?: string;
}

export const LogViewer = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    useEffect(() => {
        // Auto-scroll to bottom
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const connect = () => {
        const ws = new WebSocket(SIDECAR_WS);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            addSystemLog('Connected to log stream');
        };

        ws.onclose = () => {
            setIsConnected(false);
            addSystemLog('Disconnected from log stream');
            // Reconnect after 3s
            setTimeout(connect, 3000);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Handle Logstash JSON format
                const entry: LogEntry = {
                    timestamp: data['@timestamp'] || new Date().toISOString(),
                    level: data.level || 'INFO',
                    message: data.message || JSON.stringify(data),
                    logger: data.logger_name,
                };
                setLogs(prev => [...prev.slice(-100), entry]); // Keep last 100 logs
            } catch (e) {
                // Handle plain text
                addSystemLog(event.data);
            }
        };
    };

    const addSystemLog = (msg: string) => {
        setLogs(prev => [...prev.slice(-100), {
            timestamp: new Date().toISOString(),
            level: 'SYSTEM',
            message: msg
        }]);
    };

    const getLevelColor = (level: string) => {
        switch (level.toUpperCase()) {
            case 'ERROR': return 'text-red-400';
            case 'WARN': return 'text-yellow-400';
            case 'INFO': return 'text-blue-400';
            case 'SYSTEM': return 'text-gray-400';
            default: return 'text-foreground';
        }
    };

    const getLevelIcon = (level: string) => {
        switch (level.toUpperCase()) {
            case 'ERROR': return <XCircle className="w-3 h-3 text-red-400" />;
            case 'WARN': return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
            case 'INFO': return <Info className="w-3 h-3 text-blue-400" />;
            default: return <Terminal className="w-3 h-3 text-gray-400" />;
        }
    };

    return (
        <div className="flex flex-col h-[400px] glass-card overflow-hidden border border-border/50">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Live Backend Logs</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                    <span className="text-xs text-muted-foreground">{isConnected ? 'Live' : 'Disconnected'}</span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 hover:bg-white/5 p-0.5 rounded">
                        <span className="text-gray-500 shrink-0">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="shrink-0 pt-0.5">
                            {getLevelIcon(log.level)}
                        </span>
                        <span className={cn("flex-1 break-all", getLevelColor(log.level))}>
                            {log.message}
                        </span>
                    </div>
                ))}
                {logs.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        Waiting for logs...
                    </div>
                )}
            </div>
        </div>
    );
};
