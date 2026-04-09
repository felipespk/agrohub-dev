import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const redirectBaseUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) || window.location.origin

  async function resendConfirmationEmail() {
    if (!email) return
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${redirectBaseUrl}/login` },
    })
    if (error) {
      toast.error('Não foi possível reenviar', { description: error.message })
    } else {
      toast.success('E-mail reenviado', { description: `Enviamos um novo link de confirmação para ${email}.` })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      const msg = error.message?.toLowerCase?.() ?? ''
      const isEmailNotConfirmed =
        msg.includes('email not confirmed') ||
        msg.includes('email_not_confirmed') ||
        (msg.includes('confirm') && msg.includes('email'))

      toast.error('Erro ao entrar', { description: isEmailNotConfirmed ? 'Seu e-mail ainda não foi confirmado. Confirme pelo link enviado ou reenvie abaixo.' : error.message })
    } else {
      navigate('/hub')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left — hero panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0a09]">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--border-strong) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Green glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--primary)]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <img src="/logo-agrix.png" alt="Agrix" className="h-8 object-contain brightness-0 invert" />
          </div>

          {/* Quote + stats */}
          <div>
            <blockquote className="text-white/60 text-lg leading-relaxed italic max-w-xs mb-8">
              "Gestão rural moderna, do campo ao financeiro, em uma plataforma só."
            </blockquote>
            {/* design.md: 2-col stat grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Produtores',        value: '1.200+' },
                { label: 'Animais rastreados', value: '180k+' },
                { label: 'Safras geridas',     value: '3.400+' },
                { label: 'Toneladas processadas', value: '2,1M+' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/10 bg-white/[0.06] p-4"
                >
                  {/* design.md: display-lg for hero numbers */}
                  <p className="t-display-sm text-[var(--primary)]">{value}</p>
                  <p className="text-xs text-white/50 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Logo */}
          <div className="mb-8">
            <img src="/logo-agrix.png" alt="Agrix" className="h-10 object-contain" />
            <p className="text-sm text-t3 mt-1">Gestão Rural Inteligente</p>
          </div>

          {/* design.md: display-sm for auth page headings */}
          <div className="mb-7">
            <h1 className="t-display-sm text-t1">Bem-vindo de volta</h1>
            <p className="text-sm text-t3 mt-1.5">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-t3 hover:text-[var(--primary)] transition-colors"
                >
                  Esqueci a senha
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 hover:text-t2 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full mt-1" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-sm text-t3 mt-6">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-[var(--primary)] hover:underline font-medium transition-colors">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
