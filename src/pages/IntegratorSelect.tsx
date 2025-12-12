import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Server, Activity, AlertTriangle, XCircle, Plus, ArrowRight } from 'lucide-react';
import { useIntegrator, Integrator } from '@/contexts/IntegratorContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AddIntegratorDialog from '@/components/integrator/AddIntegratorDialog';
const statusConfig = {
  online: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
    glowColor: 'shadow-green-500/20',
    icon: Activity,
    label: 'Online',
  },
  warning: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    glowColor: 'shadow-yellow-500/20',
    icon: AlertTriangle,
    label: 'Warning',
  },
  offline: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    glowColor: 'shadow-red-500/20',
    icon: XCircle,
    label: 'Offline',
  },
};

const IntegratorCard = ({ 
  integrator, 
  onSelect 
}: { 
  integrator: Integrator; 
  onSelect: () => void;
}) => {
  const status = statusConfig[integrator.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={`cursor-pointer border-2 ${status.borderColor} bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 shadow-lg ${status.glowColor}`}
        onClick={onSelect}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${status.bgColor}`}>
                <Server className={`w-6 h-6 ${status.color}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{integrator.name}</CardTitle>
                <div className={`flex items-center gap-1.5 mt-1 ${status.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{status.label}</span>
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm mb-3">
            {integrator.description}
          </CardDescription>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <code className="px-2 py-1 rounded bg-muted/50">{integrator.wsUrl}</code>
            {integrator.lastActivity && (
              <span>
                Última actividad: {new Date(integrator.lastActivity).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const IntegratorSelect = () => {
  const navigate = useNavigate();
  const { integrators, setSelectedIntegrator } = useIntegrator();

  const handleSelectIntegrator = (integrator: Integrator) => {
    setSelectedIntegrator(integrator);
    navigate('/dashboard');
  };

  const onlineCount = integrators.filter(i => i.status === 'online').length;
  const warningCount = integrators.filter(i => i.status === 'warning').length;
  const offlineCount = integrators.filter(i => i.status === 'offline').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Server className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Kafka Integrator</h1>
                <p className="text-xs text-muted-foreground">Portal de Configuración y Monitoreo</p>
              </div>
            </div>
            <AddIntegratorDialog />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-2">Selecciona un Integrador</h2>
          <p className="text-muted-foreground">
            Elige el componente integrador que deseas monitorear y configurar
          </p>
        </motion.div>

        {/* Status Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/30 bg-green-500/10">
            <Activity className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-green-400">{onlineCount}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-yellow-400">{warningCount}</p>
              <p className="text-xs text-muted-foreground">Warning</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
            <XCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{offlineCount}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
          </div>
        </motion.div>

        {/* Integrators Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrators.map((integrator, index) => (
            <motion.div
              key={integrator.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <IntegratorCard
                integrator={integrator}
                onSelect={() => handleSelectIntegrator(integrator)}
              />
            </motion.div>
          ))}
        </div>

        {integrators.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Server className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay integradores configurados</h3>
            <p className="text-muted-foreground mb-4">
              Agrega tu primer integrador para comenzar el monitoreo
            </p>
            <AddIntegratorDialog />
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default IntegratorSelect;
