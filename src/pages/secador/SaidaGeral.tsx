import { useEffect, useState, useCallback } from 'react'
import { ArrowUpFromLine, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber } from '@/lib/utils'

interface TipoGrao { id: string; nome: string }
interface VariedadeGrao { id: string; tipo_grao_id: string; nome: string }
interface SaidaRow {
  id: string; data: string; tipo: string; tipo_grao_id: string | null
  variedade_id: string | null; peso_liquido: number | null
  observacao: string | null; user_id: string; created_at: string
}

const TIPO_LABELS: Record<string, string> = {
  transferencia: 'Transferência',
  amostra: 'Amostra',
  outro: 'Outro',
}

const TIPO_BADGE: Record<string, string> = {
  transferencia: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  amostra: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  outro: 'bg-gray-500/15 text-gray-600 border-gray-500/30',
}

const EMPTY_FORM = {
  data: format(new Date(), 'yyyy-MM-dd'),
  tipo: 'transferencia' as 'transferencia' | 'amostra' | 'outro',
  tipo_grao_id: '',
  variedade_id: '',
  peso_liquido: '',
  observacao: '',
}

export function SaidaGeral() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId() ?? session?.user?.id

  const [tipos, setTipos] = useState<TipoGrao[]>([])
  const [variedades, setVariedades] = useState<VariedadeGrao[]>([])
  const [rows, setRows] = useState<SaidaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [tRes, vRes, sRes] = await Promise.all([
      supabase.from('tipos_grao').select('*').eq('user_id', userId).order('nome'),
      supabase.from('variedades_grao').select('*').eq('user_id', userId).order('nome'),
      supabase.from('saidas').select('*').eq('user_id', userId).neq('tipo', 'venda').order('data', { ascending: false }),
    ])
    setTipos(tRes.data ?? [])
    setVariedades(vRes.data ?? [])
    setRows(sRes.data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está no modo impersonação.' })
      return
    }
    if (!session?.user?.id) return
    if (!form.data || !form.tipo_grao_id || !form.peso_liquido) {
      toast.error('Campos obrigatórios', { description: 'Data, Tipo de Grão e Peso são obrigatórios.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('saidas').insert({
      user_id: session.user.id,
      tipo: form.tipo,
      data: form.data,
      tipo_grao_id: form.tipo_grao_id || null,
      variedade_id: form.variedade_id || null,
      peso_liquido: parseFloat(form.peso_liquido) || null,
      observacao: form.observacao || null,
    })
    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar', { description: error.message })
    } else {
      toast.success('Saída registrada!')
      setOpen(false)
      setForm(EMPTY_FORM)
      loadAll()
    }
  }

  const variedadesFiltradas = variedades.filter(v => v.tipo_grao_id === form.tipo_grao_id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-t1">Saída Geral</h1>
          <p className="text-sm text-t3">Transferências, amostras e outras saídas de grãos</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus size={14} />
          Nova Saída
        </Button>
      </div>

      <Card className="shadow-elev-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-t2">Histórico de Saídas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-t3 gap-2">
              <ArrowUpFromLine size={28} className="animate-float opacity-40" />
              <p className="text-sm">Nenhuma saída registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3">Data</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-left py-2 px-3">Grão</th>
                    <th className="text-right py-2 px-3">Peso Líquido</th>
                    <th className="text-left py-2 px-3">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const tipo = tipos.find(t => t.id === r.tipo_grao_id)?.nome ?? '—'
                    const varNome = variedades.find(v => v.id === r.variedade_id)?.nome
                    return (
                      <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                        <td className="py-2.5 px-3 text-t2">{formatDate(r.data)}</td>
                        <td className="py-2.5 px-3">
                          <Badge className={`text-xs ${TIPO_BADGE[r.tipo] ?? TIPO_BADGE.outro}`}>
                            {TIPO_LABELS[r.tipo] ?? r.tipo}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-t1">
                          {tipo}{varNome && <span className="text-t3 text-xs ml-1">· {varNome}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-t2">
                          {r.peso_liquido != null ? `${formatNumber(r.peso_liquido, 0)} kg` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-t3 text-xs truncate max-w-xs">{r.observacao ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpFromLine size={16} />
              Nova Saída
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={form.data} onChange={e => setField('data', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setField('tipo', v as never)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="amostra">Amostra</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Grão *</Label>
                <Select value={form.tipo_grao_id} onValueChange={v => { setField('tipo_grao_id', v); setField('variedade_id', '') }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Variedade</Label>
                <Select value={form.variedade_id} onValueChange={v => setField('variedade_id', v)} disabled={!form.tipo_grao_id}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {variedadesFiltradas.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Peso Líquido (kg) *</Label>
                <Input type="number" step="0.01" min="0" value={form.peso_liquido} onChange={e => setField('peso_liquido', e.target.value)} placeholder="0" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observação</Label>
              <Textarea rows={2} value={form.observacao} onChange={e => setField('observacao', e.target.value)} placeholder="Observações..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Registrar Saída'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
