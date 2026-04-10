import { useEffect, useState, useCallback, useMemo } from 'react'
import { Package, Download, Search, Plus, Wheat } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatNumber } from '@/lib/utils'
import { exportToExcel } from '@/lib/export-excel'

interface TipoGrao { id: string; nome: string }
interface VariedadeGrao { id: string; tipo_grao_id: string; nome: string }
interface Produtor { id: string; nome: string }
interface RecebimentoRow {
  id: string; data: string; produtor_id: string | null; tipo_grao_id: string | null
  variedade_id: string | null; placa_veiculo: string | null; nota_fiscal: string | null
  peso_bruto: number; tara: number; peso_liquido: number
  umidade: number | null; impureza: number | null
  desconto_umidade: number | null; desconto_impureza: number | null; desconto_outros: number | null
  peso_descontado: number; observacao: string | null; user_id: string; created_at: string
}

const EMPTY_FORM = {
  data: format(new Date(), 'yyyy-MM-dd'),
  produtor_id: '',
  tipo_grao_id: '',
  variedade_id: '',
  placa_veiculo: '',
  nota_fiscal: '',
  peso_bruto: '',
  tara: '',
  umidade: '',
  impureza: '',
  desconto_outros: '',
  observacao: '',
}

function calcDescontos(pesoBruto: string, tara: string, umidade: string, impureza: string, descontoOutros: string) {
  const bruto = parseFloat(pesoBruto) || 0
  const taraVal = parseFloat(tara) || 0
  const liquido = Math.max(0, bruto - taraVal)
  const umidadeVal = parseFloat(umidade) || 0
  const impurezaVal = parseFloat(impureza) || 0
  const outros = parseFloat(descontoOutros) || 0
  const dUmidade = umidadeVal > 13 ? (umidadeVal - 13) * 0.1125 / 100 * liquido : 0
  const dImpureza = impurezaVal > 1 ? (impurezaVal - 1) * 0.1125 / 100 * liquido : 0
  const descontado = Math.max(0, liquido - dUmidade - dImpureza - outros)
  return { liquido, dUmidade, dImpureza, descontado }
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
}

export function Recebimento() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const userId = getEffectiveUserId() ?? session?.user?.id

  const [tipos, setTipos] = useState<TipoGrao[]>([])
  const [variedades, setVariedades] = useState<VariedadeGrao[]>([])
  const [produtores, setProdutores] = useState<Produtor[]>([])
  const [rows, setRows] = useState<RecebimentoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)
  const [filterTipo, setFilterTipo] = useState('')
  const [filterProdutor, setFilterProdutor] = useState('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [search, setSearch] = useState('')

  const calc = useMemo(
    () => calcDescontos(form.peso_bruto, form.tara, form.umidade, form.impureza, form.desconto_outros),
    [form.peso_bruto, form.tara, form.umidade, form.impureza, form.desconto_outros]
  )

  const variedadesFiltradas = useMemo(
    () => variedades.filter(v => v.tipo_grao_id === form.tipo_grao_id),
    [variedades, form.tipo_grao_id]
  )

  const loadAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [tRes, vRes, pRes, rRes] = await Promise.all([
      supabase.from('tipos_grao').select('*').eq('user_id', userId).order('nome'),
      supabase.from('variedades_grao').select('*').eq('user_id', userId).order('nome'),
      supabase.from('produtores').select('*').eq('user_id', userId).order('nome'),
      supabase.from('recebimentos').select('*').eq('user_id', userId).order('data', { ascending: false }),
    ])
    setTipos(tRes.data ?? [])
    setVariedades(vRes.data ?? [])
    setProdutores(pRes.data ?? [])
    setRows(rRes.data ?? [])
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
    if (!form.peso_bruto || !form.tara || !form.data) {
      toast.error('Campos obrigatórios', { description: 'Data, Peso Bruto e Tara são obrigatórios.' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('recebimentos').insert({
      user_id: session.user.id,
      data: form.data,
      produtor_id: form.produtor_id || null,
      tipo_grao_id: form.tipo_grao_id || null,
      variedade_id: form.variedade_id || null,
      placa_veiculo: form.placa_veiculo || null,
      nota_fiscal: form.nota_fiscal || null,
      peso_bruto: parseFloat(form.peso_bruto) || 0,
      tara: parseFloat(form.tara) || 0,
      peso_liquido: calc.liquido,
      umidade: parseFloat(form.umidade) || null,
      impureza: parseFloat(form.impureza) || null,
      desconto_umidade: calc.dUmidade || null,
      desconto_impureza: calc.dImpureza || null,
      desconto_outros: parseFloat(form.desconto_outros) || null,
      peso_descontado: calc.descontado,
      observacao: form.observacao || null,
    })
    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar', { description: error.message })
    } else {
      toast.success('Recebimento registrado!')
      setForm({ ...EMPTY_FORM, data: format(new Date(), 'yyyy-MM-dd') })
      loadAll()
    }
  }

  const filtered = useMemo(() => rows.filter(r => {
    if (filterTipo && r.tipo_grao_id !== filterTipo) return false
    if (filterProdutor && r.produtor_id !== filterProdutor) return false
    if (filterStart && r.data < filterStart) return false
    if (filterEnd && r.data > filterEnd) return false
    if (search) {
      const q = search.toLowerCase()
      const prod = produtores.find(p => p.id === r.produtor_id)?.nome ?? ''
      const tipo = tipos.find(t => t.id === r.tipo_grao_id)?.nome ?? ''
      const nf = r.nota_fiscal ?? ''
      if (!prod.toLowerCase().includes(q) && !tipo.toLowerCase().includes(q) && !nf.toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, filterTipo, filterProdutor, filterStart, filterEnd, search, produtores, tipos])

  async function handleExport() {
    await exportToExcel('recebimentos', 'Recebimentos', [
      { key: 'data', header: 'Data', width: 12, type: 'date' },
      { key: 'produtor', header: 'Produtor', width: 22 },
      { key: 'grao', header: 'Grão', width: 14 },
      { key: 'variedade', header: 'Variedade', width: 14 },
      { key: 'peso_bruto', header: 'Peso Bruto (kg)', width: 16, type: 'number' },
      { key: 'tara', header: 'Tara (kg)', width: 12, type: 'number' },
      { key: 'peso_liquido', header: 'Peso Líquido (kg)', width: 18, type: 'number' },
      { key: 'umidade', header: 'Umidade (%)', width: 13, type: 'number' },
      { key: 'impureza', header: 'Impureza (%)', width: 13, type: 'number' },
      { key: 'peso_descontado', header: 'Peso Descontado (kg)', width: 20, type: 'number' },
      { key: 'nota_fiscal', header: 'NF', width: 14 },
    ], filtered.map(r => ({
      data: r.data,
      produtor: produtores.find(p => p.id === r.produtor_id)?.nome ?? '',
      grao: tipos.find(t => t.id === r.tipo_grao_id)?.nome ?? '',
      variedade: variedades.find(v => v.id === r.variedade_id)?.nome ?? '',
      peso_bruto: r.peso_bruto,
      tara: r.tara,
      peso_liquido: r.peso_liquido,
      umidade: r.umidade,
      impureza: r.impureza,
      peso_descontado: r.peso_descontado,
      nota_fiscal: r.nota_fiscal,
    })))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-t1">Recebimento de Grãos</h1>
        <p className="text-sm text-t3">Registre entradas de grãos com descontos automáticos por umidade e impureza</p>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-t2 flex items-center gap-2">
            <Plus size={14} />
            Novo Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={form.data} onChange={e => setField('data', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Produtor</Label>
                <Select value={form.produtor_id} onValueChange={v => setField('produtor_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {produtores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Grão</Label>
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
              <div className="space-y-1">
                <Label className="text-xs">Placa Veículo</Label>
                <Input value={form.placa_veiculo} onChange={e => setField('placa_veiculo', e.target.value)} placeholder="ABC-1234" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nota Fiscal</Label>
                <Input value={form.nota_fiscal} onChange={e => setField('nota_fiscal', e.target.value)} placeholder="NF-001" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Peso Bruto (kg) *</Label>
                <Input type="number" step="0.01" min="0" value={form.peso_bruto} onChange={e => setField('peso_bruto', e.target.value)} placeholder="0" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tara (kg) *</Label>
                <Input type="number" step="0.01" min="0" value={form.tara} onChange={e => setField('tara', e.target.value)} placeholder="0" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Umidade (%)</Label>
                <Input type="number" step="0.1" min="0" max="30" value={form.umidade} onChange={e => setField('umidade', e.target.value)} placeholder="13.0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Impureza (%)</Label>
                <Input type="number" step="0.1" min="0" max="15" value={form.impureza} onChange={e => setField('impureza', e.target.value)} placeholder="1.0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desconto Outros (kg)</Label>
                <Input type="number" step="0.01" min="0" value={form.desconto_outros} onChange={e => setField('desconto_outros', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
              <div>
                <p className="text-xs text-t3">Peso Líquido</p>
                <p className="text-sm font-semibold text-t1">{formatNumber(calc.liquido, 0)} kg</p>
              </div>
              <div>
                <p className="text-xs text-t3">Desc. Umidade</p>
                <p className="text-sm font-semibold text-amber-500">-{formatNumber(calc.dUmidade, 1)} kg</p>
              </div>
              <div>
                <p className="text-xs text-t3">Desc. Impureza</p>
                <p className="text-sm font-semibold text-amber-500">-{formatNumber(calc.dImpureza, 1)} kg</p>
              </div>
              <div>
                <p className="text-xs text-t3">Peso Descontado</p>
                <p className="text-lg font-bold text-[var(--primary)]">{formatNumber(calc.descontado, 0)} kg</p>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observação</Label>
              <Textarea rows={2} value={form.observacao} onChange={e => setField('observacao', e.target.value)} placeholder="Observações..." />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                <Package size={14} />
                {saving ? 'Salvando...' : 'Registrar Recebimento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-medium text-t2">Histórico de Recebimentos</CardTitle>
            <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
              <Download size={13} />
              Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t3" />
              <Input className="pl-7 h-8 text-xs" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Input type="date" className="h-8 text-xs w-36" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
            <Input type="date" className="h-8 text-xs w-36" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Tipo de grão" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {tipos.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterProdutor} onValueChange={setFilterProdutor}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Produtor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {produtores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? <TableSkeleton /> : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-t3 gap-2">
              <Wheat size={28} className="animate-float opacity-40" />
              <p className="text-sm">Nenhum recebimento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
                    <th className="text-left py-2 px-3">Data</th>
                    <th className="text-left py-2 px-3">Produtor</th>
                    <th className="text-left py-2 px-3">Grão / Variedade</th>
                    <th className="text-right py-2 px-3">Peso Bruto</th>
                    <th className="text-right py-2 px-3">Peso Líquido</th>
                    <th className="text-right py-2 px-3">Umidade%</th>
                    <th className="text-right py-2 px-3">Impureza%</th>
                    <th className="text-right py-2 px-3">Peso Descontado</th>
                    <th className="text-left py-2 px-3">NF</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const prod = produtores.find(p => p.id === r.produtor_id)?.nome ?? '—'
                    const tipo = tipos.find(t => t.id === r.tipo_grao_id)?.nome ?? '—'
                    const varNome = variedades.find(v => v.id === r.variedade_id)?.nome
                    return (
                      <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                        <td className="py-2.5 px-3 text-t2">{formatDate(r.data)}</td>
                        <td className="py-2.5 px-3 text-t1">{prod}</td>
                        <td className="py-2.5 px-3 text-t1">
                          {tipo}{varNome && <span className="text-t3 text-xs ml-1">· {varNome}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-t2">{formatNumber(r.peso_bruto, 0)} kg</td>
                        <td className="py-2.5 px-3 text-right text-t2">{formatNumber(r.peso_liquido, 0)} kg</td>
                        <td className="py-2.5 px-3 text-right text-t2">{r.umidade != null ? `${r.umidade}%` : '—'}</td>
                        <td className="py-2.5 px-3 text-right text-t2">{r.impureza != null ? `${r.impureza}%` : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-t1">{formatNumber(r.peso_descontado, 0)} kg</td>
                        <td className="py-2.5 px-3 text-t3 text-xs">{r.nota_fiscal ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
