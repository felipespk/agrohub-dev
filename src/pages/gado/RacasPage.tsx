import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export default function RacasPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [racas, setRacas] = useState<any[]>([]);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [r, a] = await Promise.all([
      supabase.from("racas" as any).select("id, nome").eq("user_id", effectiveUserId).order("nome"),
      supabase.from("animais" as any).select("raca_id").eq("user_id", effectiveUserId).eq("status", "ativo"),
    ]);
    setRacas((r.data as any) || []);
    const counts: Record<string, number> = {};
    ((a.data as any) || []).forEach((an: any) => { if (an.raca_id) counts[an.raca_id] = (counts[an.raca_id] || 0) + 1; });
    setContagens(counts);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user || !nome.trim()) return;
    if (editId) {
      await supabase.from("racas" as any).update({ nome: nome.trim() } as any).eq("id", editId);
      toast.success("Raça atualizada!");
    } else {
      await supabase.from("racas" as any).insert({ nome: nome.trim(), user_id: user.id } as any);
      toast.success("Raça cadastrada!");
    }
    setOpen(false); setEditId(null); setNome(""); fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (contagens[id] > 0) { toast.error("Não é possível excluir raça com animais vinculados."); return; }
    if (!confirm("Excluir esta raça?")) return;
    await supabase.from("racas" as any).delete().eq("id", id);
    toast.success("Raça removida."); fetchAll();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Raças</h1>
        <Button onClick={() => { setEditId(null); setNome(""); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Raça</Button>
      </div>

      <Card className="border-[#E5E7EB]"><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Nome</th><th className="px-4 py-3">Animais</th><th className="px-4 py-3">Ações</th>
          </tr></thead>
          <tbody>
            {racas.map((r: any) => (
              <tr key={r.id} className="border-b hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-medium flex items-center gap-2"><Tag className="h-4 w-4 text-primary" />{r.nome}</td>
                <td className="px-4 py-3">{contagens[r.id] || 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(r.id); setNome(r.nome); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {racas.length === 0 && <tr><td colSpan={3} className="text-center py-12 text-muted-foreground">Nenhuma raça cadastrada</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? "Editar Raça" : "Nova Raça"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSave()} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
