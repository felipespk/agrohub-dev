import {
  LayoutDashboard, List, MapPin, Scale, Heart, ArrowLeftRight,
  Baby, Tag, LogOut, ArrowLeft, Settings, Map,
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
  { title: "Dashboard", url: "/gado", icon: LayoutDashboard },
  { title: "Animais", url: "/gado/animais", icon: List },
  { title: "Pastos e Lotes", url: "/gado/pastos", icon: MapPin },
  { title: "Pesagens", url: "/gado/pesagens", icon: Scale },
  { title: "Sanidade", url: "/gado/sanidade", icon: Heart },
  { title: "Movimentações", url: "/gado/movimentacoes", icon: ArrowLeftRight },
  { title: "Mapa", url: "/mapa?modulo=gado", icon: Map },
];

const extraItems = [
  { title: "Reprodução", url: "/gado/reproducao", icon: Baby },
  { title: "Raças", url: "/gado/racas", icon: Tag },
];

const configItems = [
  { title: "Configurações", url: "/gado/configuracoes", icon: Settings },
];

export function GadoSidebar() {
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
          <NavLink to={item.url} end={item.url === "/gado"}
            className="flex items-center gap-3 px-6 py-2.5 text-[15px] text-[#DEE4EE] hover:bg-white/[0.03] transition-colors font-normal"
            activeClassName="bg-white/[0.05] text-white font-medium border-l-[3px] border-primary !pl-[21px]">
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full bg-[hsl(var(--sidebar-background))]">
        <div className={`px-6 pt-6 pb-3 ${collapsed ? "items-center flex flex-col px-2" : ""}`}>
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
            <img src="/icon-agrohub.png" alt="AgroHub" width={28} height={28} <img src="/icon-agrohub.png" alt="AgroHub" width={28} height={28} className="shrink-0" style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'none', padding: 0, borderRadius: 0 }} /> />
            {!collapsed && <span className="text-[20px] font-bold text-white tracking-tight">AgroHub</span>}
          </div>
          {!collapsed && (
            <button onClick={() => navigate("/gado/configuracoes")}
              className="text-[12px] text-[#8A99AF] hover:text-white/80 transition-colors pl-[34px] truncate mt-1 text-left block">
              {getFarmName("gado") || "Configurar Fazenda"}
            </button>
          )}
        </div>

        <div className={`px-4 pb-3 ${collapsed ? "flex justify-center" : ""}`}>
          <button onClick={() => navigate("/hub")}
            className={`flex items-center gap-2.5 text-[14px] text-[#DEE4EE] hover:text-white transition-colors px-2 py-2 rounded-md hover:bg-white/[0.05] w-full ${collapsed ? "justify-center" : ""}`}>
            <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Voltar ao Hub</span>}
          </button>
        </div>

        <div className="mx-4 border-t border-white/[0.06]" />

        <SidebarGroup className="flex-1 pt-0">
          <SidebarGroupLabel className="text-[#8A99AF] uppercase text-[11px] tracking-[1.5px] font-semibold px-6 mt-5 mb-2">
            {!collapsed && "Pecuária"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(menuItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-4 border-t border-white/[0.06]" />
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(extraItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-4 border-t border-white/[0.06]" />
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(configItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="flex-1" />
        <div className="mx-4 border-t border-white/[0.06]" />
        <div className={`px-4 py-4 ${collapsed ? "flex flex-col items-center" : ""}`}>
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">{initials}</div>
            {!collapsed && <div className="flex-1 min-w-0"><p className="text-[13px] text-[#DEE4EE] truncate">{user?.email}</p></div>}
            <button onClick={signOut} className="p-1.5 rounded hover:bg-white/[0.05] transition-colors shrink-0" title="Sair">
              <LogOut className="h-[18px] w-[18px] text-[#8A99AF] hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
