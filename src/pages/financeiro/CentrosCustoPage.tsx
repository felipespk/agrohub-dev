import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CentrosCustoPage() {
  const { centrosCusto, contasPR, lancamentos, reload } = useFinanceiro();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", cor: "#16A34A", icone: "circle" });

  const openNew = () => { setEditItem(null); setForm({ nome: "", cor: "#16A34A", icone: "circle" }); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ nome: item.nome, cor: item.cor || "#16A34A", icone: item.icone || "circle" }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    if (editItem) {
      await supabase.from("centros_custo").update({ nome: form.nome, cor: form.cor, icone: form.icone }).eq("id", editItem.id);
    } else {
      await supabase.from("centros_custo").insert({ nome: form.nome, cor: form.cor, icone: form.icone, user_id: user!.id });
    }
    setSaving(false);
    setModalOpen(false);
    toast.success(editItem ? "Atualizado!" : "Criado!");
    reload();
  };

  const toggleAtivo = async (item: any) => {
    await supabase.from("centros_custo").update({ ativo: !item.ativo }).eq("id", item.id);
    toast.success(item.ativo ? "Desativado!" : "Ativado!");
    reload();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Centros de Custo</h1>
          <p className="page-subtitle">Organize seus gastos por atividade</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Centro</Button>
      </div>

      <div className="form-section">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs uppercase tracking-wider w-10">Cor</TableHead>
            <TableHead className="text-xs uppercase tracking-wider">Nome</TableHead>
            <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {centrosCusto.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum centro de custo.</TableCell></TableRow>
            ) : centrosCusto.map(c => (
              <TableRow key={c.id} className="hover:bg-muted/50">
                <TableCell><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.cor || "#6B7280" }} /></TableCell>
                <TableCell className="text-sm font-medium">{c.nome}</TableCell>
                <TableCell><Badge variant={c.ativo ? "default" : "secondary"} className="text-[10px]">{c.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => toggleAtivo(c)}>{c.ativo ? "Desativar" : "Ativar"}</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
