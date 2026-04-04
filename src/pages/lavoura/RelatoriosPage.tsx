import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { FileBarChart, Calculator, BarChart3, Package, Cog, ArrowLeft, Download } from "lucide-react";
import { exportarExcel } from "@/lib/export-excel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#16A34A", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

type Report = "none" | "custo" | "produtividade" | "insumos" | "maquinas";

export default function RelatoriosPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<Report>("none");
  const [safras, setSafras] = useState<any[]>([]);
  const [selSafra, setSelSafra] = useState("all");

  // custo data
  const [custoData, setCustoData] = useState<any[]>([]);
  // produtividade data
  const [prodData, setProdData] = useState<any[]>([]);
  // insumo data
  const [insumoData, setInsumoData] = useState<any[]>([]);
  const [insumoPie, setInsumoPie] = useState<any[]>([]);
  // maquinas data
  const [maqData, setMaqData] = useState<any[]>([]);

  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("safras" as any).select("id, nome").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setSafras((data as any[]) || []));
  }, [user]);

  useEffect(() => {
    if (!user || active === "none") return;
    if (active === "custo") loadCusto();
    if (active === "produtividade") loadProd();
    if (active === "insumos") loadInsumos();
    if (active === "maquinas") loadMaquinas();
  }, [user, active, selSafra, fDateFrom, fDateTo]);

  const loadCusto = async () => {
    if (!user) return;
    let stQ = supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome, area_hectares), culturas:cultura_id(nome), meta_produtividade").eq("user_id", user.id);
    if (selSafra !== "all") stQ = stQ.eq("safra_id", selSafra);
    const { data: stData } = await stQ;
    const sts = (stData as any[]) || [];
    if (sts.length === 0) { setCustoData([]); return; }

    const stIds = sts.map((s: any) => s.id);
    const { data: ativs } = await supabase.from("atividades_campo" as any).select("safra_talhao_id, custo_total, insumo_id, quantidade_insumo, horas_maquina, insumos:insumo_id(preco_unitario), maquinas:maquina_id(custo_hora)").eq("user_id", user.id).in("safra_talhao_id", stIds);
    const { data: cols } = await supabase.from("colheitas" as any).select("safra_talhao_id, quantidade").eq("user_id", user.id).in("safra_talhao_id", stIds);
    const { data: coms } = await supabase.from("comercializacao" as any).select("safra_id, valor_total").eq("user_id", user.id);

    const rows = sts.map((st: any) => {
      const area = Number(st.talhoes?.area_hectares) || 1;
      const myAtivs = ((ativs as any[]) || []).filter(a => a.safra_talhao_id === st.id);
      const custoInsumos = myAtivs.reduce((s, a) => s + ((Number(a.quantidade_insumo) || 0) * (Number(a.insumos?.preco_unitario) || 0)), 0);
      const custoMaq = myAtivs.reduce((s, a) => s + ((Number(a.horas_maquina) || 0) * (Number(a.maquinas?.custo_hora) || 0)), 0);
      const custoTotal = custoInsumos + custoMaq;
      const colTotal = ((cols as any[]) || []).filter(c => c.safra_talhao_id === st.id).reduce((s, c) => s + Number(c.quantidade), 0);
      return {
        talhao: st.talhoes?.nome || "?", cultura: st.culturas?.nome || "?", area,
        custoInsumos, custoMaq, custoTotal, custoHa: custoTotal / area,
        producao: colTotal, custoSaca: colTotal > 0 ? custoTotal / colTotal : 0,
        receita: 0, resultado: 0 - custoTotal,
      };
    });
    setCustoData(rows);
  };

  const loadProd = async () => {
    if (!user) return;
    let stQ = supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome), safras:safra_id(nome), meta_produtividade").eq("user_id", user.id);
    if (selSafra !== "all") stQ = stQ.eq("safra_id", selSafra);
    const { data: stData } = await stQ;
    const sts = (stData as any[]) || [];
    if (sts.length === 0) { setProdData([]); return; }
    const stIds = sts.map((s: any) => s.id);
    const { data: cols } = await supabase.from("colheitas" as any).select("safra_talhao_id, produtividade_calculada").eq("user_id", user.id).in("safra_talhao_id", stIds);
    const rows = sts.map((st: any) => {
      const myCols = ((cols as any[]) || []).filter(c => c.safra_talhao_id === st.id);
      const avg = myCols.length > 0 ? myCols.reduce((s, c) => s + (Number(c.produtividade_calculada) || 0), 0) / myCols.length : 0;
      return { talhao: st.talhoes?.nome || "?", safra: st.safras?.nome || "?", produtividade: avg, meta: Number(st.meta_produtividade) || 0 };
    }).filter(r => r.produtividade > 0);
    setProdData(rows);
  };

  const loadInsumos = async () => {
    if (!user) return;
    const { data: ativs } = await supabase.from("atividades_campo" as any)
      .select("quantidade_insumo, insumos:insumo_id(nome, categoria, preco_unitario), safra_talhoes:safra_talhao_id(talhoes:talhao_id(nome))")
      .eq("user_id", user.id).not("insumo_id", "is", null);
    const list = (ativs as any[]) || [];
    const byInsumo: Record<string, { nome: string; categoria: string; qty: number; valor: number; talhaoMax: string; talhaoQty: number }> = {};
    list.forEach((a: any) => {
      const key = a.insumos?.nome || "?";
      if (!byInsumo[key]) byInsumo[key] = { nome: key, categoria: a.insumos?.categoria || "outro", qty: 0, valor: 0, talhaoMax: "", talhaoQty: 0 };
      const q = Number(a.quantidade_insumo) || 0;
      byInsumo[key].qty += q;
      byInsumo[key].valor += q * (Number(a.insumos?.preco_unitario) || 0);
      const tn = a.safra_talhoes?.talhoes?.nome || "";
      if (q > byInsumo[key].talhaoQty) { byInsumo[key].talhaoMax = tn; byInsumo[key].talhaoQty = q; }
    });
    setInsumoData(Object.values(byInsumo));
    // pie by category
    const byCat: Record<string, number> = {};
    Object.values(byInsumo).forEach(i => { byCat[i.categoria] = (byCat[i.categoria] || 0) + i.valor; });
    setInsumoPie(Object.entries(byCat).map(([name, value]) => ({ name, value })));
  };

  const loadMaquinas = async () => {
    if (!user) return;
    const { data: ativs } = await supabase.from("atividades_campo" as any)
      .select("horas_maquina, maquinas:maquina_id(id, nome, custo_hora)").eq("user_id", user.id).not("maquina_id", "is", null);
    const { data: mants } = await supabase.from("manutencoes" as any).select("maquina_id, custo, maquinas:maquina_id(nome)").eq("user_id", user.id);

    const byMaq: Record<string, { nome: string; horas: number; custoOp: number; manuCount: number; custoManu: number }> = {};
    ((ativs as any[]) || []).forEach((a: any) => {
      const key = a.maquinas?.id || "?";
      if (!byMaq[key]) byMaq[key] = { nome: a.maquinas?.nome || "?", horas: 0, custoOp: 0, manuCount: 0, custoManu: 0 };
      const h = Number(a.horas_maquina) || 0;
      byMaq[key].horas += h;
      byMaq[key].custoOp += h * (Number(a.maquinas?.custo_hora) || 0);
    });
    ((mants as any[]) || []).forEach((m: any) => {
      const key = m.maquina_id;
      if (!byMaq[key]) byMaq[key] = { nome: m.maquinas?.nome || "?", horas: 0, custoOp: 0, manuCount: 0, custoManu: 0 };
      byMaq[key].manuCount++;
      byMaq[key].custoManu += Number(m.custo) || 0;
    });
    setMaqData(Object.values(byMaq));
  };

  const exportRelatorio = (nomeArquivo: string, titulo: string, colunas: { header: string; key: string; width: number; tipo?: "texto" | "moeda" | "numero" }[], dados: Record<string, any>[]) => {
    exportarExcel({ nomeArquivo, titulo, colunas, dados });
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const reports = [
    { id: "custo" as Report, title: "Custo de Produção por Talhão", icon: Calculator, desc: "Veja o custo detalhado de insumos, máquinas e o resultado de cada talhão na safra." },
    { id: "produtividade" as Report, title: "Comparativo de Produtividade", icon: BarChart3, desc: "Compare a produtividade entre talhões e safras." },
    { id: "insumos" as Report, title: "Consumo de Insumos", icon: Package, desc: "Analise o consumo de insumos por talhão, tipo e período." },
    { id: "maquinas" as Report, title: "Histórico de Máquinas", icon: Cog, desc: "Acompanhe horas trabalhadas, custos e manutenções do maquinário." },
  ];

  if (active !== "none") {
    const r = reports.find(r => r.id === active)!;
    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setActive("none")}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-2xl font-bold text-foreground">{r.title}</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={selSafra} onValueChange={setSelSafra}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Safra" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas Safras</SelectItem>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
          </Select>
          {(active === "insumos" || active === "maquinas") && (
            <>
              <Input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} className="w-[150px]" placeholder="De" />
              <Input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} className="w-[150px]" placeholder="Até" />
            </>
          )}
        </div>

        {/* Custo Report */}
        {active === "custo" && (
          <>
            <div className="flex justify-end"><Button variant="outline" size="sm" className="gap-2" onClick={() => exportRelatorio(
              "custo-producao", "Custo de Produção por Talhão",
              [{ header: "Talhão", key: "talhao", width: 20, tipo: "texto" }, { header: "Cultura", key: "cultura", width: 20, tipo: "texto" }, { header: "Área ha", key: "area", width: 12, tipo: "numero" }, { header: "Custo Insumos", key: "custoInsumos", width: 18, tipo: "moeda" }, { header: "Custo Máquinas", key: "custoMaq", width: 18, tipo: "moeda" }, { header: "Custo Total", key: "custoTotal", width: 18, tipo: "moeda" }, { header: "Custo/ha", key: "custoHa", width: 15, tipo: "moeda" }, { header: "Produção", key: "producao", width: 15, tipo: "numero" }, { header: "Custo/saca", key: "custoSaca", width: 15, tipo: "moeda" }],
              custoData
            )}><Download className="h-4 w-4" />Excel</Button></div>
            <Table>
              <TableHeader><TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[11px] uppercase">Talhão</TableHead><TableHead className="text-[11px] uppercase">Cultura</TableHead>
                <TableHead className="text-[11px] uppercase">Área (ha)</TableHead><TableHead className="text-[11px] uppercase">Custo Insumos</TableHead>
                <TableHead className="text-[11px] uppercase">Custo Máquinas</TableHead><TableHead className="text-[11px] uppercase">Custo Total</TableHead>
                <TableHead className="text-[11px] uppercase">Custo/ha</TableHead><TableHead className="text-[11px] uppercase">Produção</TableHead>
                <TableHead className="text-[11px] uppercase">Custo/saca</TableHead><TableHead className="text-[11px] uppercase">Resultado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {custoData.map((r, i) => (
                  <TableRow key={i} className="hover:bg-[#F8FAFC]">
                    <TableCell className="font-medium">{r.talhao}</TableCell><TableCell>{r.cultura}</TableCell>
                    <TableCell>{r.area.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</TableCell>
                    <TableCell>R$ {fmt(r.custoInsumos)}</TableCell><TableCell>R$ {fmt(r.custoMaq)}</TableCell>
                    <TableCell className="font-medium">R$ {fmt(r.custoTotal)}</TableCell><TableCell>R$ {fmt(r.custoHa)}</TableCell>
                    <TableCell>{r.producao > 0 ? r.producao.toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell>{r.custoSaca > 0 ? `R$ ${fmt(r.custoSaca)}` : "—"}</TableCell>
                    <TableCell className={r.resultado >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>R$ {fmt(r.resultado)}</TableCell>
                  </TableRow>
                ))}
                {custoData.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Sem dados.</TableCell></TableRow>}
              </TableBody>
            </Table>
            {custoData.length > 0 && (
              <div className="text-sm text-muted-foreground bg-[#F9FAFB] p-3 rounded-md">
                Custo Total: <strong>R$ {fmt(custoData.reduce((s, r) => s + r.custoTotal, 0))}</strong> | Produção Total: <strong>{custoData.reduce((s, r) => s + r.producao, 0).toLocaleString("pt-BR")} sacas</strong> | Resultado: <strong className={custoData.reduce((s, r) => s + r.resultado, 0) >= 0 ? "text-green-600" : "text-red-600"}>R$ {fmt(custoData.reduce((s, r) => s + r.resultado, 0))}</strong>
              </div>
            )}
          </>
        )}

        {/* Produtividade Report */}
        {active === "produtividade" && (
          <>
            {prodData.length > 0 ? (
              <Card className="border-[#E5E7EB]"><CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={prodData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="talhao" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)} sacas/ha`} />
                    <Bar dataKey="produtividade" fill="#16A34A" name="Real" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="meta" fill="#3B82F6" name="Meta" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent></Card>
            ) : <p className="text-center text-muted-foreground py-8">Registre colheitas para ver o comparativo.</p>}
            <div className="flex justify-end"><Button variant="outline" size="sm" className="gap-2" onClick={() => exportRelatorio(
              "produtividade", "Comparativo de Produtividade",
              [{ header: "Talhão", key: "talhao", width: 20, tipo: "texto" }, { header: "Safra", key: "safra", width: 20, tipo: "texto" }, { header: "Produtividade", key: "produtividade", width: 15, tipo: "numero" }, { header: "Meta", key: "meta", width: 15, tipo: "numero" }],
              prodData
            )}><Download className="h-4 w-4" />Excel</Button></div>
          </>
        )}

        {/* Insumos Report */}
        {active === "insumos" && (
          <>
            {insumoPie.length > 0 && (
              <Card className="border-[#E5E7EB]"><CardHeader><CardTitle className="text-base">Consumo por Categoria (R$)</CardTitle></CardHeader><CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={insumoPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: R$ ${fmt(value)}`}>
                      {insumoPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `R$ ${fmt(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent></Card>
            )}
            <Table>
              <TableHeader><TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[11px] uppercase">Insumo</TableHead><TableHead className="text-[11px] uppercase">Categoria</TableHead>
                <TableHead className="text-[11px] uppercase">Qtd Total</TableHead><TableHead className="text-[11px] uppercase">Valor Total</TableHead>
                <TableHead className="text-[11px] uppercase">Talhão + consumo</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {insumoData.map((r, i) => (
                  <TableRow key={i} className="hover:bg-[#F8FAFC]">
                    <TableCell className="font-medium">{r.nome}</TableCell><TableCell>{r.categoria}</TableCell>
                    <TableCell>{r.qty.toLocaleString("pt-BR")}</TableCell><TableCell>R$ {fmt(r.valor)}</TableCell>
                    <TableCell>{r.talhaoMax || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end"><Button variant="outline" size="sm" className="gap-2" onClick={() => exportRelatorio(
              "consumo-insumos", "Consumo de Insumos",
              [{ header: "Insumo", key: "nome", width: 25, tipo: "texto" }, { header: "Categoria", key: "categoria", width: 20, tipo: "texto" }, { header: "Qtd Total", key: "qty", width: 15, tipo: "numero" }, { header: "Valor Total", key: "valor", width: 18, tipo: "moeda" }, { header: "Talhão", key: "talhaoMax", width: 20, tipo: "texto" }],
              insumoData
            )}><Download className="h-4 w-4" />Excel</Button></div>
          </>
        )}

        {/* Máquinas Report */}
        {active === "maquinas" && (
          <>
            <Table>
              <TableHeader><TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[11px] uppercase">Máquina</TableHead><TableHead className="text-[11px] uppercase">Horas Totais</TableHead>
                <TableHead className="text-[11px] uppercase">Custo Operacional</TableHead><TableHead className="text-[11px] uppercase">Manutenções</TableHead>
                <TableHead className="text-[11px] uppercase">Custo Manutenções</TableHead><TableHead className="text-[11px] uppercase">Custo Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {maqData.map((r, i) => (
                  <TableRow key={i} className="hover:bg-[#F8FAFC]">
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>{r.horas.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} h</TableCell>
                    <TableCell>R$ {fmt(r.custoOp)}</TableCell><TableCell>{r.manuCount}</TableCell>
                    <TableCell>R$ {fmt(r.custoManu)}</TableCell>
                    <TableCell className="font-medium">R$ {fmt(r.custoOp + r.custoManu)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end"><Button variant="outline" size="sm" className="gap-2" onClick={() => exportCSV(
              ["Máquina","Horas","Custo Operacional","Manutenções","Custo Manutenções","Custo Total"],
              maqData.map(r => [r.nome, String(r.horas), fmt(r.custoOp), String(r.manuCount), fmt(r.custoManu), fmt(r.custoOp + r.custoManu)])
            )}><Download className="h-4 w-4" />CSV</Button></div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Relatórios da Lavoura</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map(r => (
          <Card key={r.id} className="border-[#E5E7EB] cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActive(r.id)}>
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                <r.icon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{r.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{r.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
