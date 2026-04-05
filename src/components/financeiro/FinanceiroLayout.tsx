import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FinanceiroSidebar } from "./FinanceiroSidebar";
import { Bell, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { ProfileDropdown } from "@/components/ProfileDropdown";

const pageTitles: Record<string, string> = {
  "/financeiro": "Dashboard Financeiro",
  "/financeiro/contas-pagar": "Contas a Pagar",
  "/financeiro/contas-receber": "Contas a Receber",
  "/financeiro/lancamentos": "Lançamentos",
  "/financeiro/fluxo-caixa": "Fluxo de Caixa",
  "/financeiro/contas-bancarias": "Contas Bancárias",
  "/financeiro/categorias": "Categorias",
  "/financeiro/centros-custo": "Centros de Custo",
  "/financeiro/contatos": "Contatos",
};

export function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Financeiro";
  

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <FinanceiroSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border bg-card px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <div className="flex items-center gap-2 md:hidden">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground text-sm">AgroHub</span>
              </div>
              <span className="hidden md:block text-lg font-semibold text-foreground">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </button>
              <ProfileDropdown />
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
