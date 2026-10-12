import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Server, Save } from 'lucide-react';
import { useIntegrator, Integrator } from '@/contexts/IntegratorContext';
import { toast } from "sonner";

interface IntegratorDialogProps {
  initialData?: Integrator;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AddIntegratorDialog = ({ initialData, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: IntegratorDialogProps = {}) => {
  const { addIntegrator, updateIntegrator } = useIntegrator();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen || setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    wsUrl: 'ws://localhost:3001/logs',
    apiUrl: 'http://localhost:3001/api',
    status: 'online' as 'online' | 'offline' | 'warning',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description,
        wsUrl: initialData.wsUrl,
        apiUrl: initialData.apiUrl,
        status: initialData.status
      });
    } else {
      // Reset defaults when opening in Add mode
      if (isOpen) {
        setFormData({
          name: '',
          description: '',
          wsUrl: 'ws://localhost:3001/logs',
          apiUrl: 'http://localhost:3001/api',
          status: 'online',
        });
      }
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const integratorData = {
        ...formData,
        id: initialData?.id || crypto.randomUUID(),
        lastActivity: initialData?.lastActivity || new Date().toISOString(),
      };

      if (initialData) {
        await updateIntegrator(integratorData);
        toast.success("Integrador actualizado");
      } else {
        await addIntegrator(integratorData);
        toast.success("Integrador agregado exitosamente");
      }

      setOpen(false);

      if (!initialData) {
        setFormData({
          name: '',
          description: '',
          wsUrl: 'ws://localhost:3001/logs',
          apiUrl: 'http://localhost:3001/api',
          status: 'online',
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar integrador");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Nuevo Integrador
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-border/50 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{initialData ? 'Editar Integrador' : 'Agregar Nuevo Integrador'}</DialogTitle>
              <DialogDescription>
                {initialData ? 'Modifica los datos de conexión del componente.' : 'Configura los datos de conexión para un nuevo componente integrador.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              placeholder="Ej: Payments Integrator"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="bg-background/50"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Describe la función de este integrador..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-background/50 resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl">API URL *</Label>
              <Input
                id="apiUrl"
                placeholder="http://localhost:3001/api"
                value={formData.apiUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                className="bg-background/50 font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsUrl">WebSocket URL *</Label>
              <Input
                id="wsUrl"
                placeholder="ws://localhost:3001/logs"
                value={formData.wsUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, wsUrl: e.target.value }))}
                className="bg-background/50 font-mono text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado Inicial</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'online' | 'offline' | 'warning') =>
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? (
                <>
                  <Save className="w-4 h-4" /> Guardar Cambios
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Agregar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddIntegratorDialog;
