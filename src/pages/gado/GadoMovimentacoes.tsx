import { useEffect, useState, useCallback } from 'react'
import { Plus, ArrowLeftRight, Download } from 'lucide-react'
import { format } from 'date-fns'
import { supabase, MovimentacaoGado, Animal, Pasto } from '@/lib/supabase'
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
import { formatDate, formatCurrency, formatNumber } from '@/lib/utils'
import { exportToExcel } from '@/lib/export-excel'
import {
  criarLancamentoReceita, criarContaPagar, criarContaReceber, buscarCentroCusto,
} from '@/lib/financeiro-integration'

const TIPO_COLORS: Record<string, string> = {
  compra: 'bg-blue-100 text-blue-700',
  venda: 'bg-green-100 text-green-700',
  nascimento: 'bg-cyan-100 text-cyan-700',
  morte: 'bg-red-100 text-red-700',
  transferencia: 'bg-yellow-100 text-yellow-700',
}

const TIPOS = ['compra', 'venda', 'nascimento', 'morte', 'transferencia']

function TableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

interface FormData {
  tipo: string
  data: string
  quantidade: string
  observacao: string
  animal_id: string
  peso_kg: string
  valor_unitario: string
  tipo_pagamento: 'a_vista' | 'a_prazo'
  brinco_bezerro: string
  sexo_bezerro: string
  pasto_destino_id: string
  causa_morte: string
  pasto_origem_id: string
  animal_ids_transferencia: string[]
}

const EMPTY_FORM: FormData = {
  tipo: '', data: format(new Date(), 'yyyy-MM-dd'), quantidade: '1', observacao: '',
  animal_id: '', peso_kg: '', valor_unitario: '', tipo_pagamento: 'a_vista',
  brinco_bezerro: '', sexo_bezerro: '', pasto_destino_id: '', causa_morte: '',
  pasto_origem_id: '', animal_ids_transferencia: [],
}

export function GadoMovimentacoes() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoGado[]>([])
  const [animais, setAnimais] = useState<Animal[]>([])
  const [pastos, setPastos] = useState<Pasto[]>([])

  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)

  const userId = getEffectiveUserId()

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [movRes, animaisRes, pastosRes] = await Promise.all([
        supabase.from('movimentacoes_gado').select('*').eq('user_id', userId).order('data', { ascending: false }),
        supabase.from('animais').select('*').eq('user_id', userId).order('brinco'),
        supabase.from('pastos').select('*').eq('user_id', userId).order('nome'),
      ])
      setMovimentacoes(movRes.data ?? [])
      setAnimais(animaisRes.data ?? [])
      setPastos(pastosRes.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const filtered = movimentacoes.filter(m => {
    if (filterTipo !== 'todos' && m.tipo !== filterTipo) return false
    if (filterDateFrom && m.data < filterDateFrom) return false
    if (filterDateTo && m.data > filterDateTo) return false
    return true
  })

  const valorTotal = filtered.reduce((s, m) => s + (m.valor_total ?? 0), 0)

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!form.tipo || !form.data || !form.quantidade) {
      toast.error('Campos obrigatórios', { description: 'Preencha tipo, data e quantidade.' })
      return
    }

    if (form.tipo === 'nascimento' && !form.brinco_bezerro) {
      toast.error('Brinco do bezerro obrigatório')
      return
    }

    setSaving(true)
    try {
      const uid = session!.user.id
      const qty = parseInt(form.quantidade) || 1
      const peso = form.peso_kg ? parseFloat(form.peso_kg) : null
      const valorUnit = form.valor_unitario ? parseFloat(form.valor_unitario) : null
      const total = valorUnit && qty ? valorUnit * qty : null

      if (form.tipo === 'transferencia' && form.animal_ids_transferencia.length > 0) {
        for (const aid of form.animal_ids_transferencia) {
          await supabase.from('movimentacoes_gado').insert({
            user_id: uid, tipo: 'transferencia', animal_id: aid, data: form.data, quantidade: 1,
            pasto_origem_id: form.pasto_origem_id || null,
            pasto_destino_id: form.pasto_destino_id || null,
            observacao: form.observacao || null,
          })
          if (form.pasto_destino_id) {
            await supabase.from('animais').update({ pasto_id: form.pasto_destino_id }).eq('id', aid)
          }
        }
      } else {
        const payload: Partial<MovimentacaoGado> & { user_id: string } = {
          user_id: uid, tipo: form.tipo as MovimentacaoGado['tipo'],
          animal_id: form.animal_id || null,
          data: form.data, quantidade: qty,
          peso_kg: peso, valor_unitario: valorUnit, valor_total: total,
          pasto_origem_id: form.pasto_origem_id || null,
          pasto_destino_id: form.pasto_destino_id || null,
          causa_morte: form.causa_morte || null,
          brinco_bezerro: form.brinco_bezerro || null,
          sexo_bezerro: form.sexo_bezerro || null,
          observacao: form.observacao || null,
        }
        const { error } = await supabase.from('movimentacoes_gado').insert(payload)
        if (error) throw error

        if (form.tipo === 'nascimento' && form.brinco_bezerro) {
          await supabase.from('animais').insert({
            user_id: uid, brinco: form.brinco_bezerro,
            sexo: form.sexo_bezerro as 'macho' | 'femea' || 'macho',
            categoria: form.sexo_bezerro === 'femea' ? 'bezerra' : 'bezerro',
            origem: 'nascido',
            data_nascimento: form.data,
            pasto_id: form.pasto_destino_id || null,
            status: 'ativo',
          })
        }

        if (form.tipo === 'morte' && form.animal_id) {
          await supabase.from('animais').update({ status: 'morto' }).eq('id', form.animal_id)
        }

        if (form.tipo === 'venda' && form.animal_id) {
          await supabase.from('animais').update({ status: 'vendido' }).eq('id', form.animal_id)
        }

        if (total && (form.tipo === 'venda' || form.tipo === 'compra')) {
          const cc = await buscarCentroCusto(uid, 'Pecuária')
          if (cc) {
            const animalBrinco = animais.find(a => a.id === form.animal_id)?.brinco ?? 'Animal'
            if (form.tipo === 'venda') {
              if (form.tipo_pagamento === 'a_vista') {
                await criarLancamentoReceita(uid, total, form.data, `Venda de gado — ${animalBrinco}`, cc.id)
              } else {
                await criarContaReceber(uid, `Venda de gado — ${animalBrinco}`, total, form.data, cc.id)
              }
            } else {
              await criarContaPagar(uid, `Compra de gado — ${animalBrinco}`, total, form.data, cc.id)
            }
          }
        }
      }

      toast.success('Movimentação registrada!')
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const animalMap = new Map(animais.map(a => [a.id, a]))

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Movimentações</h1>
          <p className="text-sm text-t3">{movimentacoes.length} registro(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToExcel('movimentacoes', 'Movimentações', [
            { key: 'data', header: 'Data', type: 'date' },
            { key: 'tipo', header: 'Tipo' },
            { key: 'brinco', header: 'Animal/Brinco' },
            { key: 'quantidade', header: 'Qtd', type: 'number' },
            { key: 'peso_kg', header: 'Peso (kg)', type: 'number' },
            { key: 'valor_total', header: 'Valor Total', type: 'currency' },
            { key: 'observacao', header: 'Observação' },
          ], filtered.map(m => ({
            data: m.data,
            tipo: m.tipo,
            brinco: animais.find(a => a.id === m.animal_id)?.brinco ?? m.brinco_bezerro ?? '',
            quantidade: m.quantidade ?? 1,
            peso_kg: m.peso_kg ?? 0,
            valor_total: m.valor_total ?? 0,
            observacao: m.observacao ?? '',
          })))} className="gap-1.5 text-xs">
            <Download size={12} /> Excel
          </Button>
          <Button onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }} className="gap-1.5">
            <Plus size={14} />
            Nova Movimentação
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-36" placeholder="De" />
          <span className="text-t3 text-xs">até</span>
          <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-36" placeholder="Até" />
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center gap-6 text-sm bg-[var(--surface)] rounded-lg border border-[var(--border)] px-4 py-3">
          <span className="text-t3">{filtered.length} registros</span>
          <span className="text-t3">|</span>
          <span className="text-t2">Valor total: <span className="font-semibold text-t1">{formatCurrency(valorTotal)}</span></span>
        </div>
      )}

      <div className="rounded-xl glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center animate-float">
              <ArrowLeftRight size={20} className="text-t4" />
            </div>
            <p className="text-sm text-t3">Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Data', 'Tipo', 'Animal/Brinco', 'Qtd', 'Peso', 'Valor Total', 'Observação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-t3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const animal = m.animal_id ? animalMap.get(m.animal_id) : null
                  const brincoLabel = animal?.brinco ?? m.brinco_bezerro ?? '—'
                  return (
                    <tr key={m.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-4 py-3 text-t2">{formatDate(m.data)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${TIPO_COLORS[m.tipo] ?? 'bg-gray-100 text-gray-700'} border-0 text-xs capitalize`}>{m.tipo}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-t1">{brincoLabel}</td>
                      <td className="px-4 py-3 text-t2 tabular-nums">{m.quantidade}</td>
                      <td className="px-4 py-3 text-t2 tabular-nums">{m.peso_kg ? `${formatNumber(m.peso_kg, 0)} kg` : '—'}</td>
                      <td className="px-4 py-3 text-t2 tabular-nums">{m.valor_total ? formatCurrency(m.valor_total) : '—'}</td>
                      <td className="px-4 py-3 text-t3 text-xs max-w-[160px] truncate">{m.observacao ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nova Movimentação Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Movimentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...EMPTY_FORM, tipo: v, data: f.data }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>

            {/* compra / venda */}
            {(form.tipo === 'compra' || form.tipo === 'venda') && (
              <>
                <div className="space-y-1.5">
                  <Label>Animal</Label>
                  <Select value={form.animal_id} onValueChange={v => setForm(f => ({ ...f, animal_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {animais.filter(a => a.status === 'ativo').map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.brinco} ({a.categoria})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Qtd *</Label>
                    <Input type="number" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Peso (kg)</Label>
                    <Input type="number" value={form.peso_kg} onChange={e => setForm(f => ({ ...f, peso_kg: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor Unit. (R$)</Label>
                    <Input type="number" value={form.valor_unitario} onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
                {form.valor_unitario && form.quantidade && (
                  <p className="text-sm text-t3">
                    Total: <span className="font-semibold text-t1">{formatCurrency(parseFloat(form.valor_unitario) * parseInt(form.quantidade) || 0)}</span>
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label>Tipo de Pagamento</Label>
                  <Select value={form.tipo_pagamento} onValueChange={v => setForm(f => ({ ...f, tipo_pagamento: v as 'a_vista' | 'a_prazo' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_vista">À Vista</SelectItem>
                      <SelectItem value="a_prazo">A Prazo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* nascimento */}
            {form.tipo === 'nascimento' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Brinco do Bezerro *</Label>
                    <Input value={form.brinco_bezerro} onChange={e => setForm(f => ({ ...f, brinco_bezerro: e.target.value }))} placeholder="Ex: B001" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sexo do Bezerro *</Label>
                    <Select value={form.sexo_bezerro} onValueChange={v => setForm(f => ({ ...f, sexo_bezerro: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="macho">Macho</SelectItem>
                        <SelectItem value="femea">Fêmea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Pasto Destino</Label>
                  <Select value={form.pasto_destino_id} onValueChange={v => setForm(f => ({ ...f, pasto_destino_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem pasto</SelectItem>
                      {pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* morte */}
            {form.tipo === 'morte' && (
              <>
                <div className="space-y-1.5">
                  <Label>Animal</Label>
                  <Select value={form.animal_id} onValueChange={v => setForm(f => ({ ...f, animal_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {animais.filter(a => a.status === 'ativo').map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.brinco} ({a.categoria})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Causa da Morte</Label>
                  <Input value={form.causa_morte} onChange={e => setForm(f => ({ ...f, causa_morte: e.target.value }))} placeholder="Ex: Doença, acidente..." />
                </div>
              </>
            )}

            {/* transferencia */}
            {form.tipo === 'transferencia' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Pasto Origem</Label>
                    <Select value={form.pasto_origem_id} onValueChange={v => setForm(f => ({ ...f, pasto_origem_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pasto Destino</Label>
                    <Select value={form.pasto_destino_id} onValueChange={v => setForm(f => ({ ...f, pasto_destino_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Animais ({form.animal_ids_transferencia.length} selecionados)</Label>
                    <div className="flex gap-2">
                      <button className="text-xs text-t3 hover:text-t1" onClick={() => setForm(f => ({ ...f, animal_ids_transferencia: animais.filter(a => a.status === 'ativo').map(a => a.id) }))}>Todos</button>
                      <button className="text-xs text-t3 hover:text-t1" onClick={() => setForm(f => ({ ...f, animal_ids_transferencia: [] }))}>Nenhum</button>
                    </div>
                  </div>
                  <div className="border border-[var(--border)] rounded-lg max-h-36 overflow-y-auto">
                    {animais.filter(a => a.status === 'ativo').map(a => (
                      <label key={a.id} className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-raised)]">
                        <input
                          type="checkbox"
                          checked={form.animal_ids_transferencia.includes(a.id)}
                          onChange={e => setForm(f => ({
                            ...f,
                            animal_ids_transferencia: e.target.checked
                              ? [...f.animal_ids_transferencia, a.id]
                              : f.animal_ids_transferencia.filter(id => id !== a.id),
                          }))}
                          className="w-3.5 h-3.5 accent-[var(--primary)]"
                        />
                        <span className="text-sm text-t1">{a.brinco}</span>
                        <span className="text-xs text-t3 capitalize">{a.categoria}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Qtd *</Label>
              <Input type="number" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} disabled={form.tipo === 'transferencia'} />
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
