import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LavouraSidebar } from "./LavouraSidebar";
import { Sprout } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { ProfileDropdown } from "@/components/ProfileDropdown";

const pageTitles: Record<string, string> = {
  "/lavoura": "Dashboard da Lavoura",
  "/lavoura/talhoes": "Talhões",
  "/lavoura/safras": "Safras",
  "/lavoura/atividades": "Caderno de Campo",
  "/lavoura/insumos": "Estoque de Insumos",
  "/lavoura/maquinas": "Máquinas e Equipamentos",
  "/lavoura/colheitas": "Colheita",
  "/lavoura/pragas": "Pragas / MIP",
  "/lavoura/comercializacao": "Comercialização",
  "/lavoura/culturas": "Culturas e Variedades",
  "/lavoura/configuracoes": "Configurações",
};

export function LavouraLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Lavoura";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <LavouraSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border bg-card px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <div className="flex items-center gap-2 md:hidden">
                <Sprout className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground text-sm">AgroHub</span>
              </div>
              <span className="hidden md:block text-lg font-semibold text-foreground">{title}</span>
            </div>
            <div className="flex items-center gap-3">
              <ProfileDropdown />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
