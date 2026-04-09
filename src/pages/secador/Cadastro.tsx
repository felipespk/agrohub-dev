import { useEffect, useState, useCallback } from 'react'
import {
  Wheat, Users, Store, ChevronDown, ChevronRight, Plus, Pencil, Trash2, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

interface TipoGrao { id: string; nome: string; user_id: string }
interface VariedadeGrao { id: string; tipo_grao_id: string; nome: string }
interface Produtor { id: string; nome: string; cpf_cnpj: string | null; telefone: string | null; email: string | null; endereco: string | null }
interface Comprador { id: string; nome: string; cpf_cnpj: string | null; telefone: string | null }

function useGuard() {
  const { session } = useAuth()
  const { isImpersonating } = useImpersonation()
  function guard() {
    if (isImpersonating) {
      toast.error('Ação bloqueada', { description: 'Você está no modo impersonação.' })
      return false
    }
    return true
  }
  return { guard, session }
}

// ── Tipos de Grão + Variedades ──────────────────────────────────────────────

function TiposTab({ userId, writeId }: { userId: string; writeId: string }) {
  const { guard, session } = useGuard()

  const [tipos, setTipos] = useState<TipoGrao[]>([])
  const [variedades, setVariedades] = useState<VariedadeGrao[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [newTipoNome, setNewTipoNome] = useState('')
  const [newVarNomes, setNewVarNomes] = useState<Record<string, string>>({})
  const [savingTipo, setSavingTipo] = useState(false)
  const [savingVar, setSavingVar] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [tRes, vRes] = await Promise.all([
      supabase.from('tipos_grao').select('*').eq('user_id', userId).order('nome'),
      supabase.from('variedades_grao').select('*').eq('user_id', userId).order('nome'),
    ])
    setTipos(tRes.data ?? [])
    setVariedades(vRes.data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  async function addTipo() {
    if (!guard()) return
    if (!newTipoNome.trim()) return
    setSavingTipo(true)
    const { error } = await supabase.from('tipos_grao').insert({ user_id: writeId, nome: newTipoNome.trim() })
    setSavingTipo(false)
    if (error) { toast.error('Erro', { description: error.message }); return }
    setNewTipoNome('')
    load()
  }

  async function deleteTipo(id: string) {
    if (!guard()) return
    const hasRec = await supabase.from('recebimentos').select('id').eq('tipo_grao_id', id).eq('user_id', userId).limit(1)
    if ((hasRec.data?.length ?? 0) > 0) {
      toast.error('Não é possível excluir', { description: 'Este tipo de grão possui recebimentos vinculados.' })
      return
    }
    await supabase.from('variedades_grao').delete().eq('tipo_grao_id', id).eq('user_id', userId)
    await supabase.from('tipos_grao').delete().eq('id', id).eq('user_id', userId)
    load()
  }

  async function addVariedade(tipoId: string) {
    if (!guard()) return
    const nome = newVarNomes[tipoId]?.trim()
    if (!nome) return
    setSavingVar(tipoId)
    const { error } = await supabase.from('variedades_grao').insert({ user_id: writeId, tipo_grao_id: tipoId, nome })
    setSavingVar(null)
    if (error) { toast.error('Erro', { description: error.message }); return }
    setNewVarNomes(m => ({ ...m, [tipoId]: '' }))
    load()
  }

  async function deleteVariedade(id: string) {
    if (!guard()) return
    await supabase.from('variedades_grao').delete().eq('id', id).eq('user_id', userId)
    load()
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Nome do tipo de grão (ex: Soja)" value={newTipoNome} onChange={e => setNewTipoNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTipo()} className="h-8 text-xs" />
        <Button size="sm" onClick={addTipo} disabled={savingTipo || !newTipoNome.trim()} className="gap-1">
          <Plus size={13} />
          Adicionar
        </Button>
      </div>

      {tipos.length === 0 ? (
        <div className="py-8 text-center text-t3 text-sm">Nenhum tipo de grão cadastrado</div>
      ) : (
        <div className="space-y-2">
          {tipos.map(t => {
            const vars = variedades.filter(v => v.tipo_grao_id === t.id)
            const isOpen = expanded === t.id
            return (
              <div key={t.id} className="rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--surface)] hover:bg-[var(--surface-raised)] cursor-pointer transition-colors" onClick={() => setExpanded(isOpen ? null : t.id)}>
                  {isOpen ? <ChevronDown size={14} className="text-t3" /> : <ChevronRight size={14} className="text-t3" />}
                  <span className="flex-1 text-sm font-medium text-t1">{t.nome}</span>
                  <span className="text-xs text-t3">{vars.length} variedade{vars.length !== 1 ? 's' : ''}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-t3 hover:text-red-500" onClick={e => { e.stopPropagation(); deleteTipo(t.id) }}>
                    <Trash2 size={12} />
                  </Button>
                </div>
                {isOpen && (
                  <div className="px-3 pb-3 bg-[var(--surface-raised)] space-y-2">
                    <div className="flex gap-2 mt-2">
                      <Input
                        className="h-7 text-xs"
                        placeholder="Nova variedade..."
                        value={newVarNomes[t.id] ?? ''}
                        onChange={e => setNewVarNomes(m => ({ ...m, [t.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addVariedade(t.id)}
                      />
                      <Button size="sm" className="h-7 text-xs" onClick={() => addVariedade(t.id)} disabled={savingVar === t.id || !newVarNomes[t.id]?.trim()}>
                        <Plus size={11} />
                      </Button>
                    </div>
                    {vars.length === 0 ? (
                      <p className="text-xs text-t4 text-center py-1">Nenhuma variedade</p>
                    ) : (
                      vars.map(v => (
                        <div key={v.id} className="flex items-center justify-between px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] text-xs">
                          <span className="text-t1">{v.nome}</span>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-t3 hover:text-red-500" onClick={() => deleteVariedade(v.id)}>
                            <X size={10} />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Produtores ───────────────────────────────────────────────────────────────

const EMPTY_PROD = { nome: '', cpf_cnpj: '', telefone: '', email: '', endereco: '' }

function ProdutoresTab({ userId, writeId }: { userId: string; writeId: string }) {
  const { guard } = useGuard()

  const [rows, setRows] = useState<Produtor[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Produtor | null>(null)
  const [form, setForm] = useState(EMPTY_PROD)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('produtores').select('*').eq('user_id', userId).order('nome')
    setRows(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  function openNew() { setEditing(null); setForm(EMPTY_PROD); setOpen(true) }
  function openEdit(p: Produtor) {
    setEditing(p)
    setForm({ nome: p.nome, cpf_cnpj: p.cpf_cnpj ?? '', telefone: p.telefone ?? '', email: p.email ?? '', endereco: p.endereco ?? '' })
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!guard()) return
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    const payload = { nome: form.nome.trim(), cpf_cnpj: form.cpf_cnpj || null, telefone: form.telefone || null, email: form.email || null, endereco: form.endereco || null }
    if (editing) {
      await supabase.from('produtores').update(payload).eq('id', editing.id).eq('user_id', userId)
    } else {
      await supabase.from('produtores').insert({ ...payload, user_id: writeId })
    }
    setSaving(false)
    setOpen(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!guard()) return
    await supabase.from('produtores').delete().eq('id', id).eq('user_id', userId)
    load()
  }

  function setField(k: keyof typeof EMPTY_PROD, v: string) { setForm(f => ({ ...f, [k]: v })) }

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew} className="gap-1"><Plus size={13} />Novo Produtor</Button>
      </div>
      {rows.length === 0 ? (
        <div className="py-8 text-center text-t3 text-sm">Nenhum produtor cadastrado</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
              <th className="text-left py-2 px-3">Nome</th>
              <th className="text-left py-2 px-3">CPF/CNPJ</th>
              <th className="text-left py-2 px-3">Telefone</th>
              <th className="text-left py-2 px-3">Email</th>
              <th className="py-2 px-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                <td className="py-2.5 px-3 font-medium text-t1">{p.nome}</td>
                <td className="py-2.5 px-3 text-t2">{p.cpf_cnpj ?? '—'}</td>
                <td className="py-2.5 px-3 text-t2">{p.telefone ?? '—'}</td>
                <td className="py-2.5 px-3 text-t2">{p.email ?? '—'}</td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(p)}><Pencil size={12} /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(p.id)}><Trash2 size={12} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Produtor' : 'Novo Produtor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.nome} onChange={e => setField('nome', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPF / CNPJ</Label>
                <Input value={form.cpf_cnpj} onChange={e => setField('cpf_cnpj', e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input value={form.telefone} onChange={e => setField('telefone', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Endereço</Label>
                <Input value={form.endereco} onChange={e => setField('endereco', e.target.value)} placeholder="Rua, nº, cidade" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Compradores ─────────────────────────────────────────────────────────────

const EMPTY_COMP = { nome: '', cpf_cnpj: '', telefone: '' }

function CompradoresTab({ userId, writeId }: { userId: string; writeId: string }) {
  const { guard } = useGuard()

  const [rows, setRows] = useState<Comprador[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Comprador | null>(null)
  const [form, setForm] = useState(EMPTY_COMP)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('compradores').select('*').eq('user_id', userId).order('nome')
    setRows(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  function openNew() { setEditing(null); setForm(EMPTY_COMP); setOpen(true) }
  function openEdit(c: Comprador) {
    setEditing(c)
    setForm({ nome: c.nome, cpf_cnpj: c.cpf_cnpj ?? '', telefone: c.telefone ?? '' })
    setOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!guard()) return
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    const payload = { nome: form.nome.trim(), cpf_cnpj: form.cpf_cnpj || null, telefone: form.telefone || null }
    if (editing) {
      await supabase.from('compradores').update(payload).eq('id', editing.id).eq('user_id', userId)
    } else {
      await supabase.from('compradores').insert({ ...payload, user_id: writeId })
    }
    setSaving(false)
    setOpen(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!guard()) return
    await supabase.from('compradores').delete().eq('id', id).eq('user_id', userId)
    load()
  }

  function setField(k: keyof typeof EMPTY_COMP, v: string) { setForm(f => ({ ...f, [k]: v })) }

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew} className="gap-1"><Plus size={13} />Novo Comprador</Button>
      </div>
      {rows.length === 0 ? (
        <div className="py-8 text-center text-t3 text-sm">Nenhum comprador cadastrado</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-t3 text-xs font-medium border-b border-[var(--border)]">
              <th className="text-left py-2 px-3">Nome</th>
              <th className="text-left py-2 px-3">CPF/CNPJ</th>
              <th className="text-left py-2 px-3">Telefone</th>
              <th className="py-2 px-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors">
                <td className="py-2.5 px-3 font-medium text-t1">{c.nome}</td>
                <td className="py-2.5 px-3 text-t2">{c.cpf_cnpj ?? '—'}</td>
                <td className="py-2.5 px-3 text-t2">{c.telefone ?? '—'}</td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}><Pencil size={12} /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(c.id)}><Trash2 size={12} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Comprador' : 'Novo Comprador'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.nome} onChange={e => setField('nome', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CPF / CNPJ</Label>
              <Input value={form.cpf_cnpj} onChange={e => setField('cpf_cnpj', e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input value={form.telefone} onChange={e => setField('telefone', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function Cadastro() {
  const { session } = useAuth()
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId() ?? session?.user?.id ?? ''
  const writeId = session?.user?.id ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-t1">Cadastros · Secador / Silo</h1>
        <p className="text-sm text-t3">Gerencie tipos de grão, variedades, produtores e compradores</p>
      </div>

      <Card className="shadow-elev-1">
        <CardContent className="pt-4">
          <Tabs defaultValue="tipos">
            <TabsList className="mb-5">
              <TabsTrigger value="tipos" className="gap-1.5">
                <Wheat size={13} />
                Tipos de Grão
              </TabsTrigger>
              <TabsTrigger value="produtores" className="gap-1.5">
                <Users size={13} />
                Produtores
              </TabsTrigger>
              <TabsTrigger value="compradores" className="gap-1.5">
                <Store size={13} />
                Compradores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tipos">
              <TiposTab userId={userId} writeId={writeId} />
            </TabsContent>
            <TabsContent value="produtores">
              <ProdutoresTab userId={userId} writeId={writeId} />
            </TabsContent>
            <TabsContent value="compradores">
              <CompradoresTab userId={userId} writeId={writeId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
