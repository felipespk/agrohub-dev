import { useEffect, useState, useCallback, useMemo } from 'react'
import { Wrench, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber } from '@/lib/utils'

interface TipoGrao { id: string; nome: string }
interface QuebraRow {
  id: string; data: string; tipo_grao_id: string | null
  peso_kg: number; motivo: string | null; observacao: string | null
  user_id: string; created_at: string
}

const EMPTY_FORM = {
  data: format(new Date(), 'yyyy-MM-dd'),
  tipo_grao_id: '',
  peso_kg: '',
  motivo: '',
  observacao: '',
}

export function Quebra() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId() ?? session?.user?.id

  const [tipos, setTipos] = useState<TipoGrao[]>([])
  const [rows, setRows] = useState<QuebraRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [tRes, qRes] = await Promise.all([
      supabase.from('tipos_grao').select('*').eq('user_id', userId).order('nome'),
      supabase.from('quebras_tecnicas').select('*').eq('user_id', userId).order('data', { ascending: false }),
    ])
    setTipos(tRes.data ?? [])
    setRows(qRes.data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { loadAll() }, [loadAll])

  const kpiMes = useMemo(() => {
    const now = new Date()
    const start = format(startOfMonth(now), 'yyyy-MM-dd')
    const end = format(endOfMonth(now), 'yyyy-MM-dd')
    return rows.filter(r => r.data >= start && r.data <= end).reduce((s, r) => s + r.peso_kg, 0)
  }, [rows])

  const kpiTotal = useMemo(() => rows.reduce((s, r) => s + r.peso_kg, 0), [rows])

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
    if (!form.data || !form.tipo_grao_id || !form.peso_kg) {
      toast.error('Campos obrigatórios', { description: 'Data, Tipo de Grão e Peso são obrigatórios.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('quebras_tecnicas').insert({
      user_id: session.user.id,
      data: form.data,
      tipo_grao_id: form.tipo_grao_id || null,
      peso_kg: parseFloat(form.peso_kg) || 0,
      motivo: form.motivo || null,
      observacao: form.observacao || null,
    })
    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar', { description: error.message })
    } else {
      toast.success('Quebra registrada!')
      setOpen(false)
      setForm(EMPTY_FORM)
      loadAll()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-t1">Quebra Técnica</h1>
          <p className="text-sm text-t3">Registre perdas e quebras de grãos durante a secagem e armazenagem</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus size={14} />
          Registrar Quebra
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-elev-1">
          <p className="text-xs text-t3 mb-1">Quebra Este Mês</p>
          <p className="text-2xl font-bold text-amber-500">{formatNumber(kpiMes / 1000, 2)} t</p>
          <p className="text-xs text-t4">{formatNumber(kpiMes, 0)} kg</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-elev-1">
          <p className="text-xs text-t3 mb-1">Quebra Total (Geral)</p>
          <p className="text-2xl font-bold text-red-500">{formatNumber(kpiTotal / 1000, 2)} t</p>
          <p className="text-xs text-t4">{formatNumber(kpiTotal, 0)} kg</p>
        </div>
      </div>

      <Card className="shadow-elev-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-t2">Histórico de Quebras</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-t3 gap-2">
              <Wrench size={28} className="animate-float opacity-40" />
              <p className="text-sm">Nenhuma quebra registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3">Data</th>
                    <th className="text-left py-2 px-3">Tipo de Grão</th>
                    <th className="text-right py-2 px-3">Peso (kg)</th>
                    <th className="text-left py-2 px-3">Motivo</th>
                    <th className="text-left py-2 px-3">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const tipo = tipos.find(t => t.id === r.tipo_grao_id)?.nome ?? '—'
                    return (
                      <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                        <td className="py-2.5 px-3 text-t2">{formatDate(r.data)}</td>
                        <td className="py-2.5 px-3 text-t1">{tipo}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-500">{formatNumber(r.peso_kg, 0)}</td>
                        <td className="py-2.5 px-3 text-t2">{r.motivo ?? '—'}</td>
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
              <Wrench size={16} />
              Registrar Quebra Técnica
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={form.data} onChange={e => setField('data', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Grão *</Label>
                <Select value={form.tipo_grao_id} onValueChange={v => setField('tipo_grao_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Peso (kg) *</Label>
                <Input type="number" step="0.01" min="0" value={form.peso_kg} onChange={e => setField('peso_kg', e.target.value)} placeholder="0" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Motivo</Label>
                <Input value={form.motivo} onChange={e => setField('motivo', e.target.value)} placeholder="Ex: Secagem excessiva" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observação</Label>
              <Textarea rows={2} value={form.observacao} onChange={e => setField('observacao', e.target.value)} placeholder="Observações..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
