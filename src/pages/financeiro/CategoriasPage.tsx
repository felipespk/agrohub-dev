import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const tipoBadge: Record<string, { variant: "default" | "destructive" | "secondary"; label: string }> = {
  receita: { variant: "default", label: "Receita" },
  despesa: { variant: "destructive", label: "Despesa" },
  investimento: { variant: "secondary", label: "Investimento" },
};

export default function CategoriasPage() {
  const { categorias, reload } = useFinanceiro();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "despesa", pai_id: "", cor: "#6B7280" });

  const pais = categorias.filter(c => !c.pai_id);

  const openNew = () => { setEditItem(null); setForm({ nome: "", tipo: "despesa", pai_id: "", cor: "#6B7280" }); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ nome: item.nome, tipo: item.tipo, pai_id: item.pai_id || "", cor: item.cor || "#6B7280" }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    const pai = form.pai_id ? categorias.find(c => c.id === form.pai_id) : null;
    const tipo = pai ? pai.tipo : form.tipo;
    const payload = { nome: form.nome, tipo, pai_id: form.pai_id || null, cor: form.cor, user_id: user!.id };
    if (editItem) {
      await supabase.from("categorias_financeiras").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("categorias_financeiras").insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    toast.success(editItem ? "Atualizada!" : "Criada!");
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta categoria?")) return;
    const { error } = await supabase.from("categorias_financeiras").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Excluída!");
    reload();
  };

  // Build hierarchical list
  const filhos = (paiId: string) => categorias.filter(c => c.pai_id === paiId);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p className="page-subtitle">Organize receitas e despesas por categoria</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Categoria</Button>
      </div>

      <div className="form-section">
        <div className="space-y-1">
          {pais.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma categoria cadastrada.</p>}
          {pais.map(p => {
            const tb = tipoBadge[p.tipo] || tipoBadge.despesa;
            const children = filhos(p.id);
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between py-2.5 px-3 rounded hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.cor || "#6B7280" }} />
                    <span className="text-sm font-medium text-foreground">{p.nome}</span>
                    <Badge variant={tb.variant} className="text-[10px]">{tb.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
                {children.map(ch => {
                  const ctb = tipoBadge[ch.tipo] || tipoBadge.despesa;
                  return (
                    <div key={ch.id} className="flex items-center justify-between py-2 px-3 pl-10 rounded hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.cor || "#6B7280" }} />
                        <span className="text-sm text-foreground">{ch.nome}</span>
                        <Badge variant={ctb.variant} className="text-[10px]">{ctb.label}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(ch)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(ch.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? "Editar" : "Nova"} Categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><Label>Categoria Pai</Label>
              <Select value={form.pai_id} onValueChange={v => setForm(f => ({ ...f, pai_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma (raiz)</SelectItem>
                  {pais.filter(p => p.id !== editItem?.id).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tipo {form.pai_id ? "(herdado do pai)" : ""}</Label>
              <Select value={form.pai_id ? (categorias.find(c => c.id === form.pai_id)?.tipo || form.tipo) : form.tipo}
                onValueChange={v => setForm(f => ({ ...f, tipo: v }))} disabled={!!form.pai_id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem><SelectItem value="investimento">Investimento</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} className="h-10" /></div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
