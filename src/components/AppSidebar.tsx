import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Map, ShieldCheck, LogOut, ChevronLeft, Home, Warehouse, DollarSign, Beef, Wheat } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const MODULE_PREFIXES = ['/secador', '/financeiro', '/gado', '/lavoura']

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut, session } = useAuth()

  const isInsideModule = MODULE_PREFIXES.some(p => location.pathname.startsWith(p))

  function isActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  const email = session?.user?.email ?? ''

  return (
    <aside className={cn(
      'group fixed left-0 top-0 h-screen z-40',
      'w-[60px] hover:w-[240px]',
      'transition-[width] duration-200 ease-in-out',
      'overflow-hidden',
      'bg-[#111110]',
      'border-r border-white/[0.12]',
      'shadow-[1px_0_4px_rgba(0,0,0,0.15)]',
      'flex flex-col',
    )}>

      {/* Header — icon */}
      <div className="flex items-center h-14 px-[10px] flex-shrink-0 border-b border-white/[0.06]">
        <img src="/icon-agrix.png" alt="Agrix" className="w-11 h-11 rounded-xl object-contain shrink-0" />
        {profile?.farm_name && (
          <p className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-3 text-white/40 text-[11px] leading-tight whitespace-nowrap truncate" style={{ maxWidth: '140px' }}>
            {profile.farm_name}
          </p>
        )}
      </div>

      {isInsideModule ? (
        /* ── Simplified nav when inside a module ── */
        <>
          <div className="flex flex-col gap-0.5 px-2 pt-3 flex-shrink-0">
            <button
              onClick={() => navigate('/hub')}
              className="relative flex items-center h-10 rounded-md w-full px-[14px] gap-3 transition-colors duration-150 text-white/50 hover:bg-white/[0.05] hover:text-white/80"
            >
              <ChevronLeft size={16} strokeWidth={1.8} className="flex-shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-sm font-medium whitespace-nowrap">
                Voltar ao Hub
              </span>
            </button>
          </div>
          <div className="flex-1" />
        </>
      ) : (
        /* ── Full nav on hub/mapa/admin ── */
        <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3 overflow-y-auto scrollbar-none">
          {[
            { to: '/hub', icon: Home, label: 'Hub' },
            { to: '/secador', icon: Warehouse, label: 'Secador / Silo' },
            { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
            { to: '/gado', icon: Beef, label: 'Pecuária' },
            { to: '/lavoura', icon: Wheat, label: 'Lavoura' },
          ].map(({ to, icon: Icon, label }) => {
            const active = to === '/hub' ? location.pathname === '/hub' : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to === '/hub' ? '/hub' : `${to}/dashboard`}
                className={cn(
                  'relative flex items-center h-10 rounded-md',
                  'px-[14px] gap-3',
                  'transition-colors duration-150',
                  active
                    ? 'bg-white/[0.10] text-white'
                    : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80',
                )}
              >
                {active && (
                  <span className="absolute left-0 top-[6px] bottom-[6px] w-1 bg-[#78FC90] rounded-r-full shadow-[0_0_8px_rgba(120,252,144,0.5)]" />
                )}
                <Icon size={18} strokeWidth={active ? 2.1 : 1.8} className="flex-shrink-0" style={active ? { filter: 'drop-shadow(0 0 6px rgba(120,252,144,0.25))' } : undefined} />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-sm font-medium whitespace-nowrap">
                  {label}
                </span>
              </NavLink>
            )
          })}
        </nav>
      )}

      {/* Divider */}
      <div className="mx-4 h-px bg-white/[0.08]" />

      {/* Bottom nav — Mapa + Admin */}
      <div className="flex flex-col gap-0.5 px-2 py-3 flex-shrink-0">
        <NavLink
          to="/mapa"
          className={cn(
            'relative flex items-center h-10 rounded-md w-full px-[14px] gap-3 transition-colors duration-150',
            isActive('/mapa')
              ? 'bg-white/[0.10] text-white'
              : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80',
          )}
        >
          {isActive('/mapa') && (
            <span className="absolute left-0 top-[6px] bottom-[6px] w-1 bg-[#78FC90] rounded-r-full shadow-[0_0_8px_rgba(120,252,144,0.5)]" />
          )}
          <Map size={16} strokeWidth={1.8} className="flex-shrink-0" />
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-sm font-medium whitespace-nowrap">
            Mapa da Fazenda
          </span>
        </NavLink>

        {profile?.is_admin && (
          <NavLink
            to="/admin"
            className={cn(
              'relative flex items-center h-10 rounded-md w-full px-[14px] gap-3 transition-colors duration-150',
              isActive('/admin')
                ? 'bg-white/[0.10] text-amber-400'
                : 'text-white/50 hover:bg-white/[0.05] hover:text-amber-400',
            )}
          >
            {isActive('/admin') && (
              <span className="absolute left-0 top-[6px] bottom-[6px] w-1 bg-amber-400 rounded-r-full shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
            )}
            <ShieldCheck size={16} strokeWidth={1.8} className="flex-shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-sm font-medium whitespace-nowrap">
              Painel Admin
            </span>
          </NavLink>
        )}
      </div>

      {/* Footer — email + logout */}
      <div className="border-t border-white/[0.06] px-2 py-3 flex-shrink-0">
        <div className="flex items-center h-10 px-[14px] gap-3">
          <div className="w-[18px] h-[18px] rounded-full bg-[var(--primary)] flex-shrink-0 flex items-center justify-center">
            <span className="text-[#111110] font-black text-[9px]">
              {email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-1 min-w-0">
            <p className="text-white/50 text-[11px] truncate whitespace-nowrap">{email}</p>
          </div>
          <button
            onClick={signOut}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-white/40 hover:text-white/80 flex-shrink-0"
            title="Sair"
          >
            <LogOut size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </aside>
  )
}
