import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Map, Grid3X3, BookOpen, TrendingUp, CheckCircle, Package, Cog, Bug, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#16A34A", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

export default function LavouraDashboard() {
  const { user } = useAuth();
  const [safras, setSafras] = useState<any[]>([]);
  const [selectedSafra, setSelectedSafra] = useState<string>("all");
  const [periodo, setPeriodo] = useState("mes");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [kpis, setKpis] = useState({ area: 0, talhoes: 0, atividades: 0, produtividade: 0 });
  const [prodByTalhao, setProdByTalhao] = useState<any[]>([]);
  const [culturasDist, setCulturasDist] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [custoData, setCustoData] = useState<any[]>([]);

  const getDateRange = useCallback(() => {
    const now = new Date();
    const fmtD = (d: Date) => d.toISOString().split("T")[0];
    if (periodo === "personalizado") {
      return { start: customStart || fmtD(new Date(now.getFullYear(), 0, 1)), end: customEnd || fmtD(now) };
    }
    let start: Date;
    if (periodo === "mes") { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (periodo === "3meses") { start = new Date(now.getFullYear(), now.getMonth() - 2, 1); }
    else if (periodo === "6meses") { start = new Date(now.getFullYear(), now.getMonth() - 5, 1); }
    else { start = new Date(now.getFullYear(), 0, 1); }
    return { start: fmtD(start), end: fmtD(now) };
  }, [periodo, customStart, customEnd]);

  useEffect(() => {
    if (!user) return;
    supabase.from("safras" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }: any) => {
        const list = (data as any[]) || [];
        setSafras(list);
        if (list.length > 0) setSelectedSafra(list[0].id);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user, selectedSafra, periodo, customStart, customEnd]);

  const loadDashboard = async () => {
    if (!user) return;

    // KPIs
    let stQuery = supabase.from("safra_talhoes" as any).select("*, talhoes:talhao_id(nome, area_hectares), culturas:cultura_id(nome)").eq("user_id", user.id);
    if (selectedSafra !== "all") stQuery = stQuery.eq("safra_id", selectedSafra);
    const { data: stData } = await stQuery;
    const safraTalhoes = (stData as any[]) || [];

    const totalArea = safraTalhoes.reduce((s, st) => s + (Number((st as any).talhoes?.area_hectares) || 0), 0);

    // Atividades no mês
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    const { count: atividadesCount } = await supabase.from("atividades_campo" as any).select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("data", firstDay).lte("data", lastDay);

    // Produtividade
    const stIds = safraTalhoes.map((st: any) => st.id);
    let prodMedia = 0;
    let prodData: any[] = [];
    if (stIds.length > 0) {
      const { data: colheitas } = await supabase.from("colheitas" as any).select("*, safra_talhoes:safra_talhao_id(talhoes:talhao_id(nome), meta_produtividade)").eq("user_id", user.id).in("safra_talhao_id", stIds);
      const cols = (colheitas as any[]) || [];
      if (cols.length > 0) {
        prodMedia = cols.reduce((s, c) => s + (Number(c.produtividade_calculada) || 0), 0) / cols.length;
        const byTalhao: Record<string, { prod: number; meta: number; count: number }> = {};
        cols.forEach((c: any) => {
          const nome = c.safra_talhoes?.talhoes?.nome || "?";
          if (!byTalhao[nome]) byTalhao[nome] = { prod: 0, meta: Number(c.safra_talhoes?.meta_produtividade) || 0, count: 0 };
          byTalhao[nome].prod += Number(c.produtividade_calculada) || 0;
          byTalhao[nome].count++;
        });
        prodData = Object.entries(byTalhao).map(([nome, v]) => ({ nome, produtividade: v.count > 0 ? v.prod / v.count : 0, meta: v.meta }));
      }
    }
    setProdByTalhao(prodData);

    // Culturas distribution
    const cultMap: Record<string, number> = {};
    safraTalhoes.forEach((st: any) => {
      const cName = st.culturas?.nome || "Outra";
      const area = Number(st.talhoes?.area_hectares) || 0;
      cultMap[cName] = (cultMap[cName] || 0) + area;
    });
    setCulturasDist(Object.entries(cultMap).map(([name, value]) => ({ name, value })));

    setKpis({ area: totalArea, talhoes: safraTalhoes.length, atividades: atividadesCount || 0, produtividade: prodMedia });

    // Recent activities
    const { data: acts } = await supabase.from("atividades_campo" as any).select("*, safra_talhoes:safra_talhao_id(talhoes:talhao_id(nome)), insumos:insumo_id(nome)").eq("user_id", user.id).order("data", { ascending: false }).limit(5);
    setRecentActivities((acts as any[]) || []);

    // Alerts
    const alertsList: any[] = [];
    const { data: lowStock } = await supabase.from("insumos" as any).select("nome, estoque_atual, estoque_minimo").eq("user_id", user.id);
    ((lowStock as any[]) || []).filter(i => Number(i.estoque_atual) < Number(i.estoque_minimo)).forEach(i => {
      alertsList.push({ icon: "package", text: `Estoque baixo: ${i.nome}`, color: "red" });
    });
    const today = new Date().toISOString().split("T")[0];
    const { data: overdueMaint } = await supabase.from("manutencoes" as any).select("*, maquinas:maquina_id(nome)").eq("user_id", user.id).lt("proxima_manutencao", today).not("proxima_manutencao", "is", null);
    ((overdueMaint as any[]) || []).forEach(m => {
      alertsList.push({ icon: "cog", text: `Manutenção atrasada: ${m.maquinas?.nome}`, color: "red" });
    });
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const { data: critMip } = await supabase.from("ocorrencias_mip" as any).select("*, safra_talhoes:safra_talhao_id(talhoes:talhao_id(nome))").eq("user_id", user.id).in("nivel", ["alto", "critico"]).gte("data", weekAgo);
    ((critMip as any[]) || []).forEach(o => {
      alertsList.push({ icon: "bug", text: `Praga crítica no ${o.safra_talhoes?.talhoes?.nome || "talhão"}`, color: "red" });
    });
    setAlerts(alertsList);

    // Custo de produção
    if (safraTalhoes.length > 0) {
      const stIds2 = safraTalhoes.map((st: any) => st.id);
      const { data: ativsCusto } = await supabase.from("atividades_campo" as any)
        .select("safra_talhao_id, quantidade_insumo, horas_maquina, insumos:insumo_id(preco_unitario), maquinas:maquina_id(custo_hora)")
        .eq("user_id", user.id).in("safra_talhao_id", stIds2);
      const { data: colsCusto } = await supabase.from("colheitas" as any)
        .select("safra_talhao_id, quantidade").eq("user_id", user.id).in("safra_talhao_id", stIds2);

      const custoRows = safraTalhoes.map((st: any) => {
        const area = Number(st.talhoes?.area_hectares) || 1;
        const myAtivs = ((ativsCusto as any[]) || []).filter(a => a.safra_talhao_id === st.id);
        const custoInsumos = myAtivs.reduce((s: number, a: any) => s + ((Number(a.quantidade_insumo) || 0) * (Number(a.insumos?.preco_unitario) || 0)), 0);
        const custoMaq = myAtivs.reduce((s: number, a: any) => s + ((Number(a.horas_maquina) || 0) * (Number(a.maquinas?.custo_hora) || 0)), 0);
        const custoTotal = custoInsumos + custoMaq;
        const colTotal = ((colsCusto as any[]) || []).filter(c => c.safra_talhao_id === st.id).reduce((s: number, c: any) => s + Number(c.quantidade), 0);
        return {
          talhao: st.talhoes?.nome || "?", cultura: st.culturas?.nome || "?", area,
          custoInsumos, custoMaq, custoTotal, custoHa: custoTotal / area,
          producao: colTotal, custoSaca: colTotal > 0 ? custoTotal / colTotal : 0,
          resultado: 0 - custoTotal,
        };
      });
      setCustoData(custoRows);
    } else {
      setCustoData([]);
    }
  };

  const tipoBadge = (tipo: string) => {
    const map: Record<string, string> = {
      plantio: "bg-green-800 text-white", adubacao: "bg-blue-100 text-blue-800",
      pulverizacao: "bg-red-100 text-red-800", irrigacao: "bg-cyan-100 text-cyan-800",
      capina: "bg-yellow-100 text-yellow-800", colheita: "bg-amber-100 text-amber-800",
      outro: "bg-gray-100 text-gray-800",
    };
    return map[tipo] || map.outro;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Dashboard da Lavoura</h1>
        <Select value={selectedSafra} onValueChange={setSelectedSafra}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Safra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Safras</SelectItem>
            {safras.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Área Plantada", value: `${kpis.area.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ha`, icon: Map, color: "text-green-600", bg: "bg-green-50" },
          { label: "Talhões Ativos", value: kpis.talhoes, icon: Grid3X3, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Atividades no Mês", value: kpis.atividades, icon: BookOpen, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Produtividade Média", value: kpis.produtividade > 0 ? `${kpis.produtividade.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sacas/ha` : "—", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-[#E5E7EB]">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base">Produtividade por Talhão</CardTitle></CardHeader>
          <CardContent>
            {prodByTalhao.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Registre colheitas para ver a produtividade por talhão.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={prodByTalhao} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)} sacas/ha`} />
                  <Bar dataKey="produtividade" fill="#16A34A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base">Culturas na Safra</CardTitle></CardHeader>
          <CardContent>
            {culturasDist.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Vincule talhões a uma safra para ver a distribuição.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={culturasDist} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value.toFixed(1)} ha`}>
                    {culturasDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)} ha`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base">Últimas Atividades</CardTitle></CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada.</p>
            ) : (
              <div className="space-y-2">
                {recentActivities.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground w-20 shrink-0">{new Date(a.data).toLocaleDateString("pt-BR")}</span>
                    <span className="text-sm font-medium truncate">{a.safra_talhoes?.talhoes?.nome || "—"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tipoBadge(a.tipo)}`}>{a.tipo}</span>
                    <span className="text-sm text-muted-foreground truncate ml-auto">{a.insumos?.nome || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base">Alertas</CardTitle></CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle className="h-10 w-10 text-green-500" />
                <p className="text-sm text-muted-foreground">Tudo em ordem!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    {a.icon === "package" && <Package className="h-4 w-4 text-red-500 shrink-0" />}
                    {a.icon === "cog" && <Cog className="h-4 w-4 text-red-500 shrink-0" />}
                    {a.icon === "bug" && <Bug className="h-4 w-4 text-red-500 shrink-0" />}
                    <span className="text-sm text-foreground">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custo de Produção */}
      {custoData.length > 0 && (
        <Card className="border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base">Custo de Produção por Talhão</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[11px] uppercase">Talhão</TableHead>
                <TableHead className="text-[11px] uppercase">Cultura</TableHead>
                <TableHead className="text-[11px] uppercase">Área (ha)</TableHead>
                <TableHead className="text-[11px] uppercase">Custo Insumos</TableHead>
                <TableHead className="text-[11px] uppercase">Custo Máquinas</TableHead>
                <TableHead className="text-[11px] uppercase">Custo Total</TableHead>
                <TableHead className="text-[11px] uppercase">Custo/ha</TableHead>
                <TableHead className="text-[11px] uppercase">Produção</TableHead>
                <TableHead className="text-[11px] uppercase">Custo/saca</TableHead>
                <TableHead className="text-[11px] uppercase">Resultado</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {custoData.map((r: any, i: number) => (
                  <TableRow key={i} className="hover:bg-[#F8FAFC]">
                    <TableCell className="font-medium">{r.talhao}</TableCell>
                    <TableCell>{r.cultura}</TableCell>
                    <TableCell>{r.area.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</TableCell>
                    <TableCell>R$ {r.custoInsumos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>R$ {r.custoMaq.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="font-medium">R$ {r.custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>R$ {r.custoHa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{r.producao > 0 ? r.producao.toLocaleString("pt-BR") + " sacas" : "—"}</TableCell>
                    <TableCell>{r.custoSaca > 0 ? `R$ ${r.custoSaca.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                    <TableCell className={r.resultado >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>R$ {r.resultado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-sm text-muted-foreground bg-[#F9FAFB] p-3 rounded-md mt-3">
              Custo Total: <strong>R$ {custoData.reduce((s: number, r: any) => s + r.custoTotal, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> | Produção Total: <strong>{custoData.reduce((s: number, r: any) => s + r.producao, 0).toLocaleString("pt-BR")} sacas</strong> | Resultado: <strong className={custoData.reduce((s: number, r: any) => s + r.resultado, 0) >= 0 ? "text-green-600" : "text-red-600"}>R$ {custoData.reduce((s: number, r: any) => s + r.resultado, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
