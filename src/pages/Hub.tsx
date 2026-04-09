import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Warehouse, DollarSign, Beef, Wheat, Map, ShieldCheck, LogOut, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getGreeting, getFirstName } from '@/lib/utils'

const modules = [
  {
    to: '/secador/dashboard',
    icon: Warehouse,
    label: 'Secador / Silo',
    description: 'Recebimento, armazenamento e expedição de grãos',
    accent: 'text-orange-500',
    iconBg: 'bg-orange-50',
    hoverBorder: 'hover:border-orange-200',
    hoverGlow: 'hover:shadow-[0_8px_24px_rgba(249,115,22,0.12)]',
  },
  {
    to: '/financeiro/dashboard',
    icon: DollarSign,
    label: 'Financeiro',
    description: 'Controle financeiro, contas e fluxo de caixa',
    accent: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    hoverBorder: 'hover:border-emerald-200',
    hoverGlow: 'hover:shadow-[0_8px_24px_rgba(16,185,129,0.12)]',
  },
  {
    to: '/gado/dashboard',
    icon: Beef,
    label: 'Pecuária',
    description: 'Gestão do rebanho, sanidade e movimentações',
    accent: 'text-[var(--primary-dark)]',
    iconBg: 'bg-[var(--primary-bg)]',
    hoverBorder: 'hover:border-[var(--primary)]/40',
    hoverGlow: 'hover:shadow-[0_8px_24px_rgba(120,252,144,0.15)]',
  },
  {
    to: '/lavoura/dashboard',
    icon: Wheat,
    label: 'Lavoura',
    description: 'Safras, atividades de campo e colheitas',
    accent: 'text-yellow-600',
    iconBg: 'bg-yellow-50',
    hoverBorder: 'hover:border-yellow-200',
    hoverGlow: 'hover:shadow-[0_8px_24px_rgba(234,179,8,0.12)]',
  },
]

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  )
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="text-xs text-t4 tabular font-medium tracking-wide">{time}</span>
  )
}

export function Hub() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const firstName = profile?.display_name
    ? getFirstName(profile.display_name)
    : user?.email?.split('@')[0] ?? ''

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shadow-elev-1 transition-transform duration-200 hover:scale-110">
            <span className="text-[#111110] font-black text-xs tracking-tight">AG</span>
          </div>
          <span className="text-md font-semibold text-t1">Agrix</span>
        </div>
        <div className="flex items-center gap-4">
          <LiveClock />
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm text-t3 hover:text-t1 transition-colors duration-150"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* Status chip — fade in */}
        <div
          className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary-bg)] px-4 py-1.5 mb-8 animate-fade-up"
          style={{ animationDelay: '0ms' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse-dot" />
          <span className="text-xs font-medium text-[var(--primary-dark)]">Sistema operacional</span>
        </div>

        {/* Greeting — staggered after chip */}
        <div
          className="text-center mb-2 animate-fade-up"
          style={{ animationDelay: '60ms' }}
        >
          <h1 className="t-display-sm text-t1">{getGreeting(firstName)}</h1>
          <p className="text-sm text-t3 mt-2">
            {profile?.farm_name ? `${profile.farm_name} · ` : ''}
            Selecione um módulo para começar
          </p>
        </div>

        {/* Module grid — stagger each card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl mt-10">
          {modules.map(({ to, icon: Icon, label, description, accent, iconBg, hoverBorder, hoverGlow }, i) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={[
                'group relative text-left rounded-xl border border-[var(--border)] bg-[var(--surface)]',
                'p-5 shadow-elev-1',
                'transition-all duration-200',
                'hover:-translate-y-1 hover:scale-[1.02]',
                'active:scale-[0.98] active:shadow-elev-1',
                'cursor-pointer',
                'animate-fade-up',
                hoverBorder,
                hoverGlow,
              ].join(' ')}
              style={{ animationDelay: `${140 + i * 60}ms` }}
            >
              <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110`}>
                <Icon size={18} className={accent} strokeWidth={1.8} />
              </div>
              <h3 className="text-md font-semibold text-t1 mb-1">{label}</h3>
              <p className="text-sm text-t3 leading-relaxed">{description}</p>
              <ArrowRight
                size={14}
                className="absolute right-4 top-4 text-t4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
              />
            </button>
          ))}
        </div>

        {/* Secondary actions */}
        <div
          className="flex items-center gap-2 mt-5 animate-fade-up"
          style={{ animationDelay: '400ms' }}
        >
          <button
            onClick={() => navigate('/mapa')}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-t2 hover:text-t1 hover:bg-[var(--surface-raised)] hover:border-[var(--border-strong)] transition-all duration-150 shadow-elev-1 active:scale-[0.97]"
          >
            <Map size={15} />
            Mapa da Fazenda
          </button>
          {profile?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-4 py-2.5 text-sm text-[var(--warning)] hover:border-[var(--warning)]/50 hover:shadow-elev-1 transition-all duration-150 active:scale-[0.97]"
            >
              <ShieldCheck size={15} />
              Painel Admin
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="px-8 py-4 border-t border-[var(--border)] flex items-center justify-between animate-fade-up"
        style={{ animationDelay: '450ms' }}
      >
        <p className="text-2xs text-t4 uppercase tracking-wider">Agrix — Gestão Rural</p>
        <p className="text-xs text-t4">{user?.email}</p>
      </footer>
    </div>
  )
}
