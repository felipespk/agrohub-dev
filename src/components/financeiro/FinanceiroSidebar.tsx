import {
  LayoutDashboard, FileDown, FileUp, ArrowLeftRight, TrendingUp,
  Landmark, Tag, Target, Users, LogOut, Settings, ArrowLeft, Wheat, DollarSign,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useFarm } from "@/contexts/FarmContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/financeiro", icon: LayoutDashboard },
  { title: "Contas a Pagar", url: "/financeiro/contas-pagar", icon: FileDown },
  { title: "Contas a Receber", url: "/financeiro/contas-receber", icon: FileUp },
  { title: "Lançamentos", url: "/financeiro/lancamentos", icon: ArrowLeftRight },
  { title: "Fluxo de Caixa", url: "/financeiro/fluxo-caixa", icon: TrendingUp },
  { title: "Contas Bancárias", url: "/financeiro/contas-bancarias", icon: Landmark },
];

const configItems = [
  { title: "Categorias", url: "/financeiro/categorias", icon: Tag },
  { title: "Centros de Custo", url: "/financeiro/centros-custo", icon: Target },
  { title: "Contatos", url: "/financeiro/contatos", icon: Users },
];

export function FinanceiroSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { farmName } = useFarm();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        <div className={`px-4 pt-5 pb-2 ${collapsed ? "items-center flex flex-col" : ""}`}>
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
            <Wheat className="h-5 w-5 text-sidebar-primary shrink-0" />
            {!collapsed && (
              <span className="text-base font-bold text-sidebar-foreground tracking-tight">
                AgroHub
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => navigate("/conta")}
              className="text-[11px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors pl-7 truncate mt-0.5 text-left"
            >
              {farmName || "Configurar Fazenda"}
            </button>
          )}
        </div>

        <div className={`px-3 pb-2 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={() => navigate("/hub")}
            className={`flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 w-full ${collapsed ? "justify-center" : ""}`}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span>Voltar ao Hub</span>}
          </button>
        </div>

        <div className="mx-4 border-t border-sidebar-border" />

        <SidebarGroup className="flex-1 pt-2">
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[11px] tracking-widest font-semibold">
            {!collapsed && "Financeiro"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/financeiro"}
                      className="hover:bg-sidebar-accent/40 text-sidebar-foreground/80 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium border-l-[3px] border-sidebar-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-4 border-t border-sidebar-border" />

        <SidebarGroup className="pt-2">
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[11px] tracking-widest font-semibold">
            {!collapsed && "Configurações"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-sidebar-accent/40 text-sidebar-foreground/80 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium border-l-[3px] border-sidebar-primary"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="border-t border-sidebar-border" />
        <div className={`px-3 py-4 space-y-2 ${collapsed ? "flex flex-col items-center" : ""}`}>
          {!collapsed && user && (
            <p className="text-xs text-sidebar-foreground/40 truncate px-2">
              {user.email}
            </p>
          )}
          <button
            onClick={signOut}
            className={`flex items-center gap-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-sidebar-accent/40 w-full ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
