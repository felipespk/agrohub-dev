import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from "lucide-react";
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
  const [form, setForm] = useState({ nome: "", tipo: "despesa", pai_id: "", cor: "#6B7280" });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const pais = categorias.filter(c => !c.pai_id);
  const filhos = (paiId: string) => categorias.filter(c => c.pai_id === paiId);

  const openNew = () => { setEditItem(null); setForm({ nome: "", tipo: "despesa", pai_id: "", cor: "#6B7280" }); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ nome: item.nome, tipo: item.tipo, pai_id: item.pai_id || "", cor: item.cor || "#6B7280" }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    const pai = form.pai_id ? categorias.find(c => c.id === form.pai_id) : null;
    const tipo = pai ? pai.tipo : form.tipo;
    const payload = { nome: form.nome, tipo, pai_id: form.pai_id || null, cor: form.cor, user_id: user!.id };
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

  const toggleCollapse = (id: string) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Categorias</h1><p className="text-sm text-muted-foreground mt-1">Organize receitas e despesas por categoria</p></div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Categoria</Button>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="space-y-0.5">
          {pais.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma categoria cadastrada.</p>}
          {pais.map(p => {
            const tb = tipoBadgeConfig[p.tipo] || tipoBadgeConfig.despesa;
            const children = filhos(p.id);
            const isCollapsed = collapsed[p.id];
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/30 group">
                  <div className="flex items-center gap-2.5">
                    {children.length > 0 ? (
                      <button onClick={() => toggleCollapse(p.id)} className="p-0.5">
                        {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    ) : <span className="w-5" />}
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.cor || "#6B7280" }} />
                    <span className="text-sm font-semibold text-foreground">{p.nome}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tb.bg} ${tb.text}`}>{tb.label}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button>
                  </div>
                </div>
                {!isCollapsed && children.map(ch => {
                  const ctb = tipoBadgeConfig[ch.tipo] || tipoBadgeConfig.despesa;
                  return (
                    <div key={ch.id} className="flex items-center justify-between py-2.5 px-3 pl-14 rounded-lg hover:bg-muted/30 group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.cor || "#6B7280" }} />
                        <span className="text-sm text-foreground">{ch.nome}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${ctb.bg} ${ctb.text}`}>{ctb.label}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(ch)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(ch.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /></button>
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
              <Select value={form.pai_id || "__none__"} onValueChange={v => setForm(f => ({ ...f, pai_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Nenhuma (raiz)</SelectItem>{pais.filter(p => p.id !== editItem?.id).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo {form.pai_id ? "(herdado do pai)" : ""}</Label>
              <Select value={form.pai_id ? (categorias.find(c => c.id === form.pai_id)?.tipo || form.tipo) : form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))} disabled={!!form.pai_id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem><SelectItem value="investimento">Investimento</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} className="h-10" /></div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
