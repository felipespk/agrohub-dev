import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { FarmProvider } from "@/contexts/FarmContext";
import Dashboard from "@/pages/Dashboard";
import Recebimento from "@/pages/Recebimento";
import SaidaVenda from "@/pages/SaidaVenda";
import SaidaGeral from "@/pages/SaidaGeral";
import ArmazenamentoPage from "@/pages/Armazenamento";
import Expedicao from "@/pages/Expedicao";
import Relatorio from "@/pages/Relatorio";
import QuebraTecnica from "@/pages/QuebraTecnica";
import Cadastro from "@/pages/Cadastro";
import Conta from "@/pages/Conta";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <FarmProvider>
      <AppProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recebimento" element={<Recebimento />} />
            <Route path="/saida-venda" element={<SaidaVenda />} />
            <Route path="/saida-geral" element={<SaidaGeral />} />
            <Route path="/armazenamento" element={<ArmazenamentoPage />} />
            <Route path="/expedicao" element={<Expedicao />} />
            <Route path="/relatorio" element={<Relatorio />} />
            <Route path="/quebra-tecnica" element={<QuebraTecnica />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/conta" element={<Conta />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </AppProvider>
    </FarmProvider>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Carregando...</div></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
