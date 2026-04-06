import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const DIAG_BADGE: Record<string, string> = { prenha: "bg-green-100 text-green-700", vazia: "bg-red-100 text-red-700", pendente: "bg-yellow-100 text-yellow-700" };

export default function ReproducaoPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [registros, setRegistros] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [openCob, setOpenCob] = useState(false);
  const [openDiag, setOpenDiag] = useState<any>(null);
  const [openParto, setOpenParto] = useState<any>(null);
  const [formCob, setFormCob] = useState({ femea_id: "", tipo: "monta_natural", macho_id: "", semen_info: "", data_cobertura: new Date().toISOString().split("T")[0], observacao: "" });
  const [formDiag, setFormDiag] = useState({ diagnostico: "prenha", data_diagnostico: new Date().toISOString().split("T")[0], data_parto_prevista: "" });
  const [formParto, setFormParto] = useState({ data_parto_real: new Date().toISOString().split("T")[0], sexo_bezerro: "macho", peso_bezerro: "", brinco_bezerro: "" });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [r, a] = await Promise.all([
      supabase.from("reproducao" as any).select("*, femea:animais!femea_id(brinco, categoria), macho:animais!macho_id(brinco, categoria), bezerro:animais!bezerro_id(brinco)")
        .eq("user_id", effectiveUserId).order("data_cobertura", { ascending: false }),
      supabase.from("animais" as any).select("id, brinco, categoria, sexo").eq("user_id", effectiveUserId).eq("status", "ativo").order("brinco"),
    ]);
    setRegistros((r.data as any) || []);
    setAnimais((a.data as any) || []);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const femeas = animais.filter(a => a.sexo === "femea");
  const machos = animais.filter(a => a.sexo === "macho");

  const prenhas = registros.filter(r => r.diagnostico === "prenha" && !r.data_parto_real).length;
  const pendentes = registros.filter(r => r.diagnostico === "pendente").length;
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const partos30 = registros.filter(r => r.data_parto_prevista && !r.data_parto_real && new Date(r.data_parto_prevista) <= in30 && new Date(r.data_parto_prevista) >= now).length;

  const handleCob = async () => {
    if (!user || !formCob.femea_id) { toast.error("Selecione a fêmea."); return; }
    await supabase.from("reproducao" as any).insert({
      femea_id: formCob.femea_id, tipo: formCob.tipo,
      macho_id: formCob.tipo === "monta_natural" && formCob.macho_id ? formCob.macho_id : null,
      semen_info: formCob.tipo === "inseminacao" ? formCob.semen_info : null,
      data_cobertura: formCob.data_cobertura, observacao: formCob.observacao || null,
      diagnostico: "pendente", user_id: user.id,
    } as any);
    toast.success("Cobertura registrada!"); setOpenCob(false); fetchAll();
  };

  const handleDiag = async () => {
    if (!openDiag) return;
    const upd: any = { diagnostico: formDiag.diagnostico, data_diagnostico: formDiag.data_diagnostico };
    if (formDiag.diagnostico === "prenha" && formDiag.data_parto_prevista) upd.data_parto_prevista = formDiag.data_parto_prevista;
    await supabase.from("reproducao" as any).update(upd).eq("id", openDiag.id);
    toast.success("Diagnóstico registrado!"); setOpenDiag(null); fetchAll();
  };

  const handleParto = async () => {
    if (!user || !openParto) return;
    const reg = openParto;
    const mae = animais.find(a => a.id === reg.femea_id);
    // Create bezerro
    const { data: newAnimal } = await supabase.from("animais" as any).insert({
      brinco: formParto.brinco_bezerro || `BEZ-${Date.now().toString(36)}`,
      sexo: formParto.sexo_bezerro, categoria: formParto.sexo_bezerro === "macho" ? "bezerro" : "bezerra",
      origem: "nascido", data_nascimento: formParto.data_parto_real, data_entrada: formParto.data_parto_real,
      mae_brinco: mae?.brinco || reg.femea?.brinco || null,
      pai_brinco: reg.macho?.brinco || null,
      peso_atual: formParto.peso_bezerro ? parseFloat(formParto.peso_bezerro) : null,
      user_id: user.id, status: "ativo",
    } as any).select("id").single();

    await supabase.from("reproducao" as any).update({
      data_parto_real: formParto.data_parto_real, bezerro_id: (newAnimal as any)?.id || null,
    } as any).eq("id", reg.id);

    // Movimentação
    await supabase.from("movimentacoes_gado" as any).insert({
      tipo: "nascimento", animal_id: (newAnimal as any)?.id || null, data: formParto.data_parto_real,
      peso_kg: formParto.peso_bezerro ? parseFloat(formParto.peso_bezerro) : null,
      user_id: user.id,
    } as any);

    // Pesagem inicial
    if (formParto.peso_bezerro && (newAnimal as any)?.id) {
      await supabase.from("pesagens" as any).insert({
        animal_id: (newAnimal as any).id, data: formParto.data_parto_real, peso_kg: parseFloat(formParto.peso_bezerro), user_id: user.id,
      } as any);
    }

    toast.success("Parto registrado! Bezerro criado."); setOpenParto(null); fetchAll();
  };

  const suggestParto = (dataCob: string) => {
    const d = new Date(dataCob + "T12:00:00");
    d.setDate(d.getDate() + 283);
    return d.toISOString().split("T")[0];
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Reprodução</h1>
        <Button onClick={() => setOpenCob(true)} className="gap-2"><Plus className="h-4 w-4" /> Registrar Cobertura</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#E5E7EB]"><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase text-muted-foreground font-semibold">Prenhas</p>
          <p className="text-2xl font-bold text-green-600">{prenhas}</p>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase text-muted-foreground font-semibold">Aguardando Diagnóstico</p>
          <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase text-muted-foreground font-semibold">Partos Previstos (30d)</p>
          <p className="text-2xl font-bold text-blue-600">{partos30}</p>
        </CardContent></Card>
      </div>

      <Card className="border-[#E5E7EB]"><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Fêmea</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Touro/Sêmen</th>
            <th className="px-4 py-3">Data Cob.</th><th className="px-4 py-3">Diagnóstico</th><th className="px-4 py-3">Parto Prev.</th>
            <th className="px-4 py-3">Bezerro</th><th className="px-4 py-3">Ações</th>
          </tr></thead>
          <tbody>
            {registros.map((r: any) => (
              <tr key={r.id} className="border-b hover:bg-[#F8FAFC]">
                <td className="px-4 py-2 font-mono">{r.femea?.brinco || "—"}</td>
                <td className="px-4 py-2">{r.tipo === "monta_natural" ? "Monta" : "IA"}</td>
                <td className="px-4 py-2">{r.macho?.brinco || r.semen_info || "—"}</td>
                <td className="px-4 py-2">{new Date(r.data_cobertura + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIAG_BADGE[r.diagnostico] || ""}`}>{r.diagnostico}</span></td>
                <td className="px-4 py-2">{r.data_parto_prevista ? new Date(r.data_parto_prevista + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                <td className="px-4 py-2">{r.bezerro?.brinco || "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    {r.diagnostico === "pendente" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                        setFormDiag({ diagnostico: "prenha", data_diagnostico: new Date().toISOString().split("T")[0], data_parto_prevista: suggestParto(r.data_cobertura) });
                        setOpenDiag(r);
                      }}>Diagnóstico</Button>
                    )}
                    {r.diagnostico === "prenha" && !r.data_parto_real && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => {
                        setFormParto({ data_parto_real: new Date().toISOString().split("T")[0], sexo_bezerro: "macho", peso_bezerro: "", brinco_bezerro: "" });
                        setOpenParto(r);
                      }}>Parto</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {registros.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum registro</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Modal Cobertura */}
      <Dialog open={openCob} onOpenChange={setOpenCob}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Cobertura</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Fêmea *</Label>
              <Select value={formCob.femea_id || "__none__"} onValueChange={v => setFormCob({ ...formCob, femea_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{femeas.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco} — {a.categoria}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={formCob.tipo} onValueChange={v => setFormCob({ ...formCob, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="monta_natural">Monta Natural</SelectItem><SelectItem value="inseminacao">Inseminação</SelectItem></SelectContent>
              </Select>
            </div>
            {formCob.tipo === "monta_natural" ? (
              <div className="space-y-2"><Label>Touro</Label>
                <Select value={formCob.macho_id || "__none__"} onValueChange={v => setFormCob({ ...formCob, macho_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">Não informado</SelectItem>{machos.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco} — {a.categoria}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2"><Label>Info do Sêmen</Label><Input value={formCob.semen_info} onChange={e => setFormCob({ ...formCob, semen_info: e.target.value })} /></div>
            )}
            <div className="space-y-2"><Label>Data da Cobertura *</Label><Input type="date" value={formCob.data_cobertura} onChange={e => setFormCob({ ...formCob, data_cobertura: e.target.value })} /></div>
            <div className="space-y-2"><Label>Observação</Label><Textarea value={formCob.observacao} onChange={e => setFormCob({ ...formCob, observacao: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenCob(false)}>Cancelar</Button><Button onClick={handleCob}>Salvar</Button></div>
        </DialogContent>
      </Dialog>

      {/* Modal Diagnóstico */}
      <Dialog open={!!openDiag} onOpenChange={() => setOpenDiag(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Diagnóstico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Diagnóstico</Label>
              <Select value={formDiag.diagnostico} onValueChange={v => setFormDiag({ ...formDiag, diagnostico: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="prenha">Prenha</SelectItem><SelectItem value="vazia">Vazia</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={formDiag.data_diagnostico} onChange={e => setFormDiag({ ...formDiag, data_diagnostico: e.target.value })} /></div>
            {formDiag.diagnostico === "prenha" && (
              <div className="space-y-2"><Label>Parto Previsto</Label><Input type="date" value={formDiag.data_parto_prevista} onChange={e => setFormDiag({ ...formDiag, data_parto_prevista: e.target.value })} /></div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenDiag(null)}>Cancelar</Button><Button onClick={handleDiag}>Salvar</Button></div>
        </DialogContent>
      </Dialog>

      {/* Modal Parto */}
      <Dialog open={!!openParto} onOpenChange={() => setOpenParto(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Parto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Data do Parto</Label><Input type="date" value={formParto.data_parto_real} onChange={e => setFormParto({ ...formParto, data_parto_real: e.target.value })} /></div>
            <div className="space-y-2"><Label>Sexo do Bezerro</Label>
              <Select value={formParto.sexo_bezerro} onValueChange={v => setFormParto({ ...formParto, sexo_bezerro: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="macho">Macho</SelectItem><SelectItem value="femea">Fêmea</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Peso ao Nascer (KG)</Label><Input type="number" value={formParto.peso_bezerro} onChange={e => setFormParto({ ...formParto, peso_bezerro: e.target.value })} /></div>
            <div className="space-y-2"><Label>Brinco do Bezerro</Label><Input value={formParto.brinco_bezerro} onChange={e => setFormParto({ ...formParto, brinco_bezerro: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenParto(null)}>Cancelar</Button><Button onClick={handleParto}>Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
