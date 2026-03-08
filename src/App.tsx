import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AppProvider } from "@/contexts/AppContext";
import Dashboard from "@/pages/Dashboard";
import Recebimento from "@/pages/Recebimento";
import SaidaVenda from "@/pages/SaidaVenda";
import SaidaGeral from "@/pages/SaidaGeral";
import ArmazenamentoPage from "@/pages/Armazenamento";
import Expedicao from "@/pages/Expedicao";
import Relatorio from "@/pages/Relatorio";
import QuebraTecnica from "@/pages/QuebraTecnica";
import Cadastro from "@/pages/Cadastro";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
