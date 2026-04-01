import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { List, Scale, Baby, Skull, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  vaca: "#EC4899", touro: "#3B82F6", bezerro: "#34D399", bezerra: "#6EE7B7",
  novilha: "#FBBF24", boi: "#6B7280",
};
const CATEGORY_LABELS: Record<string, string> = {
  vaca: "Vacas", touro: "Touros", bezerro: "Bezerros", bezerra: "Bezerras",
  novilha: "Novilhas", boi: "Bois",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function GadoDashboard() {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState("mes");
  const [animais, setAnimais] = useState<any[]>([]);
  const [movs, setMovs] = useState<any[]>([]);
  const [vacinas, setVacinas] = useState<any[]>([]);
  const [rendimento, setRendimento] = useState(52);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    if (periodo === "mes") { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (periodo === "3meses") { start = new Date(now.getFullYear(), now.getMonth() - 3, 1); }
    else { start = new Date(now.getFullYear(), 0, 1); }
    return { start: start.toISOString().split("T")[0], end: now.toISOString().split("T")[0] };
  }, [periodo]);

  useEffect(() => {
    if (!user) return;
    const { start, end } = getDateRange();

    supabase.from("animais" as any).select("*").eq("user_id", user.id).eq("status", "ativo").then(({ data }) => setAnimais((data as any) || []));
    supabase.from("movimentacoes_gado" as any).select("*").eq("user_id", user.id).gte("data", start).lte("data", end).order("data", { ascending: false }).then(({ data }) => setMovs((data as any) || []));

    // Próximas vacinas (15 dias)
    const in15 = new Date(); in15.setDate(in15.getDate() + 15);
    supabase.from("aplicacoes_sanitarias" as any).select("*, animal:animais!animal_id(brinco,nome), medicamento:medicamentos!medicamento_id(nome)")
      .eq("user_id", user.id).not("proxima_dose", "is", null).lte("proxima_dose", in15.toISOString().split("T")[0]).order("proxima_dose")
      .limit(5).then(({ data }) => setVacinas((data as any) || []));

    supabase.from("profiles").select("rendimento_carcaca").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.rendimento_carcaca) setRendimento(Number(data.rendimento_carcaca)); });
  }, [user, getDateRange]);

  const totalCabecas = animais.length;
  const pesoMedio = totalCabecas > 0 ? animais.reduce((s, a) => s + (Number(a.peso_atual) || 0), 0) / totalCabecas : 0;
  const nascimentos = movs.filter(m => m.tipo === "nascimento").length;
  const mortes = movs.filter(m => m.tipo === "morte").length;

  // Composição
  const composicao = Object.entries(
    animais.reduce((acc, a) => { acc[a.categoria] = (acc[a.categoria] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: CATEGORY_LABELS[name] || name, value, color: CATEGORY_COLORS[name] || "#999" }));

  // Valor estimado
  const totalArrobas = animais.reduce((s, a) => s + ((Number(a.peso_atual) || 0) * rendimento / 100 / 15), 0);
  const valorArroba = 300;
  const valorEstimado = totalArrobas * valorArroba;

  const today = new Date().toISOString().split("T")[0];
  const recentMovs = movs.slice(0, 5);

  const kpis = [
    { label: "TOTAL DE CABEÇAS", value: totalCabecas.toString(), icon: List, color: "text-green-600", bgColor: "bg-green-100" },
    { label: "PESO MÉDIO", value: `${pesoMedio.toFixed(1)} kg`, icon: Scale, color: "text-blue-600", bgColor: "bg-blue-100" },
    { label: "NASCIMENTOS", value: nascimentos.toString(), icon: Baby, color: "text-emerald-600", bgColor: "bg-emerald-100" },
    { label: "MORTES", value: mortes.toString(), icon: Skull, color: "text-red-600", bgColor: "bg-red-100" },
  ];

  const tipoBadge: Record<string, string> = {
    compra: "bg-blue-100 text-blue-700", venda: "bg-green-100 text-green-700",
    nascimento: "bg-cyan-100 text-cyan-700", morte: "bg-red-100 text-red-700",
    transferencia: "bg-gray-100 text-gray-700",
  };
  const tipoLabel: Record<string, string> = {
    compra: "Compra", venda: "Venda", nascimento: "Nascimento", morte: "Morte", transferencia: "Transferência",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Pecuário</h1>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Este Mês</SelectItem>
            <SelectItem value="3meses">Últimos 3 Meses</SelectItem>
            <SelectItem value="ano">Este Ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="border-[#E5E7EB]">
            <CardContent className="pt-6 pb-4 px-5">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${k.bgColor} flex items-center justify-center shrink-0`}>
                  <k.icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</p>
                  <p className="text-[26px] font-bold text-foreground leading-tight">{k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base">Composição do Rebanho</CardTitle></CardHeader>
          <CardContent>
            {composicao.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-12">Nenhum animal cadastrado</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative w-[200px] h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={composicao} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={2}>
                        {composicao.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v} cab.`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{totalCabecas}</p>
                      <p className="text-xs text-muted-foreground">cabeças</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {composicao.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                        <span>{c.name}</span>
                      </div>
                      <span className="font-medium">{c.value as number} ({totalCabecas > 0 ? ((c.value as number / totalCabecas) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base">Valor Estimado do Rebanho</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de Arrobas</p>
              <p className="text-2xl font-bold text-foreground">{totalArrobas.toFixed(1)} @</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Estimado</p>
              <p className="text-2xl font-bold text-green-600">{fmt(valorEstimado)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Base: rendimento {rendimento}% | @ R$ {valorArroba.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base flex items-center gap-2">Próximas Vacinas
            {vacinas.length > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{vacinas.length}</span>}
          </CardTitle></CardHeader>
          <CardContent>
            {vacinas.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm">Nenhuma vacina pendente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Animal</th><th className="pb-2 font-medium">Medicamento</th>
                    <th className="pb-2 font-medium">Próx. Dose</th><th className="pb-2 font-medium">Dias</th>
                  </tr></thead>
                  <tbody>
                    {vacinas.map((v: any) => {
                      const dias = Math.ceil((new Date(v.proxima_dose).getTime() - Date.now()) / 86400000);
                      const bg = dias < 0 ? "bg-red-50" : dias < 3 ? "bg-yellow-50" : "";
                      return (
                        <tr key={v.id} className={`border-b ${bg}`}>
                          <td className="py-2 font-mono">{v.animal?.brinco}</td>
                          <td className="py-2">{v.medicamento?.nome}</td>
                          <td className="py-2">{new Date(v.proxima_dose + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                          <td className={`py-2 font-bold ${dias < 0 ? "text-red-600" : dias < 3 ? "text-yellow-600" : ""}`}>{dias}d</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base">Últimas Movimentações</CardTitle></CardHeader>
          <CardContent>
            {recentMovs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma movimentação no período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Data</th><th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Qtd</th><th className="pb-2 font-medium">Valor</th>
                  </tr></thead>
                  <tbody>
                    {recentMovs.map((m: any) => (
                      <tr key={m.id} className="border-b">
                        <td className="py-2">{new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</td>
                        <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoBadge[m.tipo] || ""}`}>{tipoLabel[m.tipo]}</span></td>
                        <td className="py-2">{m.quantidade}</td>
                        <td className="py-2">{m.valor_total ? fmt(Number(m.valor_total)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
