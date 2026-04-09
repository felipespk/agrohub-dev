import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { useFinanceiro, ContatoFinanceiro } from '@/contexts/FinanceiroContext'
import { toast } from 'sonner'
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
import { Loader2, Plus, Pencil, Trash2, Search, X, Users } from 'lucide-react'

const tipoColors: Record<string, string> = {
  fornecedor: 'bg-amber-50 text-amber-600 border-amber-100',
  cliente:    'bg-emerald-50 text-emerald-600 border-emerald-100',
  ambos:      'bg-blue-50 text-blue-600 border-blue-100',
}
const tipoLabels: Record<string, string> = {
  fornecedor: 'Fornecedor', cliente: 'Cliente', ambos: 'Ambos',
}

const EMPTY_FORM = {
  nome: '', tipo: 'fornecedor' as ContatoFinanceiro['tipo'],
  cpf_cnpj: '', telefone: '', email: '', endereco: '',
}

export function Contatos() {
  const { getEffectiveUserId } = useImpersonation()
  const userId = getEffectiveUserId()
  const { contatos, loading, reload } = useFinanceiro()

  const [search, setSearch]           = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<ContatoFinanceiro | null>(null)
  const [form, setForm]               = useState({ ...EMPTY_FORM })
  const [saving, setSaving]           = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ContatoFinanceiro | null>(null)
  const [deleting, setDeleting]       = useState(false)

  const filtered = contatos.filter(c =>
    !search || c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf_cnpj ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setEditing(null); setForm({ ...EMPTY_FORM }); setShowModal(true)
  }

  function openEdit(c: ContatoFinanceiro) {
    setEditing(c)
    setForm({
      nome: c.nome, tipo: c.tipo,
      cpf_cnpj: c.cpf_cnpj ?? '', telefone: c.telefone ?? '',
      email: c.email ?? '', endereco: c.endereco ?? '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast.error('Nome obrigatório'); return
    }
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        nome: form.nome.trim(), tipo: form.tipo,
        cpf_cnpj: form.cpf_cnpj.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        endereco: form.endereco.trim() || null,
      }
      if (editing) {
        const { error } = await supabase.from('contatos_financeiros').update(payload).eq('id', editing.id)
        if (error) throw error
        toast.success('Contato atualizado.')
      } else {
        const { error } = await supabase.from('contatos_financeiros').insert(payload)
        if (error) throw error
        toast.success('Contato criado.')
      }
      setShowModal(false); reload()
    } catch (e: unknown) {
      toast.error('Erro ao salvar', { description: (e as Error).message })
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('contatos_financeiros').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Contato excluído.'); setDeleteTarget(null); reload()
    } catch (e: unknown) {
      toast.error('Erro ao excluir', { description: (e as Error).message })
    } finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="space-y-5">
      <div className="flex justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-32" /></div>
      <Skeleton className="h-10 rounded-xl" /><Skeleton className="h-64 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-heading-lg text-t1">Contatos</h1>
          <p className="text-sm text-t3 mt-0.5">{contatos.length} contato(s) cadastrado(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus size={15} /> Novo Contato</Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
          <Input className="pl-9 h-9 text-sm" placeholder="Buscar por nome, CPF/CNPJ ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {search && (
          <Button variant="ghost" size="sm" className="h-9 gap-1 text-t3" onClick={() => setSearch('')}><X size={13} /> Limpar</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users size={32} className="text-t3 mx-auto mb-3" />
              <p className="text-t3 text-sm">Nenhum contato encontrado.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={openCreate}><Plus size={13} className="mr-1" /> Criar primeiro contato</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Nome</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Tipo</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">CPF/CNPJ</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">Telefone</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-t3 uppercase tracking-wider">E-mail</th>
                    <th className="py-3 px-4 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-raised)] transition-colors duration-100">
                      <td className="py-3 px-4 font-medium text-t1">{c.nome}</td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs border ${tipoColors[c.tipo]}`}>{tipoLabels[c.tipo]}</Badge>
                      </td>
                      <td className="py-3 px-4 text-t2">{c.cpf_cnpj ?? '—'}</td>
                      <td className="py-3 px-4 text-t2">{c.telefone ?? '—'}</td>
                      <td className="py-3 px-4 text-t2">{c.email ?? '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}><Pencil size={12} /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleteTarget(c)}><Trash2 size={12} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Contato' : 'Novo Contato'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome *</Label>
                <Input placeholder="Nome completo ou razão social" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as typeof form.tipo }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CPF / CNPJ</Label>
                <Input placeholder="000.000.000-00" value={form.cpf_cnpj} onChange={e => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input placeholder="(00) 90000-0000" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" placeholder="contato@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Endereço</Label>
                <textarea
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  placeholder="Endereço completo..."
                  value={form.endereco}
                  onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                />
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
          <DialogHeader><DialogTitle>Excluir Contato</DialogTitle></DialogHeader>
          <p className="text-sm text-t2 py-2">Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>?</p>
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
