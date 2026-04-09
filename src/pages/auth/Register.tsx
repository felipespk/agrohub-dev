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
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-8">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8">
          <span style={{ fontSize: 36, fontWeight: 800, fontStyle: 'italic', lineHeight: 1, display: 'block' }}>
            <span style={{ color: '#78FC90' }}>agri</span>
            <span style={{ color: '#111110' }}>x</span>
          </span>
          <p className="text-sm text-t3 mt-1">Gestão Rural Inteligente</p>
        </div>

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
          <Button type="submit" className="w-full mt-1" disabled={loading}>
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
  )
}
