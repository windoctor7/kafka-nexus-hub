import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Server,
  GitBranch,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIntegrator } from "@/contexts/IntegratorContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Server, label: "Clusters", path: "/clusters" },
  { icon: GitBranch, label: "Reglas de Integración", path: "/rules" },
  { icon: Search, label: "Trazabilidad", path: "/traceability" },
  { icon: Settings, label: "Configuración", path: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedIntegrator, setSelectedIntegrator } = useIntegrator();

  const handleChangeIntegrator = () => {
    setSelectedIntegrator(null);
    navigate('/');
  };

  const statusColor = selectedIntegrator?.status === 'online' 
    ? 'bg-green-500' 
    : selectedIntegrator?.status === 'warning' 
    ? 'bg-yellow-500' 
    : 'bg-red-500';

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <span className="font-bold text-foreground tracking-tight">Kafka</span>
              <span className="text-xs text-primary">Integrator</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Selected Integrator Info */}
      {selectedIntegrator && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          {collapsed ? (
            <div className="flex justify-center">
              <div className={`w-3 h-3 rounded-full ${statusColor}`} />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/50"
            >
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {selectedIntegrator.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {selectedIntegrator.wsUrl}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto scrollbar-cyber">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-primary/10 rounded-lg border border-primary/30"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                className={cn(
                  "w-5 h-5 relative z-10 transition-all duration-200",
                  isActive && "text-glow-cyan"
                )}
              />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative z-10 font-medium text-sm"
                >
                  {item.label}
                </motion.span>
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-lg shadow-primary/50" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Change Integrator Button */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleChangeIntegrator}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors mb-2"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Cambiar Integrador</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
