import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Weight } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { format } from 'date-fns'
import { supabase, Pesagem, Animal } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNumber, formatDate } from '@/lib/utils'

const CATEGORIA_COLORS: Record<string, string> = {
  vaca: 'bg-pink-100 text-pink-700',
  touro: 'bg-blue-100 text-blue-700',
  bezerro: 'bg-green-100 text-green-700',
  bezerra: 'bg-purple-100 text-purple-700',
  novilha: 'bg-violet-100 text-violet-700',
  garrote: 'bg-orange-100 text-orange-700',
  boi: 'bg-cyan-100 text-cyan-700',
}

interface PesagemRow {
  pesagem: Pesagem
  animal: Animal
  gmd: number | null
}

function TableSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <Skeleton className="h-9 w-64 rounded-md" />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  )
}

function GmdBadge({ gmd }: { gmd: number | null }) {
  if (gmd === null) return <span className="text-t3">—</span>
  const color = gmd > 0.3 ? '#22c55e' : gmd >= 0.15 ? '#f59e0b' : '#ef4444'
  return (
    <span className="font-medium tabular-nums text-sm" style={{ color }}>
      {gmd >= 0 ? '+' : ''}{formatNumber(gmd, 3)} kg/dia
    </span>
  )
}

export function GadoPesagens() {
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<PesagemRow[]>([])
  const [animais, setAnimais] = useState<Animal[]>([])

  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    animal_id: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    peso_kg: '',
    observacao: '',
  })

  const userId = getEffectiveUserId()

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [pesagensRes, animaisRes] = await Promise.all([
        supabase.from('pesagens').select('*').eq('user_id', userId).order('data', { ascending: false }),
        supabase.from('animais').select('*').eq('user_id', userId).order('brinco'),
      ])

      const pesagens: Pesagem[] = pesagensRes.data ?? []
      const animaisList: Animal[] = animaisRes.data ?? []
      setAnimais(animaisList)

      const animalMap = new Map(animaisList.map(a => [a.id, a]))

      const byAnimal: Record<string, Pesagem[]> = {}
      for (const p of pesagens) {
        if (!byAnimal[p.animal_id]) byAnimal[p.animal_id] = []
        byAnimal[p.animal_id].push(p)
      }

      const built: PesagemRow[] = pesagens.map(p => {
        const animal = animalMap.get(p.animal_id)
        if (!animal) return null

        const history = (byAnimal[p.animal_id] ?? [])
          .filter(x => x.data < p.data || (x.data === p.data && x.id < p.id))
          .sort((a, b) => b.data.localeCompare(a.data))
        const prev = history[0]

        let gmd: number | null = null
        if (prev) {
          const days = differenceInDays(parseISO(p.data), parseISO(prev.data))
          if (days > 0) gmd = (p.peso_kg - prev.peso_kg) / days
        }

        return { pesagem: p, animal, gmd }
      }).filter(Boolean) as PesagemRow[]

      setRows(built)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const filtered = rows.filter(r =>
    !search || r.animal.brinco.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!form.animal_id || !form.data || !form.peso_kg) {
      toast.error('Campos obrigatórios', { description: 'Preencha animal, data e peso.' })
      return
    }
    setSaving(true)
    try {
      const uid = session!.user.id
      const peso = parseFloat(form.peso_kg)
      await supabase.from('pesagens').insert({
        user_id: uid,
        animal_id: form.animal_id,
        data: form.data,
        peso_kg: peso,
        observacao: form.observacao || null,
      })

      const { data: latestPesagens } = await supabase
        .from('pesagens')
        .select('data, peso_kg')
        .eq('animal_id', form.animal_id)
        .eq('user_id', userId)
        .order('data', { ascending: false })
        .limit(1)

      if (latestPesagens?.[0] && latestPesagens[0].data <= form.data) {
        await supabase.from('animais').update({ peso_atual: peso }).eq('id', form.animal_id)
      }

      toast.success('Pesagem registrada!')
      setDialogOpen(false)
      setForm({ animal_id: '', data: format(new Date(), 'yyyy-MM-dd'), peso_kg: '', observacao: '' })
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <TableSkeleton />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-t1">Pesagens</h1>
          <p className="text-sm text-t3">{rows.length} pesagem(ns) registrada(s)</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus size={14} />
          Nova Pesagem
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t3" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por brinco..."
          className="pl-8"
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-elev-1 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center animate-float">
              <Weight size={20} className="text-t4" />
            </div>
            <p className="text-sm text-t3">Nenhuma pesagem encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Brinco', 'Categoria', 'Data', 'Peso (kg)', 'GMD', 'Observação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-t3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ pesagem, animal, gmd }, i) => (
                  <tr
                    key={pesagem.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors animate-fade-up"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-4 py-3 font-medium text-t1">{animal.brinco}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${CATEGORIA_COLORS[animal.categoria] ?? ''} border-0 text-xs capitalize`}>
                        {animal.categoria}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-t2">{formatDate(pesagem.data)}</td>
                    <td className="px-4 py-3 text-t2 tabular-nums font-medium">{formatNumber(pesagem.peso_kg, 1)} kg</td>
                    <td className="px-4 py-3"><GmdBadge gmd={gmd} /></td>
                    <td className="px-4 py-3 text-t3 text-xs">{pesagem.observacao ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Pesagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Animal *</Label>
              <Select value={form.animal_id} onValueChange={v => setForm(f => ({ ...f, animal_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o animal" /></SelectTrigger>
                <SelectContent>
                  {animais.filter(a => a.status === 'ativo').map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.brinco} ({a.categoria})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Peso (kg) *</Label>
              <Input type="number" value={form.peso_kg} onChange={e => setForm(f => ({ ...f, peso_kg: e.target.value }))} placeholder="0.0" />
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
