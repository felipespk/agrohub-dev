import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MED_BADGE: Record<string, string> = { vacina: "bg-green-100 text-green-700", medicamento: "bg-blue-100 text-blue-700", vermifugo: "bg-yellow-100 text-yellow-700" };

export default function SanidadePage() {
  const { user } = useAuth();
  const [meds, setMeds] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [openMed, setOpenMed] = useState(false);
  const [openApp, setOpenApp] = useState(false);
  const [formMed, setFormMed] = useState({ nome: "", tipo: "vacina", fabricante: "", carencia_dias: "0" });
  const [formApp, setFormApp] = useState({ modo: "individual", animal_id: "", lote_id: "", medicamento_id: "", data_aplicacao: new Date().toISOString().split("T")[0], dose: "", proxima_dose: "" });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [m, a, an, l] = await Promise.all([
      supabase.from("medicamentos" as any).select("*").eq("user_id", user.id).order("nome"),
      supabase.from("aplicacoes_sanitarias" as any).select("*, animal:animais!animal_id(brinco, nome), medicamento:medicamentos!medicamento_id(nome, tipo)").eq("user_id", user.id).order("data_aplicacao", { ascending: false }),
      supabase.from("animais" as any).select("id, brinco, nome").eq("user_id", user.id).eq("status", "ativo").order("brinco"),
      supabase.from("lotes" as any).select("id, nome").eq("user_id", user.id).order("nome"),
    ]);
    setMeds((m.data as any) || []);
    setApps((a.data as any) || []);
    setAnimais((an.data as any) || []);
    setLotes((l.data as any) || []);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveMed = async () => {
    if (!user || !formMed.nome.trim()) return;
    await supabase.from("medicamentos" as any).insert({ nome: formMed.nome.trim(), tipo: formMed.tipo, fabricante: formMed.fabricante || null, carencia_dias: parseInt(formMed.carencia_dias) || 0, user_id: user.id } as any);
    toast.success("Medicamento cadastrado!"); setOpenMed(false); setFormMed({ nome: "", tipo: "vacina", fabricante: "", carencia_dias: "0" }); fetchAll();
  };

  const handleSaveApp = async () => {
    if (!user || !formApp.medicamento_id) { toast.error("Selecione um medicamento."); return; }

    if (formApp.modo === "individual") {
      if (!formApp.animal_id) { toast.error("Selecione um animal."); return; }
      await supabase.from("aplicacoes_sanitarias" as any).insert({
        animal_id: formApp.animal_id, medicamento_id: formApp.medicamento_id,
        data_aplicacao: formApp.data_aplicacao, dose: formApp.dose || null,
        proxima_dose: formApp.proxima_dose || null, user_id: user.id,
      } as any);
      toast.success("Aplicação registrada!");
    } else {
      if (!formApp.lote_id) { toast.error("Selecione um lote."); return; }
      const { data: animaisLote } = await supabase.from("animais" as any).select("id").eq("lote_id", formApp.lote_id).eq("status", "ativo").eq("user_id", user.id);
      if (!animaisLote || animaisLote.length === 0) { toast.error("Nenhum animal no lote."); return; }
      for (const a of animaisLote as any[]) {
        await supabase.from("aplicacoes_sanitarias" as any).insert({
          animal_id: a.id, lote_id: formApp.lote_id, medicamento_id: formApp.medicamento_id,
          data_aplicacao: formApp.data_aplicacao, dose: formApp.dose || null,
          proxima_dose: formApp.proxima_dose || null, user_id: user.id,
        } as any);
      }
      toast.success(`Aplicação em lote registrada para ${animaisLote.length} animais!`);
    }
    setOpenApp(false); setFormApp({ modo: "individual", animal_id: "", lote_id: "", medicamento_id: "", data_aplicacao: new Date().toISOString().split("T")[0], dose: "", proxima_dose: "" }); fetchAll();
  };

  const deleteMed = async (id: string) => {
    if (!confirm("Excluir medicamento?")) return;
    await supabase.from("medicamentos" as any).delete().eq("id", id);
    toast.success("Removido."); fetchAll();
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Sanidade</h1>

      <Tabs defaultValue="aplicacoes">
        <TabsList><TabsTrigger value="aplicacoes">Aplicações</TabsTrigger><TabsTrigger value="catalogo">Catálogo de Medicamentos</TabsTrigger></TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setOpenMed(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo Medicamento</Button></div>
          <Card className="border-[#E5E7EB]"><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Nome</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Fabricante</th><th className="px-4 py-3">Carência</th><th className="px-4 py-3">Ações</th>
              </tr></thead>
              <tbody>
                {meds.map((m: any) => (
                  <tr key={m.id} className="border-b hover:bg-[#F8FAFC]">
                    <td className="px-4 py-2 font-medium">{m.nome}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${MED_BADGE[m.tipo] || ""}`}>{m.tipo}</span></td>
                    <td className="px-4 py-2">{m.fabricante || "—"}</td>
                    <td className="px-4 py-2">{m.carencia_dias} dias</td>
                    <td className="px-4 py-2"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMed(m.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></td>
                  </tr>
                ))}
                {meds.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum medicamento cadastrado</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="aplicacoes" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => setOpenApp(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Aplicação</Button></div>
          <Card className="border-[#E5E7EB]"><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Data</th><th className="px-4 py-3">Animal</th><th className="px-4 py-3">Medicamento</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Dose</th><th className="px-4 py-3">Próx. Dose</th>
              </tr></thead>
              <tbody>
                {apps.map((a: any) => {
                  const vencida = a.proxima_dose && a.proxima_dose < today;
                  const proximo = a.proxima_dose && !vencida && a.proxima_dose <= new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
                  return (
                    <tr key={a.id} className={`border-b ${vencida ? "bg-red-50" : proximo ? "bg-yellow-50" : ""}`}>
                      <td className="px-4 py-2">{new Date(a.data_aplicacao + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-2 font-mono">{a.animal?.brinco || "—"}</td>
                      <td className="px-4 py-2">{a.medicamento?.nome || "—"}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${MED_BADGE[a.medicamento?.tipo] || ""}`}>{a.medicamento?.tipo}</span></td>
                      <td className="px-4 py-2">{a.dose || "—"}</td>
                      <td className={`px-4 py-2 ${vencida ? "text-red-600 font-bold" : ""}`}>{a.proxima_dose ? new Date(a.proxima_dose + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    </tr>
                  );
                })}
                {apps.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma aplicação registrada</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Modal Medicamento */}
      <Dialog open={openMed} onOpenChange={setOpenMed}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Medicamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formMed.nome} onChange={e => setFormMed({ ...formMed, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={formMed.tipo} onValueChange={v => setFormMed({ ...formMed, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="vacina">Vacina</SelectItem><SelectItem value="medicamento">Medicamento</SelectItem><SelectItem value="vermifugo">Vermífugo</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Fabricante</Label><Input value={formMed.fabricante} onChange={e => setFormMed({ ...formMed, fabricante: e.target.value })} /></div>
            <div className="space-y-2"><Label>Carência (dias)</Label><Input type="number" value={formMed.carencia_dias} onChange={e => setFormMed({ ...formMed, carencia_dias: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenMed(false)}>Cancelar</Button><Button onClick={handleSaveMed}>Salvar</Button></div>
        </DialogContent>
      </Dialog>

      {/* Modal Aplicação */}
      <Dialog open={openApp} onOpenChange={setOpenApp}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Aplicação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button variant={formApp.modo === "individual" ? "default" : "outline"} size="sm" onClick={() => setFormApp({ ...formApp, modo: "individual" })}>Individual</Button>
              <Button variant={formApp.modo === "lote" ? "default" : "outline"} size="sm" onClick={() => setFormApp({ ...formApp, modo: "lote" })}>Em Lote</Button>
            </div>
            {formApp.modo === "individual" ? (
              <div className="space-y-2"><Label>Animal</Label>
                <Select value={formApp.animal_id || "__none__"} onValueChange={v => setFormApp({ ...formApp, animal_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{animais.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco} — {a.nome || ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2"><Label>Lote</Label>
                <Select value={formApp.lote_id || "__none__"} onValueChange={v => setFormApp({ ...formApp, lote_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Medicamento *</Label>
              <Select value={formApp.medicamento_id || "__none__"} onValueChange={v => setFormApp({ ...formApp, medicamento_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{meds.map(m => <SelectItem key={m.id} value={m.id}>{m.nome} ({m.tipo})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={formApp.data_aplicacao} onChange={e => setFormApp({ ...formApp, data_aplicacao: e.target.value })} /></div>
            <div className="space-y-2"><Label>Dose</Label><Input value={formApp.dose} onChange={e => setFormApp({ ...formApp, dose: e.target.value })} /></div>
            <div className="space-y-2"><Label>Próxima Dose</Label><Input type="date" value={formApp.proxima_dose} onChange={e => setFormApp({ ...formApp, proxima_dose: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenApp(false)}>Cancelar</Button><Button onClick={handleSaveApp}>Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
