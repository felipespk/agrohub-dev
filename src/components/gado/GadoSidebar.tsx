import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, PawPrint, MapPin, Weight, Syringe,
  ArrowLeftRight, Heart, Dna, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/gado/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/gado/animais',        icon: PawPrint,        label: 'Animais' },
  { to: '/gado/pastos',         icon: MapPin,          label: 'Pastos e Lotes' },
  { to: '/gado/pesagens',       icon: Weight,          label: 'Pesagens' },
  { to: '/gado/sanidade',       icon: Syringe,         label: 'Sanidade' },
  { to: '/gado/movimentacoes',  icon: ArrowLeftRight,  label: 'Movimentações' },
  { to: '/gado/reproducao',     icon: Heart,           label: 'Reprodução' },
  { to: '/gado/racas',          icon: Dna,             label: 'Raças' },
  { to: '/gado/configuracoes',  icon: Settings,        label: 'Configurações' },
]

export function GadoSidebar() {
  const location = useLocation()

  return (
    <nav className="bg-[var(--surface)] border-b border-[var(--border)] px-5 overflow-x-auto scrollbar-none">
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
                  : 'text-[#6B7280] hover:text-[#111110] hover:bg-[var(--surface-raised)]'
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
