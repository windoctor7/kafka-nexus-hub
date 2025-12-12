import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Integrator {
  id: string;
  name: string;
  description: string;
  status: 'online' | 'offline' | 'warning';
  wsUrl: string;
  lastActivity?: string;
}

interface IntegratorContextType {
  selectedIntegrator: Integrator | null;
  setSelectedIntegrator: (integrator: Integrator | null) => void;
  integrators: Integrator[];
  addIntegrator: (integrator: Integrator) => void;
  removeIntegrator: (id: string) => void;
}

const IntegratorContext = createContext<IntegratorContextType | undefined>(undefined);

// Mock integrators for demo
const defaultIntegrators: Integrator[] = [
  {
    id: 'integrator-1',
    name: 'Payments Integrator',
    description: 'Procesa transacciones de pagos desde múltiples fuentes',
    status: 'online',
    wsUrl: 'ws://localhost:8080/ws',
    lastActivity: '2024-01-15T10:30:00Z',
  },
  {
    id: 'integrator-2',
    name: 'Orders Integrator',
    description: 'Integra órdenes de e-commerce y retail',
    status: 'warning',
    wsUrl: 'ws://localhost:8081/ws',
    lastActivity: '2024-01-15T09:45:00Z',
  },
  {
    id: 'integrator-3',
    name: 'Inventory Integrator',
    description: 'Sincroniza inventario entre sistemas',
    status: 'offline',
    wsUrl: 'ws://localhost:8082/ws',
    lastActivity: '2024-01-14T18:00:00Z',
  },
];

export const IntegratorProvider = ({ children }: { children: ReactNode }) => {
  const [selectedIntegrator, setSelectedIntegrator] = useState<Integrator | null>(null);
  const [integrators, setIntegrators] = useState<Integrator[]>(defaultIntegrators);

  const addIntegrator = (integrator: Integrator) => {
    setIntegrators(prev => [...prev, integrator]);
  };

  const removeIntegrator = (id: string) => {
    setIntegrators(prev => prev.filter(i => i.id !== id));
    if (selectedIntegrator?.id === id) {
      setSelectedIntegrator(null);
    }
  };

  return (
    <IntegratorContext.Provider value={{
      selectedIntegrator,
      setSelectedIntegrator,
      integrators,
      addIntegrator,
      removeIntegrator,
    }}>
      {children}
    </IntegratorContext.Provider>
  );
};

export const useIntegrator = () => {
  const context = useContext(IntegratorContext);
  if (!context) {
    throw new Error('useIntegrator must be used within an IntegratorProvider');
  }
  return context;
};
