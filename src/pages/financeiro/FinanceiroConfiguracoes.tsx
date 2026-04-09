import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Settings, Info, CreditCard } from 'lucide-react'

export function FinanceiroConfiguracoes() {
  const { user, profile, refreshProfile } = useAuth()
  const [farmName, setFarmName] = useState('')
  const [saving, setSaving]     = useState(false)
  const [loaded, setLoaded]     = useState(false)

  useEffect(() => {
    if (profile) {
      setFarmName(profile.farm_name_financeiro ?? '')
      setLoaded(true)
    }
  }, [profile])

  async function handleSave() {
    if (!user?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ farm_name_financeiro: farmName.trim() || null })
        .eq('user_id', user.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Configurações salvas com sucesso.')
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  if (!loaded) return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <div>
        <h1 className="t-heading-lg text-t1">Configurações</h1>
        <p className="text-sm text-t3 mt-0.5">Configurações do módulo financeiro</p>
      </div>

      {/* Dados da Fazenda */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center gap-2">
            <Settings size={15} className="text-t3" />
            <CardTitle className="text-sm font-semibold text-t1">Dados da Fazenda</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da Fazenda (Financeiro)</Label>
            <Input
              placeholder="Ex: Fazenda São João — Financeiro"
              value={farmName}
              onChange={e => setFarmName(e.target.value)}
              className="max-w-sm"
            />
            <p className="text-xs text-t3">Este nome aparece nos relatórios e exportações do módulo financeiro.</p>
          </div>
          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contas Padrão */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-t3" />
            <CardTitle className="text-sm font-semibold text-t1">Integração Financeira</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-sm text-t2">
            Os lançamentos criados a partir de Contas a Pagar e Contas a Receber são registrados
            automaticamente na tabela de lançamentos e atualizam o saldo das contas bancárias vinculadas.
          </p>
          <Separator className="my-3" />
          <div className="space-y-2 text-sm text-t3">
            <p>• <strong className="text-t2">Contas a Pagar</strong> geram lançamentos do tipo <span className="text-red-500 font-medium">Despesa</span></p>
            <p>• <strong className="text-t2">Contas a Receber</strong> geram lançamentos do tipo <span className="text-emerald-500 font-medium">Receita</span></p>
            <p>• <strong className="text-t2">Transferências</strong> movimentam saldo entre contas sem impactar receitas/despesas</p>
          </div>
        </CardContent>
      </Card>

      {/* Sobre */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-t3" />
            <CardTitle className="text-sm font-semibold text-t1">Sobre</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-t3">Módulo</span>
              <span className="text-t1 font-medium">Financeiro — Agrix</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-t3">Versão</span>
              <span className="text-t1 font-medium">1.0.0</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-t3">Usuário</span>
              <span className="text-t1">{profile?.email ?? '—'}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-t3">Conta desde</span>
              <span className="text-t1">
                {profile?.created_at ? new Intl.DateTimeFormat('pt-BR').format(new Date(profile.created_at)) : '—'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
