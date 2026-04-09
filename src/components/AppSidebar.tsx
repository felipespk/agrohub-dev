import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Warehouse, DollarSign, Beef, Wheat, Map, ShieldCheck,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const mainNav = [
  { to: '/hub',        icon: Home,       label: 'Hub' },
  { to: '/secador',    icon: Warehouse,  label: 'Secador / Silo' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/gado',       icon: Beef,       label: 'Pecuária' },
  { to: '/lavoura',    icon: Wheat,      label: 'Lavoura' },
]

const bottomNav = [
  { to: '/mapa', icon: Map, label: 'Mapa da Fazenda' },
]

export function AppSidebar() {
  const location = useLocation()
  const { profile } = useAuth()

  function isActive(to: string) {
    if (to === '/hub') return location.pathname === '/hub'
    return location.pathname.startsWith(to)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="fixed left-0 top-0 h-screen w-16 bg-[#111110] border-r border-white/[0.08] flex flex-col items-center py-4 z-40">
        {/* Logo mark */}
        <div className="mb-5 flex items-center justify-center w-10 h-10">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-elev-1 transition-transform duration-200 hover:scale-110">
            <span className="text-[#111110] font-black text-xs leading-none tracking-tight">AG</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-6 h-px bg-white/10 mb-3" />

        {/* Main navigation */}
        <nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-2">
          {mainNav.map(({ to, icon: Icon, label }) => {
            const active = isActive(to)
            return (
              <Tooltip key={to}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={to}
                    className={cn(
                      'relative w-full flex items-center justify-center h-9 rounded-md',
                      'transition-all duration-150',
                      active
                        ? 'text-white bg-white/[0.10]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.07]'
                    )}
                  >
                    {/* Active left bar — animates in */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[var(--primary)] animate-scale-in-x" />
                    )}
                    {/* Icon with hover scale */}
                    <span className={cn(
                      'transition-transform duration-150',
                      !active && 'group-hover:scale-110',
                    )}>
                      <Icon
                        size={17}
                        strokeWidth={active ? 2.2 : 1.8}
                        className={cn('transition-transform duration-150', !active && 'hover:scale-110')}
                      />
                    </span>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium animate-fade-in">
                  {label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Bottom navigation */}
        <div className="flex flex-col items-center gap-0.5 w-full px-2">
          {bottomNav.map(({ to, icon: Icon, label }) => {
            const active = isActive(to)
            return (
              <Tooltip key={to}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={to}
                    className={cn(
                      'relative w-full flex items-center justify-center h-9 rounded-md',
                      'transition-all duration-150',
                      active
                        ? 'text-white bg-white/[0.10]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.07]'
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[var(--primary)] animate-scale-in-x" />
                    )}
                    <Icon
                      size={17}
                      strokeWidth={1.8}
                      className="transition-transform duration-150 hover:scale-110"
                    />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
              </Tooltip>
            )
          })}

          {profile?.is_admin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/admin"
                  className={cn(
                    'relative w-full flex items-center justify-center h-9 rounded-md',
                    'transition-all duration-150',
                    isActive('/admin')
                      ? 'text-amber-400 bg-white/[0.10]'
                      : 'text-white/50 hover:text-amber-400 hover:bg-white/[0.07]'
                  )}
                >
                  <ShieldCheck
                    size={17}
                    strokeWidth={1.8}
                    className="transition-transform duration-150 hover:scale-110"
                  />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">Painel Admin</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
