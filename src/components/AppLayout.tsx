import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Leaf } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/recebimento": "Recebimento",
  "/saida-venda": "Saída (Venda)",
  "/saida-geral": "Saída Geral",
  "/armazenamento": "Armazenamento",
  "/expedicao": "Expedição",
  "/relatorio": "Relatório",
  "/quebra-tecnica": "Quebra Técnica",
  "/cadastro": "Cadastro",
  "/conta": "Conta",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || "AgroHub";
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border bg-card px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <div className="flex items-center gap-2 md:hidden">
                <Leaf className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground text-sm">AgroHub</span>
              </div>
              <span className="hidden md:block text-lg font-semibold text-foreground">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                {initials}
              </div>
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
