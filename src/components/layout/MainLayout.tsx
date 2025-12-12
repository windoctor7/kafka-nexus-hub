import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useIntegrator } from "@/contexts/IntegratorContext";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const { selectedIntegrator } = useIntegrator();

  // Redirect to integrator selection if none selected
  useEffect(() => {
    if (!selectedIntegrator) {
      navigate('/');
    }
  }, [selectedIntegrator, navigate]);

  if (!selectedIntegrator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <Sidebar />
      <main className="ml-[260px] p-6 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
