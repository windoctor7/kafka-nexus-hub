import { useState } from 'react';
import { Plus, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIntegrator } from '@/contexts/IntegratorContext';
import { toast } from 'sonner';

const AddIntegratorDialog = () => {
  const { addIntegrator } = useIntegrator();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    wsUrl: '',
    status: 'offline' as 'online' | 'offline' | 'warning',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.wsUrl.trim()) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    const newIntegrator = {
      id: `integrator-${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      wsUrl: formData.wsUrl.trim(),
      status: formData.status,
      lastActivity: new Date().toISOString(),
    };

    addIntegrator(newIntegrator);
    toast.success(`Integrador "${newIntegrator.name}" agregado correctamente`);
    
    setFormData({
      name: '',
      description: '',
      wsUrl: '',
      status: 'offline',
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Agregar Integrador
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Nuevo Integrador</DialogTitle>
              <DialogDescription>
                Configura un nuevo componente integrador para monitorear
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

          <div className="space-y-2">
            <Label htmlFor="wsUrl">WebSocket URL *</Label>
            <Input
              id="wsUrl"
              placeholder="ws://localhost:8080/ws"
              value={formData.wsUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, wsUrl: e.target.value }))}
              className="bg-background/50 font-mono text-sm"
            />
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
            <Button type="submit" className="gap-2">
              <Plus className="w-4 h-4" />
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddIntegratorDialog;
