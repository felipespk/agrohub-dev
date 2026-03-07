import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft,
  Warehouse, Truck, FileBarChart, AlertTriangle, UserPlus, Wheat
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`flex items-center gap-2 px-4 py-5 ${collapsed ? "justify-center" : ""}`}>
          <Wheat className="h-7 w-7 text-sidebar-primary shrink-0" />
          {!collapsed && (
            <span className="text-lg font-display font-bold text-sidebar-primary-foreground tracking-tight">
              GrãoControl
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs tracking-wider">
            {!collapsed && "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/70"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
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
      </SidebarContent>
    </Sidebar>
  );
}
