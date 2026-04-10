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
  },
  {
    to: '/financeiro/dashboard',
    icon: DollarSign,
    label: 'Financeiro',
    description: 'Controle financeiro, contas e fluxo de caixa',
    accent: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  {
    to: '/gado/dashboard',
    icon: Beef,
    label: 'Pecuária',
    description: 'Gestão do rebanho, sanidade e movimentações',
    accent: 'text-[var(--primary-dark)]',
    iconBg: 'bg-[var(--primary-bg)]',
  },
  {
    to: '/lavoura/dashboard',
    icon: Wheat,
    label: 'Lavoura',
    description: 'Safras, atividades de campo e colheitas',
    accent: 'text-yellow-600',
    iconBg: 'bg-yellow-50',
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
  return <span className="text-xs text-t4 tabular font-medium tracking-wide">{time}</span>
}


export function Hub() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const firstName = (() => {
    if (profile?.display_name) return getFirstName(profile.display_name)
    const raw = user?.email?.split('@')[0] ?? ''
    const lettersOnly = raw.replace(/\d+/g, '')
    return lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1)
  })()

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      {/* Navbar */}
      <header className="h-16 flex items-center justify-between px-6 glass-header flex-shrink-0">
        <img src="/logo-agrix.png" alt="Agrix" className="h-10 object-contain" />
        <div className="flex items-center gap-4">
          <LiveClock />
          <span className="text-sm text-t3 hidden sm:block">{user?.email}</span>
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
        {/* Greeting */}
        <div
          className="text-center mb-10 animate-fade-up"
          style={{ animationDelay: '0ms' }}
        >
          <div className="mb-5 inline-block">
            <img src="/logo-agrix.png" alt="Agrix" className="h-40 object-contain animate-logo-float" />
          </div>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl">
          {modules.map(({ to, icon: Icon, label, description, accent, iconBg }, i) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={[
                'group relative text-left rounded-xl glass-card hover-3d',
                'p-5',
                'hover:border-t-[#78FC90] hover:[border-top-width:3px]',
                'active:scale-[0.98]',
                'cursor-pointer animate-fade-up',
              ].join(' ')}
              style={{ animationDelay: `${80 + i * 60}ms` }}
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
          className="flex items-center gap-2 mt-6 animate-fade-up"
          style={{ animationDelay: '360ms' }}
        >
          <button
            onClick={() => navigate('/mapa')}
            className="flex items-center gap-2 rounded-lg glass-card border-[#78FC90]/40 px-4 py-2.5 text-sm text-[var(--primary-dark)] font-medium hover:bg-[#78FC90]/10 hover:border-[#78FC90]/60 transition-all duration-150 active:scale-[0.97]"
          >
            <Map size={15} />
            Mapa da Fazenda
          </button>
          {profile?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-4 py-2.5 text-sm text-[var(--warning)] hover:border-[var(--warning)]/50 hover:shadow-lg transition-all duration-150 active:scale-[0.97]"
            >
              <ShieldCheck size={15} />
              Painel Admin
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 glass-header flex items-center justify-between">
        <p className="text-2xs text-t4 uppercase tracking-wider">Agrix — Gestão Rural</p>
        <p className="text-xs text-t4">{user?.email}</p>
      </footer>
    </div>
  )
}
