import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Scale, Plus } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";

const CAT_BADGE: Record<string, string> = {
  vaca: "bg-pink-100 text-pink-700", touro: "bg-blue-100 text-blue-700",
  bezerro: "bg-green-100 text-green-700", bezerra: "bg-emerald-100 text-emerald-700",
  novilha: "bg-yellow-100 text-yellow-700", boi: "bg-gray-200 text-gray-700",
};
const STATUS_BADGE: Record<string, string> = {
  ativo: "bg-green-100 text-green-700", vendido: "bg-blue-100 text-blue-700",
  morto: "bg-red-100 text-red-700", transferido: "bg-gray-100 text-gray-600",
};

function calcAge(d: string) {
  const born = new Date(d + "T12:00:00");
  const now = new Date();
  let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
  const years = Math.floor(months / 12);
  months = months % 12;
  return years > 0 ? `${years}a ${months}m` : `${months}m`;
}

export default function AnimalFichaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState<any>(null);
  const [pesagens, setPesagens] = useState<any[]>([]);
  const [sanidade, setSanidade] = useState<any[]>([]);
  const [movs, setMovs] = useState<any[]>([]);
  const [repro, setRepro] = useState<any[]>([]);
  const [openPesagem, setOpenPesagem] = useState(false);
  const [pesoNovo, setPesoNovo] = useState("");
  const [dataPesagem, setDataPesagem] = useState(new Date().toISOString().split("T")[0]);
  const [rendimento, setRendimento] = useState(52);
  const [valorArrobaConfig, setValorArrobaConfig] = useState(300);

  const toArroba = (p: number) => (p * rendimento / 100 / 15).toFixed(2);
  const toValorEst = (p: number) => (p * rendimento / 100 / 15) * valorArrobaConfig;
  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    const [a, p, s, m, r, prof] = await Promise.all([
      supabase.from("animais" as any).select("*, raca:racas!raca_id(nome), pasto:pastos!pasto_id(nome), lote:lotes!lote_id(nome)").eq("id", id).single(),
      supabase.from("pesagens" as any).select("*").eq("animal_id", id).order("data", { ascending: true }),
      supabase.from("aplicacoes_sanitarias" as any).select("*, medicamento:medicamentos!medicamento_id(nome, tipo)").eq("animal_id", id).order("data_aplicacao", { ascending: false }),
      supabase.from("movimentacoes_gado" as any).select("*").eq("animal_id", id).order("data", { ascending: false }),
      supabase.from("reproducao" as any).select("*, femea:animais!femea_id(brinco), macho:animais!macho_id(brinco), bezerro:animais!bezerro_id(brinco)")
        .or(`femea_id.eq.${id},macho_id.eq.${id}`).order("data_cobertura", { ascending: false }),
      supabase.from("profiles").select("rendimento_carcaca, valor_arroba").eq("user_id", user.id).single(),
    ]);
    setAnimal((a.data as any));
    setPesagens((p.data as any) || []);
    setSanidade((s.data as any) || []);
    setMovs((m.data as any) || []);
    setRepro((r.data as any) || []);
    if (prof.data) {
      if (prof.data.rendimento_carcaca) setRendimento(Number(prof.data.rendimento_carcaca));
      if ((prof.data as any).valor_arroba) setValorArrobaConfig(Number((prof.data as any).valor_arroba));
    }
  }, [user, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePesagem = async () => {
    if (!user || !id || !pesoNovo) return;
    const peso = parseFloat(pesoNovo);
    let gmd: number | null = null;
    if (pesagens.length > 0) {
      const last = pesagens[pesagens.length - 1];
      const days = Math.max(1, (new Date(dataPesagem).getTime() - new Date(last.data).getTime()) / 86400000);
      gmd = (peso - Number(last.peso_kg)) / days;
    }
    await supabase.from("pesagens" as any).insert({ animal_id: id, data: dataPesagem, peso_kg: peso, gmd, user_id: user.id } as any);
    await supabase.from("animais" as any).update({ peso_atual: peso } as any).eq("id", id);
    toast.success(`Pesagem registrada.${gmd !== null ? ` GMD: ${gmd.toFixed(2)} kg/dia` : ""}`);
    setOpenPesagem(false); setPesoNovo(""); fetchData();
  };

  if (!animal) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const chartData = pesagens.map(p => ({ data: new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), peso: Number(p.peso_kg) }));

  const fields = [
    ["Raça", animal.raca?.nome || "—"], ["Sexo", animal.sexo === "macho" ? "Macho" : "Fêmea"],
    ["Cor", animal.cor || "—"], ["Data de Nascimento", animal.data_nascimento ? new Date(animal.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"],
    ["Idade", animal.data_nascimento ? calcAge(animal.data_nascimento) : "—"],
    ["Data de Entrada", new Date(animal.data_entrada + "T12:00:00").toLocaleDateString("pt-BR")],
    ["Origem", animal.origem === "comprado" ? "Comprado" : "Nascido na fazenda"],
    ["Brinco do Pai", animal.pai_brinco || "—"], ["Brinco da Mãe", animal.mae_brinco || "—"],
    ["Pasto", animal.pasto?.nome || "—"], ["Lote", animal.lote?.nome || "—"],
    ["Peso Atual", animal.peso_atual ? `${Number(animal.peso_atual).toFixed(1)} kg (${toArroba(Number(animal.peso_atual))} @)` : "—"],
    ["Valor Estimado", animal.peso_atual ? fmtBRL(toValorEst(Number(animal.peso_atual))) : "—"],
  ];

  const gmdColor = (g: number) => g > 0.5 ? "text-green-600" : g >= 0.3 ? "text-yellow-600" : "text-red-600";
  const medBadge: Record<string, string> = { vacina: "bg-green-100 text-green-700", medicamento: "bg-blue-100 text-blue-700", vermifugo: "bg-yellow-100 text-yellow-700" };
  const diagBadge: Record<string, string> = { prenha: "bg-green-100 text-green-700", vazia: "bg-red-100 text-red-700", pendente: "bg-yellow-100 text-yellow-700" };

  return (
    <div className="animate-fade-in space-y-6">
      <Button variant="ghost" className="gap-2 -ml-2" onClick={() => navigate("/gado/animais")}>
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[28px] font-bold font-mono">{animal.brinco}</h1>
          {animal.nome && <span className="text-xl text-muted-foreground">{animal.nome}</span>}
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CAT_BADGE[animal.categoria] || ""}`}>{animal.categoria}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[animal.status] || ""}`}>{animal.status}</span>
        </div>
        <Button onClick={() => setOpenPesagem(true)} className="gap-2"><Scale className="h-4 w-4" /> Registrar Pesagem</Button>
      </div>

      <Card className="border-[#E5E7EB]">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {fields.map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
                <p className="text-sm font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pesagens">
        <TabsList>
          <TabsTrigger value="pesagens">Pesagens</TabsTrigger>
          <TabsTrigger value="sanidade">Sanidade</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="reproducao">Reprodução</TabsTrigger>
        </TabsList>

        <TabsContent value="pesagens" className="space-y-4">
          {chartData.length > 1 && (
            <Card className="border-[#E5E7EB]"><CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="data" /><YAxis /><RTooltip /><Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot /></LineChart>
              </ResponsiveContainer>
            </CardContent></Card>
          )}
          <Card className="border-[#E5E7EB]"><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Data</th><th className="px-4 py-3">Peso KG</th><th className="px-4 py-3">Peso @</th><th className="px-4 py-3">GMD</th>
              </tr></thead>
              <tbody>
                {pesagens.slice().reverse().map((p: any) => (
                  <tr key={p.id} className="border-b">
                    <td className="px-4 py-2">{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-2">{Number(p.peso_kg).toFixed(1)}</td>
                    <td className="px-4 py-2">{toArroba(Number(p.peso_kg))}</td>
                    <td className={`px-4 py-2 font-bold ${p.gmd != null ? gmdColor(Number(p.gmd)) : ""}`}>{p.gmd != null ? Number(p.gmd).toFixed(2) : "—"}</td>
                  </tr>
                ))}
                {pesagens.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma pesagem</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="sanidade">
          <Card className="border-[#E5E7EB]"><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Data</th><th className="px-4 py-3">Medicamento</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Dose</th><th className="px-4 py-3">Próx. Dose</th>
              </tr></thead>
              <tbody>
                {sanidade.map((s: any) => {
                  const vencida = s.proxima_dose && new Date(s.proxima_dose) < new Date();
                  return (
                    <tr key={s.id} className={`border-b ${vencida ? "bg-red-50" : ""}`}>
                      <td className="px-4 py-2">{new Date(s.data_aplicacao + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-2">{s.medicamento?.nome}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${medBadge[s.medicamento?.tipo] || ""}`}>{s.medicamento?.tipo}</span></td>
                      <td className="px-4 py-2">{s.dose || "—"}</td>
                      <td className={`px-4 py-2 ${vencida ? "text-red-600 font-bold" : ""}`}>{s.proxima_dose ? new Date(s.proxima_dose + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    </tr>
                  );
                })}
                {sanidade.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma aplicação</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card className="border-[#E5E7EB]"><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Data</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Peso</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Obs</th>
              </tr></thead>
              <tbody>
                {movs.map((m: any) => (
                  <tr key={m.id} className="border-b">
                    <td className="px-4 py-2">{new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100">{m.tipo}</span></td>
                    <td className="px-4 py-2">{m.peso_kg ? `${Number(m.peso_kg).toFixed(1)} kg` : "—"}</td>
                    <td className="px-4 py-2">{m.valor_total ? Number(m.valor_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
                    <td className="px-4 py-2">{m.observacao || "—"}</td>
                  </tr>
                ))}
                {movs.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma movimentação</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reproducao">
          <Card className="border-[#E5E7EB]"><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Data Cobertura</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Touro/Sêmen</th>
                <th className="px-4 py-3">Diagnóstico</th><th className="px-4 py-3">Parto Prev.</th><th className="px-4 py-3">Bezerro</th>
              </tr></thead>
              <tbody>
                {repro.map((r: any) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-2">{new Date(r.data_cobertura + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-2">{r.tipo === "monta_natural" ? "Monta Natural" : "Inseminação"}</td>
                    <td className="px-4 py-2">{r.macho?.brinco || r.semen_info || "—"}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diagBadge[r.diagnostico] || ""}`}>{r.diagnostico}</span></td>
                    <td className="px-4 py-2">{r.data_parto_prevista ? new Date(r.data_parto_prevista + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="px-4 py-2">{r.bezerro?.brinco || "—"}</td>
                  </tr>
                ))}
                {repro.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Modal Pesagem */}
      <Dialog open={openPesagem} onOpenChange={setOpenPesagem}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Pesagem</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={dataPesagem} onChange={e => setDataPesagem(e.target.value)} /></div>
            <div className="space-y-2"><Label>Peso (KG)</Label><Input type="number" value={pesoNovo} onChange={e => setPesoNovo(e.target.value)} placeholder="Ex: 450" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpenPesagem(false)}>Cancelar</Button>
            <Button onClick={handlePesagem}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
