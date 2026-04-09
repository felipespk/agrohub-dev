import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Weight } from 'lucide-react'
import {
  differenceInDays, differenceInMonths, parseISO, format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  supabase, Animal, Pasto, Raca, Pesagem, AplicacaoSanitaria, Medicamento, MovimentacaoGado,
} from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

const CATEGORIA_COLORS: Record<string, string> = {
  vaca: 'bg-pink-100 text-pink-700',
  touro: 'bg-blue-100 text-blue-700',
  bezerro: 'bg-green-100 text-green-700',
  bezerra: 'bg-purple-100 text-purple-700',
  novilha: 'bg-violet-100 text-violet-700',
  garrote: 'bg-orange-100 text-orange-700',
  boi: 'bg-cyan-100 text-cyan-700',
}

const TIPO_MOV_COLORS: Record<string, string> = {
  compra: 'bg-blue-100 text-blue-700',
  venda: 'bg-green-100 text-green-700',
  nascimento: 'bg-cyan-100 text-cyan-700',
  morte: 'bg-red-100 text-red-700',
  transferencia: 'bg-yellow-100 text-yellow-700',
}

export function GadoAnimalFicha() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { getEffectiveUserId, isImpersonating } = useImpersonation()

  const [loading, setLoading] = useState(true)
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [pasto, setPasto] = useState<Pasto | null>(null)
  const [raca, setRaca] = useState<Raca | null>(null)
  const [pesagens, setPesagens] = useState<Pesagem[]>([])
  const [aplicacoes, setAplicacoes] = useState<AplicacaoSanitaria[]>([])
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [movimentos, setMovimentos] = useState<MovimentacaoGado[]>([])
  const [profile, setProfile] = useState<{ rendimento_carcaca: number; valor_arroba: number } | null>(null)

  const [pesagemOpen, setPesagemOpen] = useState(false)
  const [savingPesagem, setSavingPesagem] = useState(false)
  const [pesagemForm, setPesagemForm] = useState({ data: format(new Date(), 'yyyy-MM-dd'), peso_kg: '', observacao: '' })

  const userId = getEffectiveUserId()

  const loadData = useCallback(async () => {
    if (!userId || !id) return
    setLoading(true)
    try {
      const [animalRes, pesagensRes, aplicacoesRes, medicamentosRes, movimentosRes, profileRes] = await Promise.all([
        supabase.from('animais').select('*').eq('id', id).eq('user_id', userId).single(),
        supabase.from('pesagens').select('*').eq('animal_id', id).eq('user_id', userId).order('data', { ascending: true }),
        supabase.from('aplicacoes_sanitarias').select('*').eq('animal_id', id).eq('user_id', userId).order('data', { ascending: false }),
        supabase.from('medicamentos').select('*').eq('user_id', userId),
        supabase.from('movimentacoes_gado').select('*').eq('animal_id', id).eq('user_id', userId).order('data', { ascending: false }),
        supabase.from('profiles').select('rendimento_carcaca, valor_arroba').eq('user_id', userId).single(),
      ])

      const a = animalRes.data as Animal | null
      setAnimal(a)
      setPesagens(pesagensRes.data ?? [])
      setAplicacoes(aplicacoesRes.data ?? [])
      setMedicamentos(medicamentosRes.data ?? [])
      setMovimentos(movimentosRes.data ?? [])
      setProfile(profileRes.data)

      if (a?.pasto_id) {
        const { data: pastoData } = await supabase.from('pastos').select('*').eq('id', a.pasto_id).single()
        setPasto(pastoData)
      }
      if (a?.raca_id) {
        const { data: racaData } = await supabase.from('racas').select('*').eq('id', a.raca_id).single()
        setRaca(racaData)
      }
    } finally {
      setLoading(false)
    }
  }, [userId, id])

  useEffect(() => { loadData() }, [loadData])

  async function handleSavePesagem() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está em modo de impersonação.' })
      return
    }
    if (!pesagemForm.data || !pesagemForm.peso_kg) {
      toast.error('Campos obrigatórios', { description: 'Preencha data e peso.' })
      return
    }
    setSavingPesagem(true)
    try {
      const uid = session!.user.id
      const peso = parseFloat(pesagemForm.peso_kg)
      await supabase.from('pesagens').insert({
        user_id: uid,
        animal_id: id,
        data: pesagemForm.data,
        peso_kg: peso,
        observacao: pesagemForm.observacao || null,
      })

      const allPesagens = [...pesagens, { data: pesagemForm.data, peso_kg: peso } as Pesagem].sort(
        (a, b) => a.data.localeCompare(b.data)
      )
      const latest = allPesagens[allPesagens.length - 1]
      if (latest.data === pesagemForm.data) {
        await supabase.from('animais').update({ peso_atual: peso }).eq('id', id)
      }

      toast.success('Pesagem registrada!')
      setPesagemOpen(false)
      setPesagemForm({ data: format(new Date(), 'yyyy-MM-dd'), peso_kg: '', observacao: '' })
      loadData()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally {
      setSavingPesagem(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!animal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-t3">Animal não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/gado/animais')}>Voltar</Button>
      </div>
    )
  }

  const idadeMeses = animal.data_nascimento
    ? differenceInMonths(new Date(), parseISO(animal.data_nascimento))
    : null

  const idadeTexto = idadeMeses !== null
    ? idadeMeses >= 12
      ? `${Math.floor(idadeMeses / 12)} ano(s) e ${idadeMeses % 12} mês(es)`
      : `${idadeMeses} mês(es)`
    : '—'

  const arroba = animal.peso_atual && profile
    ? animal.peso_atual * profile.rendimento_carcaca / 100 / 15
    : null

  const valorEst = animal.peso_atual && profile
    ? animal.peso_atual * profile.rendimento_carcaca / 100 / 15 * profile.valor_arroba
    : null

  const recentlyUpdated = animal.categoria_atualizada_em
    ? differenceInDays(new Date(), parseISO(animal.categoria_atualizada_em)) <= 7
    : false

  const medMap = new Map(medicamentos.map(m => [m.id, m]))

  const chartData = pesagens.map(p => ({
    data: format(parseISO(p.data), 'dd/MM', { locale: ptBR }),
    peso: p.peso_kg,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/gado/animais')} className="gap-1.5 text-t3">
          <ArrowLeft size={14} />
          Animais
        </Button>
      </div>

      {/* Header */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-elev-1 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-t1 tabular-nums">{animal.brinco}</h1>
              <Badge className={`${CATEGORIA_COLORS[animal.categoria] ?? ''} border-0 capitalize`}>{animal.categoria}</Badge>
              <Badge className={animal.sexo === 'macho' ? 'bg-blue-100 text-blue-700 border-0' : 'bg-pink-100 text-pink-700 border-0'}>
                {animal.sexo === 'macho' ? 'Macho' : 'Fêmea'}
              </Badge>
              <Badge className={
                animal.status === 'ativo' ? 'bg-green-100 text-green-700 border-0'
                : animal.status === 'vendido' ? 'bg-blue-100 text-blue-700 border-0'
                : 'bg-red-100 text-red-700 border-0'
              }>
                {animal.status}
              </Badge>
              {recentlyUpdated && (
                <Badge className="bg-[var(--primary-bg)] text-[var(--primary-dark)] border-0 text-xs">Reclassificado</Badge>
              )}
            </div>
            {raca && <p className="text-sm text-t3 mt-1">{raca.nome}</p>}
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setPesagemOpen(true)}>
            <Weight size={13} />
            Registrar Pesagem
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-[var(--border)]">
          <InfoItem label="Raça" value={raca?.nome ?? '—'} />
          <InfoItem label="Cor" value={animal.cor ?? '—'} />
          <InfoItem label="Data de Nascimento" value={animal.data_nascimento ? formatDate(animal.data_nascimento) : '—'} />
          <InfoItem label="Idade" value={idadeTexto} />
          <InfoItem label="Data de Entrada" value={animal.data_entrada ? formatDate(animal.data_entrada) : '—'} />
          <InfoItem label="Origem" value={animal.origem === 'nascido' ? 'Nascido na fazenda' : animal.origem === 'comprado' ? 'Comprado' : '—'} />
          <InfoItem label="Brinco do Pai" value={animal.pai_brinco ?? '—'} />
          <InfoItem label="Brinco da Mãe" value={animal.mae_brinco ?? '—'} />
          <InfoItem label="Pasto" value={pasto?.nome ?? '—'} />
          {animal.observacoes && (
            <div className="sm:col-span-2">
              <InfoItem label="Observações" value={animal.observacoes} />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Peso Atual" value={animal.peso_atual ? `${formatNumber(animal.peso_atual, 0)} kg` : '—'} />
        <StatCard label="Peso em Arrobas" value={arroba ? `${formatNumber(arroba, 1)} @` : '—'} />
        <StatCard label="Valor Estimado" value={valorEst ? formatCurrency(valorEst) : '—'} highlight />
      </div>

      {/* Weight chart */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-elev-1 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-t1">Evolução de Peso</h2>
          <span className="text-xs text-t3">{pesagens.length} pesagem(ns)</span>
        </div>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: 'var(--text-t3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-t3)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(v: number) => [`${v} kg`, 'Peso']}
              />
              <Line
                type="monotone"
                dataKey="peso"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--primary)' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-t3">
            {chartData.length === 0 ? 'Nenhuma pesagem registrada' : 'Adicione mais pesagens para ver o gráfico'}
          </div>
        )}
      </div>

      {/* Health history */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-elev-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-t1">Histórico Sanitário</h2>
          <span className="text-xs text-t3">{aplicacoes.length} aplicação(ões)</span>
        </div>
        {aplicacoes.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-t3">Nenhuma aplicação registrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Data', 'Medicamento', 'Dose', 'Próxima Dose', 'Observação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-t3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aplicacoes.map((ap, i) => {
                  const med = medMap.get(ap.medicamento_id)
                  return (
                    <tr key={ap.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-4 py-3 text-t2">{formatDate(ap.data)}</td>
                      <td className="px-4 py-3 font-medium text-t1">{med?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-t2">{ap.dose ?? '—'}</td>
                      <td className="px-4 py-3 text-t2">{ap.proxima_dose ? formatDate(ap.proxima_dose) : '—'}</td>
                      <td className="px-4 py-3 text-t3 text-xs">{ap.observacao ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement history */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-elev-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-t1">Histórico de Movimentações</h2>
          <span className="text-xs text-t3">{movimentos.length} registro(s)</span>
        </div>
        {movimentos.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-t3">Nenhuma movimentação registrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Data', 'Tipo', 'Quantidade', 'Peso', 'Valor Total', 'Observação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-t3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimentos.map((m, i) => (
                  <tr key={m.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="px-4 py-3 text-t2">{formatDate(m.data)}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${TIPO_MOV_COLORS[m.tipo] ?? 'bg-gray-100 text-gray-700'} border-0 text-xs capitalize`}>{m.tipo}</Badge>
                    </td>
                    <td className="px-4 py-3 text-t2 tabular-nums">{m.quantidade}</td>
                    <td className="px-4 py-3 text-t2 tabular-nums">{m.peso_kg ? `${formatNumber(m.peso_kg, 0)} kg` : '—'}</td>
                    <td className="px-4 py-3 text-t2 tabular-nums">{m.valor_total ? formatCurrency(m.valor_total) : '—'}</td>
                    <td className="px-4 py-3 text-t3 text-xs">{m.observacao ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pesagem Dialog */}
      <Dialog open={pesagemOpen} onOpenChange={setPesagemOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pesagem — {animal.brinco}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input type="date" value={pesagemForm.data} onChange={e => setPesagemForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Peso (kg) *</Label>
              <Input type="number" value={pesagemForm.peso_kg} onChange={e => setPesagemForm(f => ({ ...f, peso_kg: e.target.value }))} placeholder="0.0" />
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input value={pesagemForm.observacao} onChange={e => setPesagemForm(f => ({ ...f, observacao: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPesagemOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePesagem} disabled={savingPesagem}>
              {savingPesagem ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-t3 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-t1">{value}</p>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-elev-1 p-4">
      <p className="text-xs text-t3 mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${highlight ? 'text-[var(--primary-dark)]' : 'text-t1'}`}>{value}</p>
    </div>
  )
}
