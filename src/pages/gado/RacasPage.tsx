import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag, Star, X } from "lucide-react";
import { toast } from "sonner";

interface Cor { id?: string; nome: string; principal: boolean; _new?: boolean; _deleted?: boolean; }

export default function RacasPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [racas, setRacas] = useState<any[]>([]);
  const [coresPorRaca, setCoresPorRaca] = useState<Record<string, Cor[]>>({});
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [cores, setCores] = useState<Cor[]>([]);
  const [novaCor, setNovaCor] = useState("");

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [r, a, c] = await Promise.all([
      supabase.from("racas" as any).select("id, nome").eq("user_id", effectiveUserId).order("nome"),
      supabase.from("animais" as any).select("raca_id").eq("user_id", effectiveUserId).eq("status", "ativo"),
      supabase.from("racas_cores" as any).select("id, raca_id, nome, principal").eq("user_id", effectiveUserId).order("nome"),
    ]);
    setRacas((r.data as any) || []);
    const counts: Record<string, number> = {};
    ((a.data as any) || []).forEach((an: any) => { if (an.raca_id) counts[an.raca_id] = (counts[an.raca_id] || 0) + 1; });
    setContagens(counts);
    const corsMap: Record<string, Cor[]> = {};
    ((c.data as any) || []).forEach((co: any) => {
      if (!corsMap[co.raca_id]) corsMap[co.raca_id] = [];
      corsMap[co.raca_id].push({ id: co.id, nome: co.nome, principal: co.principal });
    });
    setCoresPorRaca(corsMap);
  }, [user, effectiveUserId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openNova = () => {
    setEditId(null); setNome(""); setCores([]); setNovaCor(""); setOpen(true);
  };

  const openEdit = (r: any) => {
    setEditId(r.id); setNome(r.nome);
    setCores((coresPorRaca[r.id] || []).map(c => ({ ...c })));
    setNovaCor(""); setOpen(true);
  };

  const addCor = () => {
    const n = novaCor.trim();
    if (!n) return;
    if (cores.some(c => !c._deleted && c.nome.toLowerCase() === n.toLowerCase())) {
      toast.error("Cor já adicionada"); return;
    }
    const ehPrimeira = cores.filter(c => !c._deleted).length === 0;
    setCores([...cores, { nome: n, principal: ehPrimeira, _new: true }]);
    setNovaCor("");
  };

  const removeCor = (idx: number) => {
    const c = cores[idx];
    if (c._new) {
      const novas = cores.filter((_, i) => i !== idx);
      // se removeu a principal, marcar a primeira restante como principal
      if (c.principal && novas.some(x => !x._deleted)) {
        const firstIdx = novas.findIndex(x => !x._deleted);
        if (firstIdx >= 0) novas[firstIdx].principal = true;
      }
      setCores(novas);
    } else {
      const novas = [...cores];
      novas[idx] = { ...novas[idx], _deleted: true, principal: false };
      // se era principal, marcar primeira restante
      if (c.principal) {
        const firstIdx = novas.findIndex(x => !x._deleted);
        if (firstIdx >= 0) novas[firstIdx].principal = true;
      }
      setCores(novas);
    }
  };

  const setPrincipal = (idx: number) => {
    setCores(cores.map((c, i) => ({ ...c, principal: i === idx })));
  };

  const handleSave = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user || !nome.trim()) return;

    let racaId = editId;
    if (editId) {
      await supabase.from("racas" as any).update({ nome: nome.trim() } as any).eq("id", editId);
    } else {
      const { data, error } = await supabase.from("racas" as any).insert({ nome: nome.trim(), user_id: user.id } as any).select("id").single();
      if (error || !data) { toast.error("Erro ao cadastrar raça"); return; }
      racaId = (data as any).id;
    }

    // sincronizar cores
    const ativas = cores.filter(c => !c._deleted);
    const temPrincipal = ativas.some(c => c.principal);
    if (ativas.length > 0 && !temPrincipal) ativas[0].principal = true;

    for (const c of cores) {
      if (c._deleted && c.id) {
        await supabase.from("racas_cores" as any).delete().eq("id", c.id);
      } else if (c._new && !c._deleted) {
        await supabase.from("racas_cores" as any).insert({ raca_id: racaId, user_id: user.id, nome: c.nome, principal: c.principal } as any);
      } else if (c.id && !c._deleted) {
        await supabase.from("racas_cores" as any).update({ nome: c.nome, principal: c.principal } as any).eq("id", c.id);
      }
    }

    toast.success(editId ? "Raça atualizada!" : "Raça cadastrada!");
    setOpen(false); setEditId(null); setNome(""); setCores([]); fetchAll();
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
        <Button onClick={openNova} className="gap-2"><Plus className="h-4 w-4" /> Nova Raça</Button>
      </div>

      <Card className="border-[#E5E7EB]"><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Cores</th>
            <th className="px-4 py-3">Animais</th>
            <th className="px-4 py-3">Ações</th>
          </tr></thead>
          <tbody>
            {racas.map((r: any) => {
              const rc = coresPorRaca[r.id] || [];
              return (
                <tr key={r.id} className="border-b hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-medium"><span className="inline-flex items-center gap-2"><Tag className="h-4 w-4 text-primary" />{r.nome}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {rc.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      {rc.map(c => (
                        <Badge key={c.id} variant={c.principal ? "default" : "secondary"} className="gap-1 text-[11px]">
                          {c.principal && <Star className="h-2.5 w-2.5 fill-current" />}{c.nome}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">{contagens[r.id] || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {racas.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Nenhuma raça cadastrada</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Editar Raça" : "Nova Raça"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Cores</Label>
              <div className="flex gap-2">
                <Input
                  value={novaCor}
                  onChange={e => setNovaCor(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCor(); } }}
                  placeholder="Ex: Branco, Preto, Malhado..."
                />
                <Button type="button" variant="outline" onClick={addCor}>Adicionar</Button>
              </div>
              <p className="text-xs text-muted-foreground">Clique na estrela para definir a cor principal (pré-selecionada nos animais).</p>
              <div className="space-y-1.5 max-h-48 overflow-auto pt-1">
                {cores.filter(c => !c._deleted).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhuma cor adicionada.</p>
                )}
                {cores.map((c, idx) => c._deleted ? null : (
                  <div key={idx} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border bg-card">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={() => setPrincipal(idx)}
                        className={`p-0.5 rounded hover:bg-accent ${c.principal ? "text-amber-500" : "text-muted-foreground"}`}
                        title={c.principal ? "Cor principal" : "Definir como principal"}
                      >
                        <Star className={`h-4 w-4 ${c.principal ? "fill-current" : ""}`} />
                      </button>
                      <span className="text-sm">{c.nome}</span>
                      {c.principal && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">principal</Badge>}
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeCor(idx)}>
                      <X className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
