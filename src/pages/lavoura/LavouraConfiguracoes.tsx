import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

export function LavouraConfiguracoes() {
  const { session, refreshProfile } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [farmName, setFarmName] = useState('')

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    supabase.from('profiles').select('farm_name_lavoura').eq('user_id', userId).single()
      .then(({ data }) => {
        if (data) setFarmName(data.farm_name_lavoura ?? '')
      })
      .finally(() => setLoading(false))
  }, [userId])

  async function handleSave() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    setSaving(true)
    try {
      const uid = session!.user.id
      const { error } = await supabase.from('profiles')
        .update({ farm_name_lavoura: farmName || null })
        .eq('user_id', uid)
      if (error) throw error
      await refreshProfile()
      toast.success('Configurações salvas!')
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-2"><Skeleton className="h-6 w-44" /><Skeleton className="h-4 w-64" /></div>
        <div className="rounded-xl glass-card p-6 max-w-lg space-y-4">
          <Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-full rounded-md" /><Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-t1">Configurações · Lavoura</h1>
        <p className="text-sm text-t3">Preferências do módulo de lavoura</p>
      </div>

      <div className="rounded-xl glass-card p-6 max-w-lg">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary-bg)] flex items-center justify-center">
            <Settings className="w-4 h-4 text-[var(--primary-dark)]" />
          </div>
          <p className="font-medium text-t1">Informações da Fazenda</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="farm_name">Nome da Fazenda (Lavoura)</Label>
            <Input
              id="farm_name"
              placeholder="Ex: Fazenda Boa Vista — Lavoura"
              value={farmName}
              onChange={e => setFarmName(e.target.value)}
            />
            <p className="text-xs text-t3">Este nome aparecerá nos relatórios e exportações do módulo.</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>
    </div>
  )
}
