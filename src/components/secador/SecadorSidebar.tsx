import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, PackagePlus, PackageMinus, Boxes,
  Ship, FileText, Minus, BookUser, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/secador/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/secador/recebimento',    icon: PackagePlus,     label: 'Recebimento' },
  { to: '/secador/saida-venda',    icon: PackageMinus,    label: 'Saída (Venda)' },
  { to: '/secador/saida-geral',    icon: PackageMinus,    label: 'Saída Geral' },
  { to: '/secador/armazenamento',  icon: Boxes,           label: 'Armazenamento' },
  { to: '/secador/expedicao',      icon: Ship,            label: 'Expedição' },
  { to: '/secador/relatorio',      icon: FileText,        label: 'Relatório' },
  { to: '/secador/quebra-tecnica', icon: Minus,           label: 'Quebra Técnica' },
  { to: '/secador/cadastro',       icon: BookUser,        label: 'Cadastro' },
  { to: '/secador/configuracoes',  icon: Settings,        label: 'Configurações' },
]

export function SecadorSidebar() {
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
