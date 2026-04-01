import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft,
  Warehouse, Truck, FileBarChart, AlertTriangle, UserPlus, Wheat, LogOut, Settings, ArrowLeft
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Recebimento", url: "/recebimento", icon: ArrowDownToLine },
  { title: "Saída (Venda)", url: "/saida-venda", icon: ArrowUpFromLine },
  { title: "Saída Geral", url: "/saida-geral", icon: ArrowRightLeft },
  { title: "Armazenamento", url: "/armazenamento", icon: Warehouse },
  { title: "Expedição", url: "/expedicao", icon: Truck },
  { title: "Relatório", url: "/relatorio", icon: FileBarChart },
  { title: "Quebra Técnica", url: "/quebra-tecnica", icon: AlertTriangle },
  { title: "Cadastro", url: "/cadastro", icon: UserPlus },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { farmName } = useFarm();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        {/* Logo */}
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

        {/* Back to Hub */}
        <div className={`px-3 pb-2 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={() => navigate("/hub")}
            className={`flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 w-full ${collapsed ? "justify-center" : ""}`}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span>Voltar ao Hub</span>}
          </button>
        </div>

        {/* Separator */}
        <div className="mx-4 border-t border-sidebar-border" />

        {/* Menu */}
        <SidebarGroup className="flex-1 pt-2">
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[11px] tracking-widest font-semibold">
            {!collapsed && "Secador"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
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

        {/* Footer */}
        <div className="border-t border-sidebar-border" />
        <div className={`px-3 py-4 space-y-2 ${collapsed ? "flex flex-col items-center" : ""}`}>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/conta"
                  className="hover:bg-sidebar-accent/40 text-sidebar-foreground/80 transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                >
                  <Settings className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>Conta</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
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
