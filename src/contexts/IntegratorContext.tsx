import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Integrator {
  id: string;
  name: string;
  description: string;
  status: 'online' | 'offline' | 'warning';
  wsUrl: string;
  apiUrl: string;
  lastActivity?: string;
  configuration?: any;
}

interface IntegratorContextType {
  selectedIntegrator: Integrator | null;
  setSelectedIntegrator: (integrator: Integrator | null) => void;
  integrators: Integrator[];
  addIntegrator: (integrator: Integrator) => void;
  updateIntegrator: (integrator: Integrator) => void;
  removeIntegrator: (id: string) => void;
}

const IntegratorContext = createContext<IntegratorContextType | undefined>(undefined);

// Default integrators for demo/initial load
const defaultIntegrators: Integrator[] = [
  {
    id: 'integrator-1',
    name: 'Local Dev Integrator',
    description: 'Integrador corriendo localmente en Docker',
    status: 'online',
    wsUrl: 'ws://localhost:3001/logs',
    apiUrl: 'http://localhost:3001/api',
    lastActivity: new Date().toISOString(),
  }
];

export const IntegratorProvider = ({ children }: { children: ReactNode }) => {
  const REGISTRY_API = "http://localhost:3001/api";
  const [integrators, setIntegrators] = useState<Integrator[]>([]);

  // Load selected ID from local storage (preference)
  const [selectedIntegratorId, setSelectedIntegratorId] = useState<string | null>(() => {
    return localStorage.getItem('kafka-selected-integrator-id');
  });

  const selectedIntegrator = integrators.find(i => i.id === selectedIntegratorId) || null;

  const fetchIntegrators = async () => {
    try {
      const res = await fetch(`${REGISTRY_API}/integrators`);
      if (res.ok) {
        const data = await res.json();
        setIntegrators(data);
      }
    } catch (err) {
      console.error("Failed to fetch integrators registry:", err);
    }
  };

  // Initial Load
  React.useEffect(() => {
    fetchIntegrators();
  }, []);

  // Sync selection preference
  React.useEffect(() => {
    if (selectedIntegratorId) {
      localStorage.setItem('kafka-selected-integrator-id', selectedIntegratorId);
    } else {
      localStorage.removeItem('kafka-selected-integrator-id');
    }
  }, [selectedIntegratorId]);

  const setSelectedIntegrator = (integrator: Integrator | null) => {
    setSelectedIntegratorId(integrator ? integrator.id : null);
  };

  const addIntegrator = async (integrator: Integrator) => {
    try {
      const res = await fetch(`${REGISTRY_API}/integrators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(integrator)
      });
      if (res.ok) {
        await fetchIntegrators(); // Refresh list
      } else {
        console.error("Failed to add integrator");
      }
    } catch (err) {
      console.error("Error adding integrator:", err);
    }
  };

  const updateIntegrator = async (integrator: Integrator) => {
    try {
      const res = await fetch(`${REGISTRY_API}/integrators/${integrator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(integrator)
      });
      if (res.ok) {
        await fetchIntegrators();
        if (selectedIntegratorId === integrator.id) {
          // Force refresh if current selection updated
        }
      }
    } catch (err) {
      console.error("Error updating integrator:", err);
    }
  };

  const removeIntegrator = async (id: string) => {
    try {
      const res = await fetch(`${REGISTRY_API}/integrators/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setIntegrators(prev => prev.filter(i => i.id !== id));
        if (selectedIntegratorId === id) {
          setSelectedIntegratorId(null);
        }
      }
    } catch (err) {
      console.error("Error removing integrator:", err);
    }
  };

  return (
    <IntegratorContext.Provider value={{
      selectedIntegrator,
      setSelectedIntegrator,
      integrators,
      addIntegrator,
      updateIntegrator,
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
