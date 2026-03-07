import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Recebimento from "@/pages/Recebimento";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import {
  ArrowUpFromLine, ArrowRightLeft, Warehouse, Truck,
  FileBarChart, AlertTriangle, UserPlus
} from "lucide-react";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recebimento" element={<Recebimento />} />
            <Route path="/saida-venda" element={<PlaceholderPage title="Saída (Venda)" description="Registre saídas destinadas a compradores" icon={ArrowUpFromLine} />} />
            <Route path="/saida-geral" element={<PlaceholderPage title="Saída Geral" description="Transferências, devoluções e outras saídas" icon={ArrowRightLeft} />} />
            <Route path="/armazenamento" element={<PlaceholderPage title="Armazenamento" description="Faturamento quinzenal/mensal de armazenamento" icon={Warehouse} />} />
            <Route path="/expedicao" element={<PlaceholderPage title="Expedição" description="Resumo consolidado de expedições" icon={Truck} />} />
            <Route path="/relatorio" element={<PlaceholderPage title="Relatório" description="Saldo de estoque por produtor e tipo de grão" icon={FileBarChart} />} />
            <Route path="/quebra-tecnica" element={<PlaceholderPage title="Quebra Técnica" description="Registro de ajustes e perdas do secador" icon={AlertTriangle} />} />
            <Route path="/cadastro" element={<PlaceholderPage title="Cadastro" description="Produtores, tipos de grão e compradores" icon={UserPlus} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
