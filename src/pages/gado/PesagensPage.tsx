import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function PesagensPage() {
  const { user } = useAuth();
  const [pesagens, setPesagens] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [openInd, setOpenInd] = useState(false);
  const [openLote, setOpenLote] = useState(false);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ animal_id: "", data: new Date().toISOString().split("T")[0], peso_kg: "" });
  const [formLote, setFormLote] = useState({ lote_id: "", data: new Date().toISOString().split("T")[0], peso_medio: "" });

  const rendimento = 52;
  const toArroba = (p: number) => (p * rendimento / 100 / 15).toFixed(2);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [p, a, l] = await Promise.all([
      supabase.from("pesagens" as any).select("*, animal:animais!animal_id(brinco, nome)").eq("user_id", user.id).order("data", { ascending: false }).limit(50),
      supabase.from("animais" as any).select("id, brinco, nome").eq("user_id", user.id).eq("status", "ativo").order("brinco"),
      supabase.from("lotes" as any).select("id, nome").eq("user_id", user.id).order("nome"),
    ]);
    setPesagens((p.data as any) || []);
    setAnimais((a.data as any) || []);
    setLotes((l.data as any) || []);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveInd = async () => {
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
    if (!user || !formLote.lote_id || !formLote.peso_medio) { toast.error("Preencha lote e peso médio."); return; }
    const peso = parseFloat(formLote.peso_medio);
    const { data: animaisLote } = await supabase.from("animais" as any).select("id").eq("lote_id", formLote.lote_id).eq("status", "ativo").eq("user_id", user.id);
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
        <div className="flex gap-3">
          <Button onClick={() => setOpenInd(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Pesagem</Button>
          <Button variant="outline" onClick={() => setOpenLote(true)} className="gap-2">Pesagem em Lote</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por brinco..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <Card className="border-[#E5E7EB]"><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Data</th><th className="px-4 py-3">Brinco</th><th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Peso KG</th><th className="px-4 py-3">Peso @</th><th className="px-4 py-3">GMD</th>
          </tr></thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.id} className="border-b hover:bg-[#F8FAFC]">
                <td className="px-4 py-2">{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2 font-mono font-bold">{p.animal?.brinco || "—"}</td>
                <td className="px-4 py-2">{p.animal?.nome || "—"}</td>
                <td className="px-4 py-2">{Number(p.peso_kg).toFixed(1)}</td>
                <td className="px-4 py-2">{toArroba(Number(p.peso_kg))}</td>
                <td className={`px-4 py-2 font-bold ${p.gmd != null ? gmdColor(Number(p.gmd)) : ""}`}>{p.gmd != null ? Number(p.gmd).toFixed(2) : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma pesagem</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Modal individual */}
      <Dialog open={openInd} onOpenChange={setOpenInd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Pesagem</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Animal</Label>
              <Select value={form.animal_id || "__none__"} onValueChange={v => setForm({ ...form, animal_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{animais.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco} — {a.nome || "Sem nome"}</SelectItem>)}</SelectContent>
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
