import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { useFinanceiro } from '@/contexts/FinanceiroContext'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToExcel } from '@/lib/export-excel'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, Search, X, Download, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, FileText } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { format } from 'date-fns'

interface Lancamento {
  id: string
  tipo: 'receita' | 'despesa' | 'transferencia'
  valor: number
  data: string
  descricao: string | null
  categoria_id: string | null
  centro_custo_id: string | null
  conta_bancaria_id: string | null
  conta_destino_id: string | null
  contato_id: string | null
  conta_pr_id: string | null
  user_id: string
  created_at: string
  categoria_nome?: string
  centro_nome?: string
  conta_nome?: string
  contato_nome?: string
}

const tipoColors = {
  receita: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  despesa: 'bg-red-50 text-red-600 border-red-100',
  transferencia: 'bg-blue-50 text-blue-600 border-blue-100',
}
const tipoLabels = { receita: 'Receita', despesa: 'Despesa', transferencia: 'Transferência' }
const tipoIcons = { receita: ArrowUpCircle, despesa: ArrowDownCircle, transferencia: ArrowLeftRight }

const EMPTY_FORM = {
  tipo: 'despesa' as 'receita' | 'despesa' | 'transferencia',
  valor: '',
  data: format(new Date(), 'yyyy-MM-dd'),
  descricao: '',
  categoria_id: '',
  centro_custo_id: '',
  conta_bancaria_id: '',
  conta_destino_id: '',
  contato_id: '',
}

export function Lancamentos() {
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()
  const { categorias, centrosCusto, contatos, contasBancarias, reload: ctxReload } = useFinanceiro()

  const [lancamentos, setLancamentos]     = useState<Lancamento[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [tipoFilter, setTipoFilter]       = useState('todos')
  const [centroFilter, setCentroFilter]   = useState('todos')
  const [catFilter, setCatFilter]         = useState('todos')
  const [dataDeFilter, setDataDeFilter]   = useState('')
  const [dataAteFilter, setDataAteFilter] = useState('')
  const [showModal, setShowModal]         = useState(false)
  const [form, setForm]                   = useState({ ...EMPTY_FORM })
  const [saving, setSaving]               = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState<Lancamento | null>(null)
  const [deleting, setDeleting]           = useState(false)

  const enrich = useCallback((rows: Lancamento[]): Lancamento[] =>
    rows.map(l => ({
      ...l,
      categoria_nome: categorias.find(c => c.id === l.categoria_id)?.nome,
      centro_nome: centrosCusto.find(c => c.id === l.centro_custo_id)?.nome,
      conta_nome: contasBancarias.find(c => c.id === l.conta_bancaria_id)?.nome,
      contato_nome: contatos.find(c => c.id === l.contato_id)?.nome,
    }))
  , [categorias, centrosCusto, contasBancarias, contatos])

  const fetchLancamentos = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('lancamentos').select('*').eq('user_id', userId)
        .order('data', { ascending: false }).order('created_at', { ascending: false })
      setLancamentos(enrich((data ?? []) as Lancamento[]))
    } finally { setLoading(false) }
  }, [userId, enrich])

  useEffect(() => { fetchLancamentos() }, [fetchLancamentos])

  const filtered = lancamentos.filter(l => {
    const matchSearch = !search || (l.descricao ?? '').toLowerCase().includes(search.toLowerCase())
    const matchTipo   = tipoFilter === 'todos' || l.tipo === tipoFilter
    const matchCentro = centroFilter === 'todos' || l.centro_custo_id === centroFilter
    const matchCat    = catFilter === 'todos' || l.categoria_id === catFilter
    const matchDe     = !dataDeFilter || l.data >= dataDeFilter
    const matchAte    = !dataAteFilter || l.data <= dataAteFilter
    return matchSearch && matchTipo && matchCentro && matchCat && matchDe && matchAte
  })

  function openCreate() { setForm({ ...EMPTY_FORM }); setShowModal(true) }

  async function handleSave() {
    if (!form.valor || !form.data || !form.conta_bancaria_id) {
      toast.error('Campos obrigatórios', { description: 'Preencha valor, data e conta bancária.' })
      return
    }
    const valor = parseFloat(form.valor)
    if (isNaN(valor) || valor <= 0) { toast.error('Valor inválido'); return }
    if (form.tipo === 'transferencia' && !form.conta_destino_id) {
      toast.error('Conta destino obrigatória'); return
    }
    setSaving(true)
    try {
      const { error: insertErr } = await supabase.from('lancamentos').insert({
        user_id: userId, tipo: form.tipo, valor, data: form.data,
        descricao: form.descricao.trim() || null,
        categoria_id: form.categoria_id || null,
        centro_custo_id: form.centro_custo_id || null,
        conta_bancaria_id: form.conta_bancaria_id || null,
        conta_destino_id: form.tipo === 'transferencia' ? (form.conta_destino_id || null) : null,
        contato_id: form.contato_id || null,
      })
      if (insertErr) throw insertErr

      const conta = contasBancarias.find(cb => cb.id === form.conta_bancaria_id)
      if (conta) {
        if (form.tipo === 'receita') {
          await supabase.from('contas_bancarias').update({ saldo_atual: (conta.saldo_atual ?? 0) + valor }).eq('id', conta.id)
        } else if (form.tipo === 'despesa') {
          await supabase.from('contas_bancarias').update({ saldo_atual: (conta.saldo_atual ?? 0) - valor }).eq('id', conta.id)
        } else {
          await supabase.from('contas_bancarias').update({ saldo_atual: (conta.saldo_atual ?? 0) - valor }).eq('id', conta.id)
          const contaDest = contasBancarias.find(cb => cb.id === form.conta_destino_id)
          if (contaDest) {
            await supabase.from('contas_bancarias').update({ saldo_atual: (contaDest.saldo_atual ?? 0) + valor }).eq('id', contaDest.id)
          }
        }
      }
      toast.success('Lançamento criado com sucesso.')
      setShowModal(false); fetchLancamentos(); ctxReload()
    } catch (e: unknown) {
      toast.error('Erro ao criar lançamento', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const conta = contasBancarias.find(cb => cb.id === deleteTarget.conta_bancaria_id)
      if (conta) {
        if (deleteTarget.tipo === 'receita') {
          await supabase.from('contas_bancarias').update({ saldo_atual: (conta.saldo_atual ?? 0) - deleteTarget.valor }).eq('id', conta.id)
        } else if (deleteTarget.tipo === 'despesa') {
          await supabase.from('contas_bancarias').update({ saldo_atual: (conta.saldo_atual ?? 0) + deleteTarget.valor }).eq('id', conta.id)
        } else {
          await supabase.from('contas_bancarias').update({ saldo_atual: (conta.saldo_atual ?? 0) + deleteTarget.valor }).eq('id', conta.id)
          const contaDest = contasBancarias.find(cb => cb.id === deleteTarget.conta_destino_id)
          if (contaDest) {
            await supabase.from('contas_bancarias').update({ saldo_atual: (contaDest.saldo_atual ?? 0) - deleteTarget.valor }).eq('id', contaDest.id)
          }
        }
      }
      const { error } = await supabase.from('lancamentos').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Lançamento excluído.'); setDeleteTarget(null); fetchLancamentos(); ctxReload()
    } catch (e: unknown) {
      toast.error('Erro ao excluir', { description: (e as Error).message })
    } finally { setDeleting(false) }
  }

  async function handleExport() {
    await exportToExcel('lancamentos', 'Lançamentos',
      [
        { key: 'data', header: 'Data', width: 14, type: 'date' },
        { key: 'tipo', header: 'Tipo', width: 16 },
        { key: 'descricao', header: 'Descrição', width: 30 },
        { key: 'valor', header: 'Valor', width: 16, type: 'currency' },
        { key: 'conta_nome', header: 'Conta', width: 20 },
        { key: 'centro_nome', header: 'Centro de Custo', width: 20 },
        { key: 'categoria_nome', header: 'Categoria', width: 20 },
        { key: 'contato_nome', header: 'Contato', width: 20 },
      ],
      filtered.map(l => ({
        data: l.data, tipo: tipoLabels[l.tipo], descricao: l.descricao ?? '',
        valor: l.valor, conta_nome: l.conta_nome ?? '', centro_nome: l.centro_nome ?? '',
        categoria_nome: l.categoria_nome ?? '', contato_nome: l.contato_nome ?? '',
      })),
      { valor: filtered.reduce((s, l) => s + (l.tipo !== 'transferencia' ? (l.tipo === 'receita' ? l.valor : -l.valor) : 0), 0) }
    )
  }

  const catsFiltradas = form.tipo === 'receita'
    ? categorias.filter(c => c.tipo === 'receita')
    : form.tipo === 'despesa'
      ? categorias.filter(c => c.tipo === 'despesa' || c.tipo === 'investimento')
      : []

  if (loading) return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-32" /></div>
      <Skeleton className="h-12 rounded-xl" /><Skeleton className="h-96 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-heading-lg text-t1">Lançamentos</h1>
          <p className="text-sm text-t3 mt-0.5">{filtered.length} lançamento(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={handleExport}><Download size={14} /> Exportar</Button>
          <Button onClick={openCreate} className="gap-2"><Plus size={15} /> Novo Lançamento</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <Input className="pl-9 h-9 text-sm" placeholder="Buscar por descrição..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            <SelectItem value="receita">Receita</SelectItem>
            <SelectItem value="despesa">Despesa</SelectItem>
            <SelectItem value="transferencia">Transferência</SelectItem>
          </SelectContent>
        </Select>
        <Select value={centroFilter} onValueChange={setCentroFilter}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Centros</SelectItem>
            {centrosCusto.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as Categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="h-9 w-36 text-sm" value={dataDeFilter} onChange={e => setDataDeFilter(e.target.value)} />
        <Input type="date" className="h-9 w-36 text-sm" value={dataAteFilter} onChange={e => setDataAteFilter(e.target.value)} />
        {(search || tipoFilter !== 'todos' || centroFilter !== 'todos' || catFilter !== 'todos' || dataDeFilter || dataAteFilter) && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-t3"
            onClick={() => { setSearch(''); setTipoFilter('todos'); setCentroFilter('todos'); setCatFilter('todos'); setDataDeFilter(''); setDataAteFilter('') }}>
            <X size={13} /> Limpar
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="Nenhum lançamento encontrado" compact />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['Data','Tipo','Descrição','Valor','Conta','Centro de Custo','Categoria','Contato',''].map((h, i) => (
                      <th key={i} className={`py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider ${i >= 3 && i <= 7 ? 'text-left' : i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => {
                    const Icon = tipoIcons[l.tipo]
                    return (
                      <tr key={l.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-raised)] transition-colors duration-100">
                        <td className="py-3 px-4 text-t2 whitespace-nowrap">{formatDate(l.data)}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs border gap-1 ${tipoColors[l.tipo]}`}><Icon size={10} />{tipoLabels[l.tipo]}</Badge>
                        </td>
                        <td className="py-3 px-4 text-t1 max-w-[180px] truncate">{l.descricao ?? '—'}</td>
                        <td className={`py-3 px-4 text-right tabular font-medium ${l.tipo === 'receita' ? 'text-emerald-600' : l.tipo === 'despesa' ? 'text-red-600' : 'text-blue-600'}`}>
                          {l.tipo === 'despesa' ? '-' : ''}{formatCurrency(l.valor)}
                        </td>
                        <td className="py-3 px-4 text-t2 truncate max-w-[120px]">{l.conta_nome ?? '—'}</td>
                        <td className="py-3 px-4 text-t2 truncate max-w-[120px]">{l.centro_nome ?? '—'}</td>
                        <td className="py-3 px-4 text-t2 truncate max-w-[120px]">{l.categoria_nome ?? '—'}</td>
                        <td className="py-3 px-4 text-t2 truncate max-w-[120px]">{l.contato_nome ?? '—'}</td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleteTarget(l)}>
                            <Trash2 size={12} />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as typeof form.tipo, categoria_id: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor *</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input placeholder="Descrição opcional..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Conta {form.tipo === 'transferencia' ? 'Origem' : ''} *</Label>
                <Select value={form.conta_bancaria_id} onValueChange={v => setForm(f => ({ ...f, conta_bancaria_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                  <SelectContent>
                    {contasBancarias.filter(c => c.ativa).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.tipo === 'transferencia' ? (
                <div className="space-y-1.5">
                  <Label>Conta Destino *</Label>
                  <Select value={form.conta_destino_id} onValueChange={v => setForm(f => ({ ...f, conta_destino_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                    <SelectContent>
                      {contasBancarias.filter(c => c.ativa && c.id !== form.conta_bancaria_id).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={form.categoria_id} onValueChange={v => setForm(f => ({ ...f, categoria_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Categoria..." /></SelectTrigger>
                    <SelectContent>
                      {catsFiltradas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Centro de Custo</Label>
                <Select value={form.centro_custo_id} onValueChange={v => setForm(f => ({ ...f, centro_custo_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Centro..." /></SelectTrigger>
                  <SelectContent>
                    {centrosCusto.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contato</Label>
                <Select value={form.contato_id} onValueChange={v => setForm(f => ({ ...f, contato_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Contato..." /></SelectTrigger>
                  <SelectContent>
                    {contatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir Lançamento</DialogTitle></DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza? O saldo da conta bancária será revertido. Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting && <Loader2 size={14} className="animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
