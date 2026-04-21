import {
  LayoutDashboard, FileDown, FileUp, ArrowLeftRight, TrendingUp,
  Landmark, Tag, Target, Users, LogOut, ArrowLeft, Settings, DollarSign,
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
  { title: "Configurações", url: "/financeiro/configuracoes", icon: Settings },
];

export function FinanceiroSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { getFarmName } = useFarm();
  const navigate = useNavigate();
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "U";

  const renderItems = (items: typeof menuItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink to={item.url} end={item.url === "/financeiro"}
            className="flex items-center gap-3 px-5 py-2.5 text-[14px] text-white/60 hover:bg-white/[0.06] transition-colors font-normal rounded-lg mx-2"
            activeClassName="bg-white/[0.1] text-white font-medium border-l-[3px] border-[hsl(142,76%,36%)] !pl-[17px]">
            <item.icon className="h-[22px] w-[22px] shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full bg-[hsl(var(--sidebar-background))]">
        <div className={`px-5 pt-5 pb-3 ${collapsed ? "items-center flex flex-col px-2" : ""}`}>
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
            <DollarSign className="h-[22px] w-[22px] text-white/90 shrink-0" />
            {!collapsed && <span className="text-[18px] font-bold text-white tracking-tight">AgroHub</span>}
          </div>
          {!collapsed && (
            <button onClick={() => navigate("/conta")}
              className="text-[12px] text-white/40 hover:text-white/70 transition-colors truncate mt-1 text-left block">
              {getFarmName("financeiro") || "Configurar Fazenda"}
            </button>
          )}
        </div>

        <div className={`px-3 pb-3 ${collapsed ? "flex justify-center" : ""}`}>
          <button onClick={() => navigate("/hub")}
            className={`flex items-center gap-2.5 text-[14px] text-white/60 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.08] w-full ${collapsed ? "justify-center" : ""}`}>
            <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Voltar ao Hub</span>}
          </button>
        </div>

        <div className="mx-4 border-t border-white/[0.06]" />

        <SidebarGroup className="flex-1 pt-0">
          <SidebarGroupLabel className="text-white/30 uppercase text-[11px] tracking-[1.5px] font-semibold px-5 mt-4 mb-1">
            {!collapsed && "Financeiro"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(menuItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-4 border-t border-white/[0.06]" />

        <SidebarGroup className="pt-0">
          <SidebarGroupLabel className="text-white/30 uppercase text-[11px] tracking-[1.5px] font-semibold px-5 mt-3 mb-1">
            {!collapsed && "Configurações"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(configItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-4 border-t border-white/[0.06]" />
        <div className={`px-3 py-4 ${collapsed ? "flex flex-col items-center" : ""}`}>
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">{initials}</div>
            {!collapsed && <div className="flex-1 min-w-0"><p className="text-[13px] text-white/60 truncate">{user?.email}</p></div>}
            <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors shrink-0" title="Sair">
              <LogOut className="h-[18px] w-[18px] text-white/40 hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
