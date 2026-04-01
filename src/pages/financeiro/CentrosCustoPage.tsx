import { useState, useMemo } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatarMoeda } from "@/lib/format";
import { toast } from "sonner";

export default function CentrosCustoPage() {
  const { centrosCusto, lancamentos, reload } = useFinanceiro();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", cor: "#16A34A", icone: "circle" });

  const mesAtual = new Date().toISOString().slice(0, 7);

  const resumoPorCentro = useMemo(() => {
    const map: Record<string, { receitas: number; despesas: number }> = {};
    lancamentos.filter(l => l.data?.startsWith(mesAtual)).forEach(l => {
      if (!map[l.centro_custo_id]) map[l.centro_custo_id] = { receitas: 0, despesas: 0 };
      if (l.tipo === "receita") map[l.centro_custo_id].receitas += Number(l.valor);
      if (l.tipo === "despesa") map[l.centro_custo_id].despesas += Number(l.valor);
    });
    return map;
  }, [lancamentos, mesAtual]);

  const openNew = () => { setEditItem(null); setForm({ nome: "", cor: "#16A34A", icone: "circle" }); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ nome: item.nome, cor: item.cor || "#16A34A", icone: item.icone || "circle" }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    if (editItem) { await supabase.from("centros_custo").update({ nome: form.nome, cor: form.cor, icone: form.icone }).eq("id", editItem.id); }
    else { await supabase.from("centros_custo").insert({ nome: form.nome, cor: form.cor, icone: form.icone, user_id: user!.id }); }
    setSaving(false); setModalOpen(false); toast.success(editItem ? "Atualizado!" : "Criado!"); reload();
  };

  const toggleAtivo = async (item: any) => {
    await supabase.from("centros_custo").update({ ativo: !item.ativo }).eq("id", item.id);
    toast.success(item.ativo ? "Desativado!" : "Ativado!"); reload();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Centros de Custo</h1><p className="text-sm text-muted-foreground mt-1">Organize seus gastos por atividade</p></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {centrosCusto.map(c => {
          const resumo = resumoPorCentro[c.id] || { receitas: 0, despesas: 0 };
          const resultado = resumo.receitas - resumo.despesas;
          return (
            <div key={c.id} className={`bg-card rounded-lg border border-border p-5 ${!c.ativo ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: c.cor || "#6B7280" }} />
                  <div>
                    <p className="text-base font-semibold text-foreground">{c.nome}</p>
                    <Badge variant={c.ativo ? "default" : "secondary"} className="text-[10px] mt-1">{c.ativo ? "Ativo" : "Inativo"}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => toggleAtivo(c)}>{c.ativo ? "Desativar" : "Ativar"}</Button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Receitas:</span><span className="text-emerald-600 font-medium">{formatarMoeda(resumo.receitas)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Despesas:</span><span className="text-red-500 font-medium">{formatarMoeda(resumo.despesas)}</span></div>
                <div className="flex justify-between pt-1 border-t border-border"><span className="text-muted-foreground font-medium">Resultado:</span><span className={`font-bold ${resultado >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatarMoeda(resultado)}</span></div>
              </div>
            </div>
          );
        })}

        {/* New Card */}
        <button onClick={openNew} className="border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/20 transition-colors min-h-[160px]">
          <Plus className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Novo Centro de Custo</span>
        </button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editItem ? "Editar" : "Novo"} Centro de Custo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} className="h-10" /></div>
              <div><Label>Ícone (Lucide)</Label><Input value={form.icone} onChange={e => setForm(f => ({ ...f, icone: e.target.value }))} placeholder="circle" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
