import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const redirectBaseUrl = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) || window.location.origin

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectBaseUrl}/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error('Erro', { description: error.message })
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-8">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <span className="text-[#111110] font-black text-sm">AG</span>
          </div>
          <span className="text-md font-semibold text-t1">Agrix</span>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--primary-bg)] flex items-center justify-center mx-auto">
              <CheckCircle2 size={22} className="text-[var(--primary)]" />
            </div>
            <h1 className="t-heading-lg text-t1">E-mail enviado</h1>
            <p className="text-sm text-t2 leading-relaxed">
              Verifique sua caixa de entrada em{' '}
              <strong className="text-t1">{email}</strong>{' '}
              para o link de redefinição.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full mt-4 gap-2">
                <ArrowLeft size={14} />
                Voltar para o login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="t-display-sm text-t1">Esqueci a senha</h1>
              <p className="text-sm text-t3 mt-1.5">
                Enviaremos um link para redefinir sua senha
              </p>
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
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : 'Enviar link'}
              </Button>
            </form>
            <div className="text-center mt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-t3 hover:text-t1 transition-colors"
              >
                <ArrowLeft size={13} />
                Voltar para o login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
