import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EXEMPLO_004 = [
  { data: "2022-08-05", peso_kg: 200 },
  { data: "2023-01-01", peso_kg: 265 },
  { data: "2023-06-01", peso_kg: 340 },
  { data: "2024-01-01", peso_kg: 410 },
  { data: "2024-06-01", peso_kg: 455 },
  { data: "2025-01-01", peso_kg: 485 },
  { data: "2025-06-01", peso_kg: 505 },
  { data: "2026-01-01", peso_kg: 510 },
  { data: "2026-04-01", peso_kg: 520 },
];

const EXEMPLO_005 = [
  { data: "2023-02-12", peso_kg: 35 },
  { data: "2023-06-01", peso_kg: 120 },
  { data: "2024-01-01", peso_kg: 195 },
  { data: "2024-06-01", peso_kg: 260 },
  { data: "2025-01-01", peso_kg: 300 },
  { data: "2025-06-01", peso_kg: 330 },
  { data: "2026-01-01", peso_kg: 340 },
  { data: "2026-04-01", peso_kg: 350 },
];

export default function PesagensPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [pesagens, setPesagens] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [openInd, setOpenInd] = useState(false);
  const [openLote, setOpenLote] = useState(false);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ animal_id: "", data: new Date().toISOString().split("T")[0], peso_kg: "" });
  const [formLote, setFormLote] = useState({ lote_id: "", data: new Date().toISOString().split("T")[0], peso_medio: "" });
  const [confirmCarregar, setConfirmCarregar] = useState(false);
  const [confirmLimpar, setConfirmLimpar] = useState(false);
  const [temExemplos, setTemExemplos] = useState(false);
  const [loading, setLoading] = useState(false);

  const rendimento = 52;
  const toArroba = (p: number) => (p * rendimento / 100 / 15).toFixed(2);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [p, a, l, ex] = await Promise.all([
      supabase.from("pesagens" as any).select("*, animal:animais!animal_id(brinco, categoria)").eq("user_id", effectiveUserId).order("data", { ascending: false }).limit(50),
      supabase.from("animais" as any).select("id, brinco, categoria").eq("user_id", effectiveUserId).eq("status", "ativo").order("brinco"),
      supabase.from("lotes" as any).select("id, nome").eq("user_id", effectiveUserId).order("nome"),
      supabase.from("pesagens" as any).select("id").eq("user_id", effectiveUserId).eq("observacao", "Dado de exemplo").limit(1),
    ]);
    setPesagens((p.data as any) || []);
    setAnimais((a.data as any) || []);
    setLotes((l.data as any) || []);
    setTemExemplos(((ex.data as any) || []).length > 0);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCarregarExemplos = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user) return;
    setLoading(true);
    setConfirmCarregar(false);

    const { data: a004 } = await supabase.from("animais" as any).select("id").eq("user_id", effectiveUserId).eq("brinco", "004").limit(1);
    const { data: a005 } = await supabase.from("animais" as any).select("id").eq("user_id", effectiveUserId).eq("brinco", "005").limit(1);

    if (!a004?.length || !a005?.length) {
      toast.warning("Cadastre animais com brinco 004 e 005 antes de carregar exemplos.");
      setLoading(false);
      return;
    }

    const id004 = (a004[0] as any).id;
    const id005 = (a005[0] as any).id;

    const rows: any[] = [];
    let prev004 = 0;
    let prevDate004 = "";
    for (const p of EXEMPLO_004) {
      let gmd: number | null = null;
      if (prev004 > 0) {
        const days = Math.max(1, (new Date(p.data).getTime() - new Date(prevDate004).getTime()) / 86400000);
        gmd = (p.peso_kg - prev004) / days;
      }
      rows.push({ animal_id: id004, data: p.data, peso_kg: p.peso_kg, gmd, observacao: "Dado de exemplo", user_id: user.id });
      prev004 = p.peso_kg;
      prevDate004 = p.data;
    }

    let prev005 = 0;
    let prevDate005 = "";
    for (const p of EXEMPLO_005) {
      let gmd: number | null = null;
      if (prev005 > 0) {
        const days = Math.max(1, (new Date(p.data).getTime() - new Date(prevDate005).getTime()) / 86400000);
        gmd = (p.peso_kg - prev005) / days;
      }
      rows.push({ animal_id: id005, data: p.data, peso_kg: p.peso_kg, gmd, observacao: "Dado de exemplo", user_id: user.id });
      prev005 = p.peso_kg;
      prevDate005 = p.data;
    }

    await supabase.from("pesagens" as any).insert(rows as any);
    await Promise.all([
      supabase.from("animais" as any).update({ peso_atual: 520 } as any).eq("id", id004),
      supabase.from("animais" as any).update({ peso_atual: 350 } as any).eq("id", id005),
    ]);

    toast.success("17 pesagens de exemplo inseridas!");
    setLoading(false);
    fetchAll();
  };

  const handleLimparExemplos = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user) return;
    setLoading(true);
    setConfirmLimpar(false);
    await supabase.from("pesagens" as any).delete().eq("user_id", effectiveUserId).eq("observacao", "Dado de exemplo");
    toast.success("Dados de exemplo removidos.");
    setLoading(false);
    fetchAll();
  };

  const handleSaveInd = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user || !form.animal_id || !form.peso_kg) { toast.error("Preencha animal e peso."); return; }
    const peso = parseFloat(form.peso_kg);

    // Calc GMD
    const { data: prev } = await supabase.from("pesagens" as any).select("peso_kg, data").eq("animal_id", form.animal_id)
      .order("data", { ascending: false }).limit(1);
    let gmd: number | null = null;
    if (prev && prev.length > 0) {
      const days = Math.max(1, (new Date(form.data).getTime() - new Date((prev[0] as any).data).getTime()) / 86400000);
      gmd = (peso - Number((prev[0] as any).peso_kg)) / days;
    }

    await supabase.from("pesagens" as any).insert({ animal_id: form.animal_id, data: form.data, peso_kg: peso, gmd, user_id: user.id } as any);
    await supabase.from("animais" as any).update({ peso_atual: peso } as any).eq("id", form.animal_id);

    toast.success(`Pesagem registrada!${gmd !== null ? ` GMD: ${gmd.toFixed(2)} kg/dia` : ""}`);
    setOpenInd(false); setForm({ animal_id: "", data: new Date().toISOString().split("T")[0], peso_kg: "" }); fetchAll();
  };

  const handleSaveLote = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user || !formLote.lote_id || !formLote.peso_medio) { toast.error("Preencha lote e peso médio."); return; }
    const peso = parseFloat(formLote.peso_medio);
    const { data: animaisLote } = await supabase.from("animais" as any).select("id").eq("lote_id", formLote.lote_id).eq("status", "ativo").eq("user_id", effectiveUserId);
    if (!animaisLote || animaisLote.length === 0) { toast.error("Nenhum animal no lote."); return; }

    for (const a of animaisLote as any[]) {
      const { data: prev } = await supabase.from("pesagens" as any).select("peso_kg, data").eq("animal_id", a.id).order("data", { ascending: false }).limit(1);
      let gmd: number | null = null;
      if (prev && prev.length > 0) {
        const days = Math.max(1, (new Date(formLote.data).getTime() - new Date((prev[0] as any).data).getTime()) / 86400000);
        gmd = (peso - Number((prev[0] as any).peso_kg)) / days;
      }
      await supabase.from("pesagens" as any).insert({ animal_id: a.id, data: formLote.data, peso_kg: peso, gmd, user_id: user.id } as any);
      await supabase.from("animais" as any).update({ peso_atual: peso } as any).eq("id", a.id);
    }

    toast.success(`Pesagem em lote registrada para ${animaisLote.length} animais!`);
    setOpenLote(false); setFormLote({ lote_id: "", data: new Date().toISOString().split("T")[0], peso_medio: "" }); fetchAll();
  };

  const filtered = pesagens.filter(p => !busca || (p.animal?.brinco || "").toLowerCase().includes(busca.toLowerCase()));
  const gmdColor = (g: number) => g > 0.5 ? "text-green-600" : g >= 0.3 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Pesagens</h1>
        <div className="flex gap-3 flex-wrap">
          {temExemplos && (
            <Button variant="outline" onClick={() => setConfirmLimpar(true)} disabled={loading} className="gap-2 border-destructive text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Limpar Exemplos
            </Button>
          )}
          <Button onClick={() => setOpenInd(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Pesagem</Button>
          <Button variant="outline" onClick={() => setOpenLote(true)} className="gap-2">Pesagem em Lote</Button>
        </div>
      </div>

      {pesagens.length === 0 && !temExemplos && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={() => setConfirmCarregar(true)}
            disabled={loading}
            className="gap-2 border-dashed border-2 border-muted-foreground/40 text-muted-foreground hover:text-foreground"
          >
            <Database className="h-4 w-4" /> Carregar Dados de Exemplo
          </Button>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por brinco..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <Card className="border-[#E5E7EB]"><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
             <th className="px-4 py-3">Data</th><th className="px-4 py-3">Brinco</th><th className="px-4 py-3">Categoria</th>
             <th className="px-4 py-3">Peso KG</th><th className="px-4 py-3">Peso @</th><th className="px-4 py-3">GMD</th>
          </tr></thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.id} className="border-b hover:bg-[#F8FAFC]">
                <td className="px-4 py-2">{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2 font-mono font-bold">{p.animal?.brinco || "—"}</td>
                <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{p.animal?.categoria || "—"}</span></td>
                <td className="px-4 py-2">{Number(p.peso_kg).toFixed(1)}</td>
                <td className="px-4 py-2">{toArroba(Number(p.peso_kg))}</td>
                <td className={`px-4 py-2 font-bold ${p.gmd != null ? gmdColor(Number(p.gmd)) : ""}`}>{p.gmd != null ? Number(p.gmd).toFixed(2) : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma pesagem</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Confirm carregar */}
      <AlertDialog open={confirmCarregar} onOpenChange={setConfirmCarregar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Carregar dados de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai inserir pesagens de exemplo para os animais 004 e 005. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleCarregarExemplos}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm limpar */}
      <AlertDialog open={confirmLimpar} onOpenChange={setConfirmLimpar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar dados de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai remover APENAS as pesagens marcadas como "Dado de exemplo". Pesagens reais não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleLimparExemplos}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal individual */}
      <Dialog open={openInd} onOpenChange={setOpenInd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Pesagem</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Animal</Label>
              <Select value={form.animal_id || "__none__"} onValueChange={v => setForm({ ...form, animal_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{animais.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco} — {a.categoria}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
            <div className="space-y-2"><Label>Peso KG</Label><Input type="number" value={form.peso_kg} onChange={e => setForm({ ...form, peso_kg: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenInd(false)}>Cancelar</Button><Button onClick={handleSaveInd}>Salvar</Button></div>
        </DialogContent>
      </Dialog>

      {/* Modal lote */}
      <Dialog open={openLote} onOpenChange={setOpenLote}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pesagem em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Lote</Label>
              <Select value={formLote.lote_id || "__none__"} onValueChange={v => setFormLote({ ...formLote, lote_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={formLote.data} onChange={e => setFormLote({ ...formLote, data: e.target.value })} /></div>
            <div className="space-y-2"><Label>Peso Médio KG</Label><Input type="number" value={formLote.peso_medio} onChange={e => setFormLote({ ...formLote, peso_medio: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenLote(false)}>Cancelar</Button><Button onClick={handleSaveLote}>Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
