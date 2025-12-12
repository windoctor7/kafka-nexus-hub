import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { IntegratorProvider } from "@/contexts/IntegratorContext";
import IntegratorSelect from "./pages/IntegratorSelect";
import Dashboard from "./pages/Dashboard";
import Clusters from "./pages/Clusters";
import IntegrationRules from "./pages/IntegrationRules";
import Traceability from "./pages/Traceability";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <IntegratorProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<IntegratorSelect />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clusters" element={<Clusters />} />
            <Route path="/rules" element={<IntegrationRules />} />
            <Route path="/traceability" element={<Traceability />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </IntegratorProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
