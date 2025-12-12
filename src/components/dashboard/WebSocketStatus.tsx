import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConnectionStatus } from '@/hooks/useWebSocket';

interface WebSocketStatusProps {
  status: ConnectionStatus;
  reconnectAttempts: number;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WebSocketStatus = ({
  status,
  reconnectAttempts,
  onConnect,
  onDisconnect,
}: WebSocketStatusProps) => {
  const statusConfig = {
    connected: {
      icon: Wifi,
      label: 'Conectado',
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
    },
    connecting: {
      icon: RefreshCw,
      label: 'Conectando...',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
    },
    disconnected: {
      icon: WifiOff,
      label: 'Desconectado',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/10',
      borderColor: 'border-muted/30',
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-3 px-4 py-2 rounded-lg border backdrop-blur-sm',
        config.bgColor,
        config.borderColor
      )}
    >
      <Icon className={cn('w-4 h-4', config.color, status === 'connecting' && 'animate-spin')} />
      <div className="flex flex-col">
        <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
        {reconnectAttempts > 0 && status !== 'connected' && (
          <span className="text-xs text-muted-foreground">
            Intento {reconnectAttempts} de reconexión
          </span>
        )}
      </div>
      
      {status === 'disconnected' || status === 'error' ? (
        <Button variant="ghost" size="sm" onClick={onConnect} className="ml-auto">
          Conectar
        </Button>
      ) : status === 'connected' ? (
        <Button variant="ghost" size="sm" onClick={onDisconnect} className="ml-auto text-muted-foreground">
          Desconectar
        </Button>
      ) : null}
    </motion.div>
  );
};
