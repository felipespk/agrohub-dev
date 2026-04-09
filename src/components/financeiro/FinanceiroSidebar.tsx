import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Receipt,
  TrendingUp, Landmark, Tag, Layers, Users, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/financeiro/dashboard',        icon: LayoutDashboard,  label: 'Dashboard' },
  { to: '/financeiro/contas-pagar',     icon: ArrowDownCircle,  label: 'Contas a Pagar' },
  { to: '/financeiro/contas-receber',   icon: ArrowUpCircle,    label: 'Contas a Receber' },
  { to: '/financeiro/lancamentos',      icon: Receipt,          label: 'Lançamentos' },
  { to: '/financeiro/fluxo-caixa',      icon: TrendingUp,       label: 'Fluxo de Caixa' },
  { to: '/financeiro/contas-bancarias', icon: Landmark,         label: 'Contas Bancárias' },
  { to: '/financeiro/categorias',       icon: Tag,              label: 'Categorias' },
  { to: '/financeiro/centros-custo',    icon: Layers,           label: 'Centros de Custo' },
  { to: '/financeiro/contatos',         icon: Users,            label: 'Contatos' },
  { to: '/financeiro/configuracoes',    icon: Settings,         label: 'Configurações' },
]

export function FinanceiroSidebar() {
  const location = useLocation()

  return (
    <nav className="bg-[var(--surface)] border-b border-[var(--border)] px-4 overflow-x-auto scrollbar-none">
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
                  ? 'bg-[#111110] text-white'
                  : 'text-[#6B7280] hover:text-[#111110] hover:bg-[#F6F6F6]'
              )}
            >
              <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
