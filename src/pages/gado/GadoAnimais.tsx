import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Trash2, Eye, PawPrint,
} from 'lucide-react'
import { format } from 'date-fns'
import { supabase, Animal, Pasto, Raca } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatNumber, formatCurrency } from '@/lib/utils'

const CATEGORIA_COLORS: Record<string, string> = {
  vaca: 'bg-pink-100 text-pink-700',
  touro: 'bg-blue-100 text-blue-700',
  bezerro: 'bg-green-100 text-green-700',
  bezerra: 'bg-purple-100 text-purple-700',
  novilha: 'bg-violet-100 text-violet-700',
  garrote: 'bg-orange-100 text-orange-700',
  boi: 'bg-cyan-100 text-cyan-700',
}

const CATEGORIAS = ['vaca', 'touro', 'bezerro', 'bezerra', 'novilha', 'garrote', 'boi']

interface FormData {
  brinco: string
  sexo: 'macho' | 'femea' | ''
  categoria: string
  raca_id: string
  cor: string
  data_nascimento: string
  data_entrada: string
  origem: 'nascido' | 'comprado' | ''
  pai_brinco: string
  mae_brinco: string
  pasto_id: string
  peso_atual: string
  observacoes: string
}

const EMPTY_FORM: FormData = {
  brinco: '', sexo: '', categoria: '', raca_id: '', cor: '',
  data_nascimento: '', data_entrada: '', origem: '', pai_brinco: '',
  mae_brinco: '', pasto_id: '', peso_atual: '', observacoes: '',
}

function TableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-36 rounded-md" />)}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GadoAnimais() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [animais, setAnimais] = useState<Animal[]>([])
  const [pastos, setPastos] = useState<Pasto[]>([])
  const [racas, setRacas] = useState<Raca[]>([])
  const [profile, setProfile] = useState<{ rendimento_carcaca: number; valor_arroba: number } | null>(null)

  const [search, setSearch] = useState('')
  const [filterPasto, setFilterPasto] = useState('todos')
  const [filterCategoria, setFilterCategoria] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('ativo')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)

  const userId = getEffectiveUserId()

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [animaisRes, pastosRes, racasRes, profileRes] = await Promise.all([
        supabase.from('animais').select('*').eq('user_id', userId).order('brinco'),
        supabase.from('pastos').select('*').eq('user_id', userId).order('nome'),
        supabase.from('racas').select('*').eq('user_id', userId).order('nome'),
        supabase.from('profiles').select('rendimento_carcaca, valor_arroba').eq('user_id', userId).single(),
      ])
      setAnimais(animaisRes.data ?? [])
      setPastos(pastosRes.data ?? [])
      setRacas(racasRes.data ?? [])
      setProfile(profileRes.data)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const filtered = animais.filter(a => {
    if (search && !a.brinco.toLowerCase().includes(search.toLowerCase())) return false
    if (filterPasto !== 'todos' && a.pasto_id !== filterPasto) return false
    if (filterCategoria !== 'todos' && a.categoria !== filterCategoria) return false
    if (filterStatus !== 'todos' && a.status !== filterStatus) return false
    return true
  })

  function calcArroba(peso: number | null) {
    if (!peso || !profile) return null
    return peso * profile.rendimento_carcaca / 100 / 15
  }

  function calcValor(peso: number | null) {
    if (!peso || !profile) return null
    return peso * profile.rendimento_carcaca / 100 / 15 * profile.valor_arroba
  }

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!form.brinco || !form.sexo || !form.categoria) {
      toast.error('Campos obrigatórios', { description: 'Preencha Brinco, Sexo e Categoria.' })
      return
    }
    setSaving(true)
    try {
      const uid = session!.user.id
      const payload = {
        user_id: uid,
        brinco: form.brinco.trim(),
        sexo: form.sexo as 'macho' | 'femea',
        categoria: form.categoria,
        raca_id: form.raca_id || null,
        cor: form.cor || null,
        data_nascimento: form.data_nascimento || null,
        data_entrada: form.data_entrada || null,
        origem: form.origem || null,
        pai_brinco: form.pai_brinco || null,
        mae_brinco: form.mae_brinco || null,
        pasto_id: form.pasto_id || null,
        peso_atual: form.peso_atual ? parseFloat(form.peso_atual) : null,
        observacoes: form.observacoes || null,
        status: 'ativo' as const,
      }
      const { data: saved, error } = await supabase.from('animais').insert(payload).select('id').single()
      if (error) throw error

      if (form.origem === 'nascido' && saved) {
        await supabase.from('movimentacoes_gado').insert({
          user_id: uid,
          tipo: 'nascimento',
          animal_id: saved.id,
          data: form.data_nascimento || format(new Date(), 'yyyy-MM-dd'),
          quantidade: 1,
          brinco_bezerro: form.brinco.trim(),
          sexo_bezerro: form.sexo,
          pasto_destino_id: form.pasto_id || null,
        })
      }

      toast.success('Animal cadastrado!')
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    const { error } = await supabase.from('animais').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir', { description: error.message })
    } else {
      toast.success('Animal excluído')
      setAnimais(prev => prev.filter(a => a.id !== id))
    }
    setConfirmDeleteId(null)
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Animais</h1>
          <p className="text-sm text-t3">{animais.filter(a => a.status === 'ativo').length} animais ativos no rebanho</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }} className="gap-1.5">
          <Plus size={14} />
          Novo Animal
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t3" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por brinco..."
            className="pl-8"
          />
        </div>
        <Select value={filterPasto} onValueChange={setFilterPasto}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Pasto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os pastos</SelectItem>
            {pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
            <SelectItem value="morto">Morto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center animate-float">
              <PawPrint size={20} className="text-t4" />
            </div>
            <p className="text-sm text-t3">Nenhum animal encontrado</p>
            <Button variant="outline" size="sm" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>
              <Plus size={13} className="mr-1.5" /> Cadastrar animal
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Brinco', 'Categoria', 'Sexo', 'Raça', 'Pasto', 'Peso (kg)', 'Peso (@)', 'Valor Est.', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-t3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const raca = racas.find(r => r.id === a.raca_id)
                  const pasto = pastos.find(p => p.id === a.pasto_id)
                  const arroba = calcArroba(a.peso_atual)
                  const valor = calcValor(a.peso_atual)
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer animate-fade-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => navigate(`/gado/animais/${a.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-t1">{a.brinco}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${CATEGORIA_COLORS[a.categoria] ?? ''} border-0 text-xs capitalize`}>
                          {a.categoria}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-t2 capitalize">{a.sexo}</td>
                      <td className="px-4 py-3 text-t2">{raca?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-t2">{pasto?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-t2 tabular-nums">{a.peso_atual ? formatNumber(a.peso_atual, 0) : '—'}</td>
                      <td className="px-4 py-3 text-t2 tabular-nums">{arroba ? formatNumber(arroba, 1) : '—'}</td>
                      <td className="px-4 py-3 text-t2 tabular-nums">{valor ? formatCurrency(valor) : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className={
                          a.status === 'ativo' ? 'bg-green-100 text-green-700 border-0 text-xs'
                          : a.status === 'vendido' ? 'bg-blue-100 text-blue-700 border-0 text-xs'
                          : 'bg-red-100 text-red-700 border-0 text-xs'
                        }>
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            title="Ver ficha"
                            onClick={() => navigate(`/gado/animais/${a.id}`)}
                            className="p-1.5 rounded-md text-t3 hover:text-t1 hover:bg-[var(--surface-overlay)] transition-colors"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            title="Excluir"
                            onClick={() => setConfirmDeleteId(a.id)}
                            className="p-1.5 rounded-md text-t3 hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Animal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Animal</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Brinco *</Label>
              <Input value={form.brinco} onChange={e => setForm(f => ({ ...f, brinco: e.target.value }))} placeholder="Ex: A001" />
            </div>
            <div className="space-y-1.5">
              <Label>Sexo *</Label>
              <Select value={form.sexo} onValueChange={v => setForm(f => ({ ...f, sexo: v as 'macho' | 'femea' }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="macho">Macho</SelectItem>
                  <SelectItem value="femea">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Raça</Label>
              <Select value={form.raca_id} onValueChange={v => setForm(f => ({ ...f, raca_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não informado</SelectItem>
                  {racas.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <Input value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} placeholder="Ex: Vermelho" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Nascimento</Label>
              <Input type="date" value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Entrada</Label>
              <Input type="date" value={form.data_entrada} onChange={e => setForm(f => ({ ...f, data_entrada: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={form.origem} onValueChange={v => setForm(f => ({ ...f, origem: v as 'nascido' | 'comprado' }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não informado</SelectItem>
                  <SelectItem value="nascido">Nascido na fazenda</SelectItem>
                  <SelectItem value="comprado">Comprado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Brinco do Pai</Label>
              <Input value={form.pai_brinco} onChange={e => setForm(f => ({ ...f, pai_brinco: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Brinco da Mãe</Label>
              <Input value={form.mae_brinco} onChange={e => setForm(f => ({ ...f, mae_brinco: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Pasto</Label>
              <Select value={form.pasto_id} onValueChange={v => setForm(f => ({ ...f, pasto_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem pasto</SelectItem>
                  {pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Peso Atual (kg)</Label>
              <Input type="number" value={form.peso_atual} onChange={e => setForm(f => ({ ...f, peso_atual: e.target.value }))} placeholder="0.0" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-t2">Tem certeza que deseja excluir este animal? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
