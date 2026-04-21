import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const tipoBadgeConfig: Record<string, { bg: string; text: string; label: string }> = {
  receita: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Receita" },
  despesa: { bg: "bg-red-50", text: "text-red-700", label: "Despesa" },
  investimento: { bg: "bg-blue-50", text: "text-blue-700", label: "Investimento" },
};

export default function CategoriasPage() {
  const { categorias, reload } = useFinanceiro();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "despesa" });

  const openNew = () => { setEditItem(null); setForm({ nome: "", tipo: "despesa" }); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ nome: item.nome, tipo: item.tipo }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    const payload = { nome: form.nome, tipo: form.tipo, pai_id: null, cor: "#6B7280", user_id: user!.id };
    if (editItem) { await supabase.from("categorias_financeiras").update(payload).eq("id", editItem.id); }
    else { await supabase.from("categorias_financeiras").insert(payload); }
    setSaving(false); setModalOpen(false); toast.success(editItem ? "Atualizada!" : "Criada!"); reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta categoria?")) return;
    const { error } = await supabase.from("categorias_financeiras").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Excluída!"); reload();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Categorias</h1><p className="text-sm text-muted-foreground mt-1">Organize receitas e despesas por categoria</p></div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Categoria</Button>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categorias.length === 0 && (
              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Nenhuma categoria cadastrada.</td></tr>
            )}
            {categorias.map(c => {
              const tb = tipoBadgeConfig[c.tipo] || tipoBadgeConfig.despesa;
              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 group">
                  <td className="py-3 px-4 font-semibold text-foreground">{c.nome}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tb.bg} ${tb.text}`}>{tb.label}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? "Editar" : "Nova"} Categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="investimento">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
