import { useEffect, useRef } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GadoSidebar } from "./GadoSidebar";
import { Bell, Beef } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { reclassificarAnimais } from "@/lib/reclassificar-animais";
import { toast } from "sonner";

const pageTitles: Record<string, string> = {
  "/gado": "Dashboard Pecuário",
  "/gado/animais": "Animais",
  "/gado/pastos": "Pastos e Lotes",
  "/gado/pesagens": "Pesagens",
  "/gado/sanidade": "Sanidade",
  "/gado/movimentacoes": "Movimentações",
  "/gado/reproducao": "Reprodução",
  "/gado/racas": "Raças",
  "/gado/configuracoes": "Configurações",
};

export function GadoLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Pecuária";
  
  const didReclassify = useRef(false);

  useEffect(() => {
    if (!user || didReclassify.current) return;
    didReclassify.current = true;
    reclassificarAnimais(user.id).then(count => {
      if (count > 0) {
        toast.info(`Reclassificação automática: ${count} ${count === 1 ? "animal atualizado" : "animais atualizados"} (bezerros que cresceram).`);
      }
    });
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <GadoSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between border-b border-border bg-card px-6 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              <div className="flex items-center gap-2 md:hidden">
                <Beef className="h-5 w-5 text-primary" />
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
