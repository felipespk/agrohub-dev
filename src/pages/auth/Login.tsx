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
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const MAX_ATTEMPTS = 5
  const LOCKOUT_MS = 60_000
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

    if (lockedUntil && Date.now() < lockedUntil) {
      const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000)
      toast.error('Muitas tentativas', {
        description: `Aguarde ${secondsLeft}s antes de tentar novamente.`
      })
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS)
        setAttempts(0)
        toast.error('Conta temporariamente bloqueada', {
          description: 'Muitas tentativas incorretas. Tente novamente em 1 minuto.'
        })
        return
      }

      const msg = error.message?.toLowerCase?.() ?? ''
      const isEmailNotConfirmed =
        msg.includes('email not confirmed') ||
        msg.includes('email_not_confirmed') ||
        (msg.includes('confirm') && msg.includes('email'))

      toast.error('Erro ao entrar', { description: isEmailNotConfirmed ? 'Seu e-mail ainda não foi confirmado. Confirme pelo link enviado ou reenvie abaixo.' : error.message })
    } else {
      setAttempts(0)
      setLockedUntil(null)
      navigate('/hub')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left — hero panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.3) 100%), url('/images/login-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 flex flex-col justify-end p-12 w-full">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
              Gestão rural moderna,<br />do campo ao financeiro.
            </h2>
            <p className="text-sm text-white/60 mt-2 max-w-md">
              Controle completo de secador, pecuária, lavoura e financeiro em uma única plataforma.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {['Secador / Silo', 'Pecuária', 'Lavoura', 'Financeiro'].map(mod => (
                <span key={mod} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/20 backdrop-blur-sm">
                  {mod}
                </span>
              ))}
            </div>
            <p className="text-xs text-white/30 mt-8">© {new Date().getFullYear()} Agrix. Todos os direitos reservados.</p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8">
            <img src="/logo-agrix.png" alt="Agrix" className="h-24 object-contain animate-logo-float" />
          </div>

          <div className="w-10 h-1 rounded-full bg-[var(--primary)] mb-4" />
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
                className="glass-input"
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
                  className="pr-10 glass-input"
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
            <Button type="submit" className="w-full mt-1 h-11 text-sm font-semibold" disabled={loading || (lockedUntil !== null && Date.now() < lockedUntil)}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : 'Entrar'}
            </Button>
            {lockedUntil && Date.now() < lockedUntil && (
              <p className="text-xs text-red-500 text-center mt-2">
                Bloqueado por tentativas excessivas. Aguarde 1 minuto.
              </p>
            )}
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
