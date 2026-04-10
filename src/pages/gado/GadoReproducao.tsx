import { useEffect, useState, useCallback } from 'react'
import { Plus, Heart } from 'lucide-react'
import { format } from 'date-fns'
import { supabase, Animal } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

interface Reproducao {
  id: string
  vaca_id: string
  touro_id: string | null
  touro_brinco: string | null
  data_cobertura: string
  data_prevista_parto: string | null
  data_parto: string | null
  resultado: 'positivo' | 'negativo' | 'aguardando' | null
  observacao: string | null
  user_id: string
  created_at: string
}

const RESULTADO_COLORS: Record<string, string> = {
  positivo: 'bg-green-100 text-green-700',
  negativo: 'bg-red-100 text-red-700',
  aguardando: 'bg-gray-100 text-gray-600',
}

function TableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GadoReproducao() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [registros, setRegistros] = useState<Reproducao[]>([])
  const [animais, setAnimais] = useState<Animal[]>([])

  const [filterResultado, setFilterResultado] = useState('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    vaca_id: '', touro_id: '', touro_brinco_manual: '',
    data_cobertura: format(new Date(), 'yyyy-MM-dd'),
    data_prevista_parto: '', data_parto: '',
    resultado: 'aguardando', observacao: '',
  })

  const userId = getEffectiveUserId()

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [repRes, animaisRes] = await Promise.all([
        supabase.from('reproducao').select('*').eq('user_id', userId).order('data_cobertura', { ascending: false }),
        supabase.from('animais').select('*').eq('user_id', userId).eq('status', 'ativo'),
      ])
      setRegistros(repRes.data ?? [])
      setAnimais(animaisRes.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const filtered = registros.filter(r => {
    if (filterResultado !== 'todos' && r.resultado !== filterResultado) return false
    return true
  })

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!form.vaca_id || !form.data_cobertura) {
      toast.error('Campos obrigatórios', { description: 'Selecione a vaca e a data de cobertura.' })
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('reproducao').insert({
        user_id: session!.user.id,
        vaca_id: form.vaca_id,
        touro_id: form.touro_id || null,
        touro_brinco: form.touro_brinco_manual || null,
        data_cobertura: form.data_cobertura,
        data_prevista_parto: form.data_prevista_parto || null,
        data_parto: form.data_parto || null,
        resultado: form.resultado as Reproducao['resultado'],
        observacao: form.observacao || null,
      })
      if (error) throw error
      toast.success('Registro salvo!')
      setDialogOpen(false)
      setForm({
        vaca_id: '', touro_id: '', touro_brinco_manual: '',
        data_cobertura: format(new Date(), 'yyyy-MM-dd'),
        data_prevista_parto: '', data_parto: '', resultado: 'aguardando', observacao: '',
      })
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const animalMap = new Map(animais.map(a => [a.id, a]))
  const femeas = animais.filter(a => a.sexo === 'femea')
  const touros = animais.filter(a => a.categoria === 'touro')

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Reprodução</h1>
          <p className="text-sm text-t3">{registros.length} registro(s)</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus size={14} />
          Novo Registro
        </Button>
      </div>

      <div className="flex gap-2">
        <Select value={filterResultado} onValueChange={setFilterResultado}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="positivo">Positivo</SelectItem>
            <SelectItem value="negativo">Negativo</SelectItem>
            <SelectItem value="aguardando">Aguardando</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center animate-float">
              <Heart size={20} className="text-t4" />
            </div>
            <p className="text-sm text-t3">Nenhum registro de reprodução</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Data Cobertura', 'Vaca', 'Touro', 'Previsão Parto', 'Data Parto', 'Resultado', 'Observação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-t3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const vaca = animalMap.get(r.vaca_id)
                  const touro = r.touro_id ? animalMap.get(r.touro_id) : null
                  const touroLabel = touro?.brinco ?? r.touro_brinco ?? '—'
                  return (
                    <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-4 py-3 text-t2">{formatDate(r.data_cobertura)}</td>
                      <td className="px-4 py-3 font-medium text-t1">{vaca?.brinco ?? '—'}</td>
                      <td className="px-4 py-3 text-t2">{touroLabel}</td>
                      <td className="px-4 py-3 text-t2">{r.data_prevista_parto ? formatDate(r.data_prevista_parto) : '—'}</td>
                      <td className="px-4 py-3 text-t2">{r.data_parto ? formatDate(r.data_parto) : '—'}</td>
                      <td className="px-4 py-3">
                        {r.resultado ? (
                          <Badge className={`${RESULTADO_COLORS[r.resultado] ?? 'bg-gray-100 text-gray-600'} border-0 text-xs capitalize`}>{r.resultado}</Badge>
                        ) : <span className="text-t3">—</span>}
                      </td>
                      <td className="px-4 py-3 text-t3 text-xs max-w-[140px] truncate">{r.observacao ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Registro de Reprodução</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Vaca *</Label>
              <Select value={form.vaca_id} onValueChange={v => setForm(f => ({ ...f, vaca_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a vaca" /></SelectTrigger>
                <SelectContent>
                  {femeas.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco} ({a.categoria})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Touro (cadastrado)</Label>
                <Select value={form.touro_id} onValueChange={v => setForm(f => ({ ...f, touro_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não selecionado</SelectItem>
                    {touros.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ou Brinco Manual</Label>
                <Input value={form.touro_brinco_manual} onChange={e => setForm(f => ({ ...f, touro_brinco_manual: e.target.value }))} placeholder="Ex: T001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Cobertura *</Label>
                <Input type="date" value={form.data_cobertura} onChange={e => setForm(f => ({ ...f, data_cobertura: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Prev. Parto</Label>
                <Input type="date" value={form.data_prevista_parto} onChange={e => setForm(f => ({ ...f, data_prevista_parto: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data do Parto</Label>
                <Input type="date" value={form.data_parto} onChange={e => setForm(f => ({ ...f, data_parto: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Resultado</Label>
                <Select value={form.resultado} onValueChange={v => setForm(f => ({ ...f, resultado: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="positivo">Positivo</SelectItem>
                    <SelectItem value="negativo">Negativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
