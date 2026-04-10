import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const redirectBaseUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) || window.location.origin

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Senha muito curta', { description: 'Use ao menos 6 caracteres.' })
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${redirectBaseUrl}/login`,
      },
    })
    if (error) {
      setLoading(false)
      toast.error('Erro ao criar conta', { description: error.message })
      return
    }
    setLoading(false)
    if (!data.session) {
      toast.success('Conta criada! Confirme seu e-mail', { description: `Enviamos um link de confirmação para ${email}.` })
      navigate('/login')
      return
    }
    if (data.user) {
      await supabase.from('profiles').insert({ user_id: data.user.id, email, display_name: name })
    }
    toast.success('Conta criada!', { description: 'Bem-vindo ao Agrix.' })
    navigate('/hub')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left — hero panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.3) 100%), url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1920&q=80')`,
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
          <h1 className="t-display-sm text-t1">Criar conta</h1>
          <p className="text-sm text-t3 mt-1.5">Comece a gerir sua propriedade hoje</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="João da Silva"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
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
          <Button type="submit" className="w-full mt-1 h-11 text-sm font-semibold" disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : 'Criar conta'}
          </Button>
        </form>

        <p className="text-center text-sm text-t3 mt-6">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-[var(--primary)] hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
      </div>
    </div>
  )
}
