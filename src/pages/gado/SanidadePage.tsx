import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import ExampleDataButtons from "@/components/ExampleDataButtons";

const MED_BADGE: Record<string, string> = { vacina: "bg-green-100 text-green-700", medicamento: "bg-blue-100 text-blue-700", vermifugo: "bg-yellow-100 text-yellow-700" };
const CAT_BADGE: Record<string, string> = { vaca: "bg-pink-100 text-pink-700", touro: "bg-blue-100 text-blue-700", boi: "bg-amber-100 text-amber-700", novilha: "bg-purple-100 text-purple-700", bezerro: "bg-green-100 text-green-700", bezerra: "bg-teal-100 text-teal-700" };

export default function SanidadePage() {
  const { user } = useAuth();
  const [meds, setMeds] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [pastos, setPastos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [openMed, setOpenMed] = useState(false);
  const [openApp, setOpenApp] = useState(false);
  const [formMed, setFormMed] = useState({ nome: "", tipo: "vacina", fabricante: "", carencia_dias: "0" });
  const [formApp, setFormApp] = useState({ modo: "individual", animal_id: "", lote_id: "", medicamento_id: "", data_aplicacao: new Date().toISOString().split("T")[0], dose: "", proxima_dose: "" });

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchAnimal, setSearchAnimal] = useState("");
  const [filterPasto, setFilterPasto] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Lote preview
  const [loteAnimais, setLoteAnimais] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [m, a, an, l, p] = await Promise.all([
      supabase.from("medicamentos" as any).select("*").eq("user_id", user.id).order("nome"),
      supabase.from("aplicacoes_sanitarias" as any).select("*, animal:animais!animal_id(brinco, categoria), medicamento:medicamentos!medicamento_id(nome, tipo)").eq("user_id", user.id).order("data_aplicacao", { ascending: false }),
      supabase.from("animais" as any).select("id, brinco, categoria, pasto_id, peso_atual, status").eq("user_id", user.id).eq("status", "ativo").order("brinco"),
      supabase.from("lotes" as any).select("id, nome").eq("user_id", user.id).order("nome"),
      supabase.from("pastos" as any).select("id, nome").eq("user_id", user.id).order("nome"),
    ]);
    setMeds((m.data as any) || []);
    setApps((a.data as any) || []);
    setAnimais((an.data as any) || []);
    setLotes((l.data as any) || []);
    setPastos((p.data as any) || []);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch lote animals for preview
  useEffect(() => {
    if (formApp.modo !== "lote" || !formApp.lote_id || !user) { setLoteAnimais([]); return; }
    supabase.from("animais" as any).select("id, brinco, categoria").eq("lote_id", formApp.lote_id).eq("status", "ativo").eq("user_id", user.id).order("brinco")
      .then(({ data }) => setLoteAnimais((data as any) || []));
  }, [formApp.modo, formApp.lote_id, user]);

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
    } else if (formApp.modo === "lote") {
      if (!formApp.lote_id) { toast.error("Selecione um lote."); return; }
      const { data: animaisLote } = await supabase.from("animais" as any).select("id").eq("lote_id", formApp.lote_id).eq("status", "ativo").eq("user_id", user.id);
      if (!animaisLote || animaisLote.length === 0) { toast.error("Nenhum animal no lote."); return; }
      setSaving(true); setSaveProgress(0);
      for (let i = 0; i < (animaisLote as any[]).length; i++) {
        await supabase.from("aplicacoes_sanitarias" as any).insert({
          animal_id: (animaisLote as any[])[i].id, lote_id: formApp.lote_id, medicamento_id: formApp.medicamento_id,
          data_aplicacao: formApp.data_aplicacao, dose: formApp.dose || null,
          proxima_dose: formApp.proxima_dose || null, user_id: user.id,
        } as any);
        setSaveProgress(Math.round(((i + 1) / (animaisLote as any[]).length) * 100));
      }
      setSaving(false);
      toast.success(`Aplicação em lote registrada para ${animaisLote.length} animais!`);
    } else if (formApp.modo === "multiplo") {
      if (selectedIds.size === 0) { toast.error("Selecione pelo menos um animal."); return; }
      const ids = Array.from(selectedIds);
      setSaving(true); setSaveProgress(0);
      for (let i = 0; i < ids.length; i++) {
        await supabase.from("aplicacoes_sanitarias" as any).insert({
          animal_id: ids[i], medicamento_id: formApp.medicamento_id,
          data_aplicacao: formApp.data_aplicacao, dose: formApp.dose || null,
          proxima_dose: formApp.proxima_dose || null, user_id: user.id,
        } as any);
        setSaveProgress(Math.round(((i + 1) / ids.length) * 100));
      }
      setSaving(false);
      toast.success(`Vacina aplicada em ${ids.length} animais!`);
    }

    setOpenApp(false);
    setFormApp({ modo: "individual", animal_id: "", lote_id: "", medicamento_id: "", data_aplicacao: new Date().toISOString().split("T")[0], dose: "", proxima_dose: "" });
    setSelectedIds(new Set());
    setSearchAnimal("");
    setFilterPasto("");
    setFilterCategoria("");
    fetchAll();
  };

  const deleteMed = async (id: string) => {
    if (!confirm("Excluir medicamento?")) return;
    await supabase.from("medicamentos" as any).delete().eq("id", id);
    toast.success("Removido."); fetchAll();
  };

  const hasExampleApps = apps.some((a: any) => a.observacao === "Dado de exemplo");

  const handleLoadMedExamples = async () => {
    if (!user) return;
    const medsData = [
      { nome: "Vacina Aftosa", tipo: "vacina", fabricante: "Vallée", carencia_dias: 0, user_id: user.id },
      { nome: "Vacina Brucelose B19", tipo: "vacina", fabricante: "MSD", carencia_dias: 0, user_id: user.id },
      { nome: "Ivermectina 1%", tipo: "vermifugo", fabricante: "Ouro Fino", carencia_dias: 35, user_id: user.id },
      { nome: "Oxitetraciclina LA", tipo: "medicamento", fabricante: "Bayer", carencia_dias: 28, user_id: user.id },
    ];
    await supabase.from("medicamentos" as any).insert(medsData as any);
    await fetchAll();
    const { data: freshMeds } = await supabase.from("medicamentos" as any).select("id, nome").eq("user_id", user.id);
    const { data: freshAnimais } = await supabase.from("animais" as any).select("id, brinco").eq("user_id", user.id);
    if (!freshMeds || !freshAnimais) { toast.success("4 medicamentos inseridos!"); fetchAll(); return; }
    const findAnimal = (brinco: string) => (freshAnimais as any[]).find(a => a.brinco === brinco)?.id;
    const findMed = (nome: string) => (freshMeds as any[]).find(m => m.nome.includes(nome))?.id;
    const a001 = findAnimal("001"); const a002 = findAnimal("002");
    const a004 = findAnimal("004"); const a006 = findAnimal("006");
    const mAftosa = findMed("Aftosa"); const mIvermectina = findMed("Ivermectina");
    const mBrucelose = findMed("Brucelose");
    const appsData: any[] = [];
    if (a001 && mAftosa) appsData.push({ animal_id: a001, medicamento_id: mAftosa, data_aplicacao: "2026-03-15", dose: "5ml", proxima_dose: "2026-09-15", observacao: "Dado de exemplo", user_id: user.id });
    if (a002 && mAftosa) appsData.push({ animal_id: a002, medicamento_id: mAftosa, data_aplicacao: "2026-03-15", dose: "5ml", proxima_dose: "2026-09-15", observacao: "Dado de exemplo", user_id: user.id });
    if (a004 && mIvermectina) appsData.push({ animal_id: a004, medicamento_id: mIvermectina, data_aplicacao: "2026-03-10", dose: "10ml", proxima_dose: "2026-04-10", observacao: "Dado de exemplo", user_id: user.id });
    if (a006 && mBrucelose) appsData.push({ animal_id: a006, medicamento_id: mBrucelose, data_aplicacao: "2026-02-01", dose: "2ml", proxima_dose: "2026-05-01", observacao: "Dado de exemplo", user_id: user.id });
    if (appsData.length > 0) await supabase.from("aplicacoes_sanitarias" as any).insert(appsData as any);
    toast.success(`4 medicamentos e ${appsData.length} aplicações inseridos!`);
    fetchAll();
  };

  const handleCleanExamples = async () => {
    if (!user) return;
    await supabase.from("aplicacoes_sanitarias" as any).delete().eq("observacao", "Dado de exemplo").eq("user_id", user.id);
    toast.success("Aplicações de exemplo removidas.");
    fetchAll();
  };

  // Filtered animals for multi-select
  const filteredAnimais = useMemo(() => {
    return animais.filter((a: any) => {
      const q = searchAnimal.toLowerCase();
      if (q && !(a.brinco?.toLowerCase().includes(q) || a.nome?.toLowerCase().includes(q))) return false;
      if (filterPasto && a.pasto_id !== filterPasto) return false;
      if (filterCategoria && a.categoria !== filterCategoria) return false;
      return true;
    });
  }, [animais, searchAnimal, filterPasto, filterCategoria]);

  const categorias = useMemo(() => [...new Set(animais.map((a: any) => a.categoria).filter(Boolean))].sort(), [animais]);

  const pastoName = (id: string) => pastos.find((p: any) => p.id === id)?.nome || "—";

  const toggleAnimal = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredAnimais.map((a: any) => a.id)));
  const selectNone = () => setSelectedIds(new Set());

  const today = new Date().toISOString().split("T")[0];
  const isMultiplo = formApp.modo === "multiplo";

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Sanidade</h1>

      <Tabs defaultValue="aplicacoes">
        <TabsList><TabsTrigger value="aplicacoes">Aplicações</TabsTrigger><TabsTrigger value="catalogo">Catálogo de Medicamentos</TabsTrigger></TabsList>

        <TabsContent value="catalogo" className="space-y-4">
          <div className="flex justify-between flex-wrap gap-2">
            <ExampleDataButtons showLoad={meds.length === 0} showClean={false} loadLabel="Carregar Dados de Exemplo" loadConfirmMsg="Isso vai inserir 4 medicamentos e 4 aplicações de exemplo. Deseja continuar?" onLoad={handleLoadMedExamples} onClean={async () => {}} />
            <Button onClick={() => setOpenMed(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo Medicamento</Button>
          </div>
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
          <div className="flex justify-between flex-wrap gap-2">
            <ExampleDataButtons showLoad={false} showClean={hasExampleApps} loadLabel="" loadConfirmMsg="" onLoad={async () => {}} onClean={handleCleanExamples} />
            <Button onClick={() => { setOpenApp(true); setSelectedIds(new Set()); setSearchAnimal(""); setFilterPasto(""); setFilterCategoria(""); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Aplicação</Button>
          </div>
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
                      <td className="px-4 py-2 font-mono">{a.animal?.brinco || "—"} <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 ml-1">{a.animal?.categoria || ""}</span></td>
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

      {/* Novo Medicamento */}
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

      {/* Nova Aplicação */}
      <Dialog open={openApp} onOpenChange={(v) => { if (!saving) setOpenApp(v); }}>
        <DialogContent className={isMultiplo ? "max-w-2xl" : "max-w-md"}>
          <DialogHeader><DialogTitle>Nova Aplicação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Mode selector */}
            <div className="flex gap-2 flex-wrap">
              <Button variant={formApp.modo === "individual" ? "default" : "outline"} size="sm" onClick={() => setFormApp({ ...formApp, modo: "individual" })}>Individual</Button>
              <Button variant={formApp.modo === "lote" ? "default" : "outline"} size="sm" onClick={() => setFormApp({ ...formApp, modo: "lote" })}>Por Lote</Button>
              <Button variant={formApp.modo === "multiplo" ? "default" : "outline"} size="sm" onClick={() => setFormApp({ ...formApp, modo: "multiplo" })}>Seleção Múltipla</Button>
            </div>

            {/* Individual mode */}
            {formApp.modo === "individual" && (
              <div className="space-y-2"><Label>Animal</Label>
                <Select value={formApp.animal_id || "__none__"} onValueChange={v => setFormApp({ ...formApp, animal_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{animais.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.brinco} — {a.categoria}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {/* Lote mode */}
            {formApp.modo === "lote" && (
              <div className="space-y-2">
                <Label>Lote</Label>
                <Select value={formApp.lote_id || "__none__"} onValueChange={v => setFormApp({ ...formApp, lote_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{lotes.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                </Select>
                {formApp.lote_id && (
                  <div className="bg-muted/50 rounded-md p-3 text-sm">
                    <span className="font-medium">Este lote tem {loteAnimais.length} animais:</span>
                    <p className="text-muted-foreground mt-1">
                      {loteAnimais.length > 0
                        ? loteAnimais.map((a: any) => a.brinco).join(", ")
                        : "Nenhum animal ativo neste lote."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Seleção Múltipla mode */}
            {formApp.modo === "multiplo" && (
              <div className="space-y-3">
                {/* Search & Filters */}
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar brinco ou nome..." value={searchAnimal} onChange={e => setSearchAnimal(e.target.value)} className="pl-8 h-9" />
                  </div>
                  <Select value={filterPasto || "__all__"} onValueChange={v => setFilterPasto(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Pasto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos Pastos</SelectItem>
                      {pastos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterCategoria || "__all__"} onValueChange={v => setFilterCategoria(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas</SelectItem>
                      {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={selectAll}>Selecionar Todos</Button>
                  <Button variant="outline" size="sm" onClick={selectNone}>Selecionar Nenhum</Button>
                  <span className="text-sm font-medium text-muted-foreground ml-auto">
                    {selectedIds.size} animais selecionados
                  </span>
                </div>

                {/* Animal list with checkboxes */}
                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 w-8"></th>
                        <th className="px-3 py-2">Brinco</th>
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2">Pasto</th>
                        <th className="px-3 py-2 text-right">Peso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnimais.map((a: any) => {
                        const checked = selectedIds.has(a.id);
                        return (
                          <tr
                            key={a.id}
                            className={`border-b cursor-pointer transition-colors ${checked ? "bg-green-50" : "hover:bg-muted/30"}`}
                            onClick={() => toggleAnimal(a.id)}
                          >
                            <td className="px-3 py-1.5">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleAnimal(a.id)}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                onClick={e => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-3 py-1.5 font-mono font-bold">{a.brinco}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${CAT_BADGE[a.categoria?.toLowerCase()] || "bg-gray-100 text-gray-700"}`}>
                                {a.categoria}
                              </span>
                            </td>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${CAT_BADGE[a.categoria?.toLowerCase()] || "bg-gray-100 text-gray-700"}`}>
                                {a.categoria}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{pastoName(a.pasto_id)}</td>
                            <td className="px-3 py-1.5 text-right">{a.peso_atual ? `${a.peso_atual} kg` : "—"}</td>
                          </tr>
                        );
                      })}
                      {filteredAnimais.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum animal encontrado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Common fields */}
            <div className="space-y-2"><Label>Medicamento *</Label>
              <Select value={formApp.medicamento_id || "__none__"} onValueChange={v => setFormApp({ ...formApp, medicamento_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{meds.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nome} ({m.tipo})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={formApp.data_aplicacao} onChange={e => setFormApp({ ...formApp, data_aplicacao: e.target.value })} /></div>
              <div className="space-y-2"><Label>Dose</Label><Input value={formApp.dose} onChange={e => setFormApp({ ...formApp, dose: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Próxima Dose</Label><Input type="date" value={formApp.proxima_dose} onChange={e => setFormApp({ ...formApp, proxima_dose: e.target.value })} /></div>

            {/* Progress bar */}
            {saving && (
              <div className="space-y-1">
                <Progress value={saveProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">Salvando... {saveProgress}%</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpenApp(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSaveApp} disabled={saving}>
              {saving ? "Salvando..." : isMultiplo && selectedIds.size > 0 ? `Salvar (${selectedIds.size} animais)` : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
