import { useEffect, useState, useCallback } from 'react'
import { Plus, Download, Wheat } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils'
import { exportToExcel } from '@/lib/export-excel'
import { buscarCentroCusto, criarContaReceber, criarLancamentoReceita } from '@/lib/financeiro-integration'

interface Safra { id: string; nome: string }
interface Talhao { id: string; nome: string; area_hectares: number | null }
interface Cultura { id: string; nome: string; unidade_colheita: string | null }
interface SafraTalhao { id: string; safra_id: string; talhao_id: string; cultura_id: string }
interface Colheita {
  id: string; safra_talhao_id: string; data: string; quantidade: number
  umidade: number | null; produtividade: number | null
  destino: 'silo' | 'venda_direta' | 'cooperativa' | null; user_id: string
}

const DESTINO_COLORS: Record<string, string> = {
  silo: 'bg-gray-100 text-gray-700',
  venda_direta: 'bg-green-100 text-green-700',
  cooperativa: 'bg-blue-100 text-blue-700',
}
const DESTINO_LABELS: Record<string, string> = {
  silo: 'Silo', venda_direta: 'Venda Direta', cooperativa: 'Cooperativa',
}

interface FormData {
  safra_id: string; safra_talhao_id: string; data: string; quantidade: string
  umidade: string; destino: string
  comprador: string; preco_unitario: string
}
const EMPTY_FORM: FormData = {
  safra_id: '', safra_talhao_id: '', data: format(new Date(), 'yyyy-MM-dd'),
  quantidade: '', umidade: '', destino: 'silo', comprador: '', preco_unitario: '',
}

function TableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-28" /><Skeleton className="h-4 w-48" /></div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="rounded-xl glass-card overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Colheitas() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [colheitas, setColheitas] = useState<Colheita[]>([])
  const [safras, setSafras] = useState<Safra[]>([])
  const [talhoes, setTalhoes] = useState<Talhao[]>([])
  const [culturas, setCulturas] = useState<Cultura[]>([])
  const [safTalhoes, setSafTalhoes] = useState<SafraTalhao[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [c, s, t, cu, st] = await Promise.all([
        supabase.from('colheitas').select('*').eq('user_id', userId).order('data', { ascending: false }),
        supabase.from('safras').select('*').eq('user_id', userId).order('nome'),
        supabase.from('talhoes').select('*').eq('user_id', userId).order('nome'),
        supabase.from('culturas').select('*').eq('user_id', userId).order('nome'),
        supabase.from('safra_talhoes').select('*').eq('user_id', userId),
      ])
      setColheitas(c.data ?? [])
      setSafras(s.data ?? [])
      setTalhoes(t.data ?? [])
      setCulturas(cu.data ?? [])
      setSafTalhoes(st.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const linkedSTs = form.safra_id ? safTalhoes.filter(st => st.safra_id === form.safra_id) : []

  function getSTInfo(stId: string) {
    const st = safTalhoes.find(x => x.id === stId)
    if (!st) return { talhao: null, cultura: null }
    return {
      talhao: talhoes.find(t => t.id === st.talhao_id) ?? null,
      cultura: culturas.find(c => c.id === st.cultura_id) ?? null,
    }
  }

  function calcProdutividade() {
    if (!form.safra_talhao_id || !form.quantidade) return null
    const { talhao } = getSTInfo(form.safra_talhao_id)
    const area = talhao?.area_hectares
    if (!area) return null
    return parseFloat(form.quantidade) / area
  }

  async function handleSave() {
    if (isImpersonating) { toast.error('Ação bloqueada'); return }
    if (!form.safra_talhao_id || !form.data || !form.quantidade) {
      toast.error('Campos obrigatórios', { description: 'Safra, Talhão, Data e Quantidade são obrigatórios.' }); return
    }
    setSaving(true)
    try {
      const uid = session!.user.id
      const prod = calcProdutividade()
      const { error } = await supabase.from('colheitas').insert({
        user_id: uid,
        safra_talhao_id: form.safra_talhao_id,
        data: form.data,
        quantidade: parseFloat(form.quantidade),
        umidade: form.umidade ? parseFloat(form.umidade) : null,
        produtividade: prod,
        destino: form.destino || null,
      })
      if (error) throw error

      if (form.destino === 'venda_direta' && form.preco_unitario) {
        const preco = parseFloat(form.preco_unitario)
        const qtd = parseFloat(form.quantidade)
        const valorTotal = preco * qtd
        const centro = await buscarCentroCusto(uid, 'Lavoura')
        const { talhao, cultura } = getSTInfo(form.safra_talhao_id)
        const descricao = `Venda direta — ${cultura?.nome ?? 'Colheita'} — ${talhao?.nome ?? ''}`
        if (centro) {
          await criarLancamentoReceita(uid, valorTotal, form.data, descricao, centro.id)
        }
        await supabase.from('comercializacao').insert({
          user_id: uid,
          safra_id: form.safra_id || null,
          cultura_id: safTalhoes.find(x => x.id === form.safra_talhao_id)?.cultura_id ?? null,
          comprador: form.comprador || null,
          quantidade: qtd,
          preco_unitario: preco,
          valor_total: valorTotal,
          data_venda: form.data,
          tipo_contrato: 'avista',
        })
      }

      toast.success('Colheita registrada!')
      setDialogOpen(false); setForm(EMPTY_FORM); loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleExport() {
    const rows = colheitas.map(c => {
      const { talhao, cultura } = getSTInfo(c.safra_talhao_id)
      const st = safTalhoes.find(x => x.id === c.safra_talhao_id)
      const safra = safras.find(s => s.id === st?.safra_id)
      return {
        data: c.data, safra: safra?.nome ?? '–', talhao: talhao?.nome ?? '–',
        cultura: cultura?.nome ?? '–', quantidade: c.quantidade,
        umidade: c.umidade ?? '', produtividade: c.produtividade ?? '',
        destino: DESTINO_LABELS[c.destino ?? ''] ?? '–',
      }
    })
    await exportToExcel('colheitas', 'Colheitas', [
      { key: 'data', header: 'Data', type: 'date', width: 12 },
      { key: 'safra', header: 'Safra', width: 18 },
      { key: 'talhao', header: 'Talhão', width: 16 },
      { key: 'cultura', header: 'Cultura', width: 16 },
      { key: 'quantidade', header: 'Quantidade', type: 'number', width: 14 },
      { key: 'umidade', header: 'Umidade %', type: 'number', width: 12 },
      { key: 'produtividade', header: 'Produtividade', type: 'number', width: 14 },
      { key: 'destino', header: 'Destino', width: 14 },
    ], rows)
  }

  if (loading) return <TableSkeleton />

  const prodAtual = calcProdutividade()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Colheitas</h1>
          <p className="text-sm text-t3">Registro de colheitas por talhão e safra</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" /> Nova Colheita
          </Button>
        </div>
      </div>

      {colheitas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-float"><Wheat className="w-12 h-12 text-t3" /></div>
          <p className="text-sm text-t3">Nenhuma colheita registrada</p>
          <Button size="sm" variant="outline" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>Registrar Colheita</Button>
        </div>
      ) : (
        <div className="rounded-xl glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-left px-4 py-3">Safra</th>
                <th className="text-left px-4 py-3">Talhão</th>
                <th className="text-left px-4 py-3">Cultura</th>
                <th className="text-left px-4 py-3">Quantidade</th>
                <th className="text-left px-4 py-3">Umidade %</th>
                <th className="text-left px-4 py-3">Produtividade</th>
                <th className="text-left px-4 py-3">Destino</th>
              </tr>
            </thead>
            <tbody>
              {colheitas.map((c, i) => {
                const { talhao, cultura } = getSTInfo(c.safra_talhao_id)
                const st = safTalhoes.find(x => x.id === c.safra_talhao_id)
                const safra = safras.find(s => s.id === st?.safra_id)
                return (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors animate-fade-up"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-4 py-3 text-t2">{formatDate(c.data)}</td>
                    <td className="px-4 py-3 text-t2">{safra?.nome ?? '–'}</td>
                    <td className="px-4 py-3 font-medium text-t1">{talhao?.nome ?? '–'}</td>
                    <td className="px-4 py-3 text-t2">{cultura?.nome ?? '–'}</td>
                    <td className="px-4 py-3 text-t2">{formatNumber(c.quantidade)} {cultura?.unidade_colheita ?? ''}</td>
                    <td className="px-4 py-3 text-t2">{c.umidade != null ? `${c.umidade}%` : '–'}</td>
                    <td className="px-4 py-3 text-t2">{c.produtividade != null ? `${formatNumber(c.produtividade, 1)} sc/ha` : '–'}</td>
                    <td className="px-4 py-3">
                      {c.destino ? <Badge className={`text-xs ${DESTINO_COLORS[c.destino] ?? ''}`}>{DESTINO_LABELS[c.destino]}</Badge> : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nova Colheita</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Safra *</Label>
                <Select value={form.safra_id} onValueChange={v => setForm(f => ({ ...f, safra_id: v, safra_talhao_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Talhão *</Label>
                <Select value={form.safra_talhao_id} onValueChange={v => setForm(f => ({ ...f, safra_talhao_id: v }))} disabled={!form.safra_id}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {linkedSTs.map(st => {
                      const t = talhoes.find(x => x.id === st.talhao_id)
                      return <SelectItem key={st.id} value={st.id}>{t?.nome ?? st.talhao_id}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Quantidade *</Label>
                <Input type="number" placeholder="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Umidade %</Label>
                <Input type="number" placeholder="0" value={form.umidade} onChange={e => setForm(f => ({ ...f, umidade: e.target.value }))} />
              </div>
            </div>
            {prodAtual != null && (
              <p className="text-xs text-t3">Produtividade estimada: {formatNumber(prodAtual, 1)} sc/ha</p>
            )}
            <div className="space-y-1.5">
              <Label>Destino</Label>
              <Select value={form.destino} onValueChange={v => setForm(f => ({ ...f, destino: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="silo">Silo</SelectItem>
                  <SelectItem value="venda_direta">Venda Direta</SelectItem>
                  <SelectItem value="cooperativa">Cooperativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.destino === 'venda_direta' && (
              <div className="grid grid-cols-2 gap-3 border border-[var(--border)] rounded-lg p-3 bg-[var(--surface-raised)]">
                <div className="space-y-1.5">
                  <Label>Comprador</Label>
                  <Input placeholder="Nome do comprador" value={form.comprador} onChange={e => setForm(f => ({ ...f, comprador: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço Unitário (R$)</Label>
                  <Input type="number" placeholder="0.00" value={form.preco_unitario} onChange={e => setForm(f => ({ ...f, preco_unitario: e.target.value }))} />
                </div>
                {form.quantidade && form.preco_unitario && (
                  <p className="col-span-2 text-xs text-t3">
                    Valor total: {formatCurrency(parseFloat(form.quantidade) * parseFloat(form.preco_unitario))}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
