import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`).replace(/(\d{3})(\d{3})(\d{0,3})/, (_, a, b, c) => c ? `${a}.${b}.${c}` : `${a}.${b}`).replace(/(\d{3})(\d{0,3})/, (_, a, b) => b ? `${a}.${b}` : a);
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d, e) => e ? `${a}.${b}.${c}/${d}-${e}` : `${a}.${b}.${c}/${d}`);
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

const tipoBadgeConfig: Record<string, { bg: string; text: string; label: string }> = {
  fornecedor: { bg: "bg-amber-50", text: "text-amber-700", label: "Fornecedor" },
  cliente: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Cliente" },
  ambos: { bg: "bg-blue-50", text: "text-blue-700", label: "Ambos" },
};

export default function ContatosPage() {
  const { contatos, reload } = useFinanceiro();
  const { user } = useAuth();
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "fornecedor", cpf_cnpj: "", telefone: "", email: "", observacao: "" });

  const filtered = useMemo(() => {
    let list = [...contatos];
    if (filtroTipo !== "todos") list = list.filter(c => c.tipo === filtroTipo);
    if (busca) list = list.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()));
    return list;
  }, [contatos, filtroTipo, busca]);

  const openNew = () => { setEditItem(null); setForm({ nome: "", tipo: "fornecedor", cpf_cnpj: "", telefone: "", email: "", observacao: "" }); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ nome: item.nome, tipo: item.tipo, cpf_cnpj: item.cpf_cnpj || "", telefone: item.telefone || "", email: item.email || "", observacao: item.observacao || "" }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    const payload = { nome: form.nome, tipo: form.tipo, cpf_cnpj: form.cpf_cnpj || null, telefone: form.telefone || null, email: form.email || null, observacao: form.observacao || null, user_id: user!.id };
    if (editItem) { await supabase.from("contatos_financeiros").update(payload).eq("id", editItem.id); }
    else { await supabase.from("contatos_financeiros").insert(payload); }
    setSaving(false); setModalOpen(false); toast.success(editItem ? "Atualizado!" : "Criado!"); reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este contato?")) return;
    const { error } = await supabase.from("contatos_financeiros").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Excluído!"); reload();
  };

  const getInitials = (name: string) => name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const getColor = (name: string) => {
    const colors = ["#16A34A", "#2563EB", "#D97706", "#8B5CF6", "#EC4899", "#0891B2"];
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Contatos</h1><p className="text-sm text-muted-foreground mt-1">Fornecedores, clientes e parceiros</p></div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Contato</Button>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-wrap gap-3 mb-5">
          <div><Label className="text-xs">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="fornecedor">Fornecedor</SelectItem><SelectItem value="cliente">Cliente</SelectItem><SelectItem value="ambos">Ambos</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Buscar</Label>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Nome do contato..." value={busca} onChange={e => setBusca(e.target.value)} /></div>
          </div>
        </div>

        <Table>
          <TableHeader><TableRow className="bg-muted/30">
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Contato</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Tipo</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">CPF/CNPJ</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Telefone</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Email</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum contato encontrado.</TableCell></TableRow>
            ) : filtered.map(c => {
              const tb = tipoBadgeConfig[c.tipo] || tipoBadgeConfig.fornecedor;
              const initials = getInitials(c.nome);
              const color = getColor(c.nome);
              return (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: color }}>{initials}</div>
                      <span className="text-sm font-medium text-foreground">{c.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${tb.bg} ${tb.text}`}>{tb.label}</span>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">{c.cpf_cnpj || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.telefone || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? "Editar" : "Novo"} Contato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><Label>Tipo *</Label><Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fornecedor">Fornecedor</SelectItem><SelectItem value="cliente">Cliente</SelectItem><SelectItem value="ambos">Ambos</SelectItem></SelectContent></Select></div>
            <div><Label>CPF/CNPJ</Label><Input value={form.cpf_cnpj} onChange={e => setForm(f => ({ ...f, cpf_cnpj: maskCpfCnpj(e.target.value) }))} placeholder="000.000.000-00" /></div>
            <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: maskTelefone(e.target.value) }))} placeholder="(00) 00000-0000" /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
