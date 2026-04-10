import { useEffect, useState, useCallback } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { AlertTriangle, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

interface ConfigForm {
  farm_name_gado: string
  rendimento_carcaca: string
  valor_arroba: string
  data_cotacao_arroba: string
  idade_bezerro_meses: string
  idade_jovem_meses: string
  reclassificacao_automatica: boolean
  unidade_peso: string
  exibir_conversao: boolean
}

function ToggleSwitch({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${
        checked ? 'bg-[var(--primary-dark)]' : 'bg-[var(--surface-overlay)]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-sm font-semibold text-t1 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export function GadoConfiguracoes() {
  const { session, refreshProfile } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ConfigForm>({
    farm_name_gado: '',
    rendimento_carcaca: '52',
    valor_arroba: '300',
    data_cotacao_arroba: '',
    idade_bezerro_meses: '8',
    idade_jovem_meses: '24',
    reclassificacao_automatica: false,
    unidade_peso: 'kg',
    exibir_conversao: true,
  })

  const userId = getEffectiveUserId()

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (data) {
        setForm({
          farm_name_gado: data.farm_name_gado ?? '',
          rendimento_carcaca: data.rendimento_carcaca?.toString() ?? '52',
          valor_arroba: data.valor_arroba?.toString() ?? '300',
          data_cotacao_arroba: data.data_cotacao_arroba ?? '',
          idade_bezerro_meses: data.idade_bezerro_meses?.toString() ?? '8',
          idade_jovem_meses: data.idade_jovem_meses?.toString() ?? '24',
          reclassificacao_automatica: data.reclassificacao_automatica ?? false,
          unidade_peso: data.unidade_peso ?? 'kg',
          exibir_conversao: data.exibir_conversao ?? true,
        })
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    setSaving(true)
    try {
      const uid = session!.user.id
      const { error } = await supabase.from('profiles').upsert({
        user_id: uid,
        farm_name_gado: form.farm_name_gado || null,
        rendimento_carcaca: parseFloat(form.rendimento_carcaca) || 52,
        valor_arroba: parseFloat(form.valor_arroba) || 300,
        data_cotacao_arroba: form.data_cotacao_arroba || null,
        idade_bezerro_meses: parseInt(form.idade_bezerro_meses) || 8,
        idade_jovem_meses: parseInt(form.idade_jovem_meses) || 24,
        reclassificacao_automatica: form.reclassificacao_automatica,
        unidade_peso: form.unidade_peso,
        exibir_conversao: form.exibir_conversao,
      })
      if (error) throw error
      await refreshProfile()
      toast.success('Configurações salvas!')
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const arrobaOld = form.data_cotacao_arroba
    ? differenceInDays(new Date(), parseISO(form.data_cotacao_arroba)) > 7
    : false

  if (loading) {
    return (
      <div className="space-y-5 max-w-xl">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Configurações · Pecuária</h1>
          <p className="text-sm text-t3">Personalize o módulo de gado para sua fazenda</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center">
          <Settings size={14} className="text-t3" />
        </div>
      </div>

      {arrobaOld && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-300/40 bg-yellow-50 px-4 py-3">
          <AlertTriangle size={14} className="text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">
            Cotação da arroba desatualizada (desde {formatDate(form.data_cotacao_arroba)}). Atualize abaixo.
          </p>
        </div>
      )}

      <SectionCard title="Identificação">
        <div className="space-y-1.5">
          <Label htmlFor="farm_name_gado">Nome da Fazenda (Pecuária)</Label>
          <Input
            id="farm_name_gado"
            value={form.farm_name_gado}
            onChange={e => setForm(f => ({ ...f, farm_name_gado: e.target.value }))}
            placeholder="Ex: Fazenda Boa Vista"
          />
        </div>
      </SectionCard>

      <SectionCard title="Valorização do Rebanho">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="rendimento">Rendimento de Carcaça (%)</Label>
            <Input
              id="rendimento"
              type="number"
              min={0} max={100}
              value={form.rendimento_carcaca}
              onChange={e => setForm(f => ({ ...f, rendimento_carcaca: e.target.value }))}
              placeholder="52"
            />
            <p className="text-xs text-t3">Padrão: 52%</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="valor_arroba">Cotação da Arroba (R$)</Label>
            <Input
              id="valor_arroba"
              type="number"
              value={form.valor_arroba}
              onChange={e => setForm(f => ({ ...f, valor_arroba: e.target.value }))}
              placeholder="300.00"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="data_cotacao">Data da Cotação</Label>
          <Input
            id="data_cotacao"
            type="date"
            value={form.data_cotacao_arroba}
            onChange={e => setForm(f => ({ ...f, data_cotacao_arroba: e.target.value }))}
          />
          {arrobaOld && (
            <p className="text-xs text-yellow-600">Cotação com mais de 7 dias</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Fases de Crescimento">
        <p className="text-xs text-t3 -mt-1">Define as idades que separam as categorias para reclassificação automática.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="idade_bezerro">Bezerro até (meses)</Label>
            <Input
              id="idade_bezerro"
              type="number"
              value={form.idade_bezerro_meses}
              onChange={e => setForm(f => ({ ...f, idade_bezerro_meses: e.target.value }))}
              placeholder="8"
            />
            <p className="text-xs text-t3">Padrão: 8 meses</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="idade_jovem">Jovem até (meses)</Label>
            <Input
              id="idade_jovem"
              type="number"
              value={form.idade_jovem_meses}
              onChange={e => setForm(f => ({ ...f, idade_jovem_meses: e.target.value }))}
              placeholder="24"
            />
            <p className="text-xs text-t3">Padrão: 24 meses</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Preferências">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="reclassificacao">Reclassificação Automática</Label>
            <p className="text-xs text-t3 mt-0.5">Reclassifica animais automaticamente ao abrir o módulo</p>
          </div>
          <ToggleSwitch
            id="reclassificacao"
            checked={form.reclassificacao_automatica}
            onChange={v => setForm(f => ({ ...f, reclassificacao_automatica: v }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="exibir_conversao">Exibir Conversão (@)</Label>
            <p className="text-xs text-t3 mt-0.5">Mostra colunas de arrobas nas tabelas</p>
          </div>
          <ToggleSwitch
            id="exibir_conversao"
            checked={form.exibir_conversao}
            onChange={v => setForm(f => ({ ...f, exibir_conversao: v }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Unidade de Peso Principal</Label>
          <Select value={form.unidade_peso} onValueChange={v => setForm(f => ({ ...f, unidade_peso: v }))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="@">@ (arroba)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}
