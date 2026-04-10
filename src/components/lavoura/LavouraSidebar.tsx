import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, SquareDashed, CalendarDays, BookOpen,
  Package, Truck, Scissors, Bug, ShoppingCart, FileBarChart,
  Sprout, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/lavoura/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/lavoura/talhoes',         icon: SquareDashed,    label: 'Talhões' },
  { to: '/lavoura/safras',          icon: CalendarDays,    label: 'Safras' },
  { to: '/lavoura/caderno-campo',   icon: BookOpen,        label: 'Caderno de Campo' },
  { to: '/lavoura/insumos',         icon: Package,         label: 'Insumos' },
  { to: '/lavoura/maquinas',        icon: Truck,           label: 'Máquinas' },
  { to: '/lavoura/colheitas',       icon: Scissors,        label: 'Colheitas' },
  { to: '/lavoura/pragas',          icon: Bug,             label: 'Pragas / MIP' },
  { to: '/lavoura/comercializacao', icon: ShoppingCart,    label: 'Comercialização' },
  { to: '/lavoura/relatorios',      icon: FileBarChart,    label: 'Relatórios' },
  { to: '/lavoura/culturas',        icon: Sprout,          label: 'Culturas' },
  { to: '/lavoura/configuracoes',   icon: Settings,        label: 'Configurações' },
]

export function LavouraSidebar() {
  const location = useLocation()

  return (
    <nav className="glass-tabs px-4 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-0.5 h-11">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5',
                'text-sm font-medium whitespace-nowrap',
                'transition-colors duration-150',
                active
                  ? 'bg-[#111110] text-white shadow-[inset_0_-2px_0_#78FC90]'
                  : 'text-[#6B7280] hover:text-[#111110] hover:bg-[#F6F6F6]'
              )}
            >
              <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </NavLink>
          )
        })}
        <span className="flex-shrink-0 w-4" />
      </div>
    </nav>
  )
}
