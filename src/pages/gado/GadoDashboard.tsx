import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { List, Scale, Baby, Skull, CheckCircle, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getGreeting } from "@/lib/greeting";

const CATEGORY_COLORS: Record<string, string> = {
  vaca: "#EC4899", touro: "#3B82F6", bezerro: "#34D399", bezerra: "#6EE7B7",
  novilha: "#FBBF24", boi: "#6B7280", garrote: "#7C3AED",
};
const CATEGORY_LABELS: Record<string, string> = {
  vaca: "Vacas", touro: "Touros", bezerro: "Bezerros", bezerra: "Bezerras",
  novilha: "Novilhas", boi: "Bois", garrote: "Garrotes",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function GadoDashboard() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [periodo, setPeriodo] = useState("mes");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [animais, setAnimais] = useState<any[]>([]);
  const [movs, setMovs] = useState<any[]>([]);
  const [vacinas, setVacinas] = useState<any[]>([]);
  const [rendimento, setRendimento] = useState(52);
  const [valorArroba, setValorArroba] = useState(300);
  const [dataCotacao, setDataCotacao] = useState<string | null>(null);

  const { greeting } = getGreeting(null, user?.email);

  const getDateRange = useCallback(() => {
    const now = new Date();
    const fmtD = (d: Date) => d.toISOString().split("T")[0];
    if (periodo === "personalizado") {
      return { start: customStart || fmtD(new Date(now.getFullYear(), 0, 1)), end: customEnd || fmtD(now) };
    }
    let start: Date;
    if (periodo === "mes") { start = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (periodo === "3meses") { start = new Date(now.getFullYear(), now.getMonth() - 3, 1); }
    else if (periodo === "6meses") { start = new Date(now.getFullYear(), now.getMonth() - 5, 1); }
    else { start = new Date(now.getFullYear(), 0, 1); }
    return { start: fmtD(start), end: fmtD(now) };
  }, [periodo, customStart, customEnd]);

  useEffect(() => {
    if (!user) return;
    const { start, end } = getDateRange();

    supabase.from("animais" as any).select("*").eq("user_id", effectiveUserId).then(({ data }) => setAnimais((data as any) || []));
    supabase.from("movimentacoes_gado" as any).select("*").eq("user_id", effectiveUserId).gte("data", start).lte("data", end).order("data", { ascending: false }).then(({ data }) => setMovs((data as any) || []));

    const in15 = new Date(); in15.setDate(in15.getDate() + 15);
    supabase.from("aplicacoes_sanitarias" as any).select("*, animal:animais!animal_id(brinco,nome), medicamento:medicamentos!medicamento_id(nome)")
      .eq("user_id", effectiveUserId).not("proxima_dose", "is", null).lte("proxima_dose", in15.toISOString().split("T")[0]).order("proxima_dose")
      .limit(5).then(({ data }) => setVacinas((data as any) || []));

    supabase.from("profiles").select("rendimento_carcaca, valor_arroba, data_cotacao_arroba").eq("user_id", effectiveUserId).single()
      .then(({ data }) => {
        if (data) {
          if (data.rendimento_carcaca) setRendimento(Number(data.rendimento_carcaca));
          if ((data as any).valor_arroba) setValorArroba(Number((data as any).valor_arroba));
          if ((data as any).data_cotacao_arroba) setDataCotacao((data as any).data_cotacao_arroba);
        }
      });
  }, [user, getDateRange]);

  const animaisAtivos = animais.filter(a => a.status === "ativo");
  const totalCabecas = animaisAtivos.length;
  const pesoMedio = totalCabecas > 0 ? animaisAtivos.reduce((s, a) => s + (Number(a.peso_atual) || 0), 0) / totalCabecas : 0;

  const { start: pStart, end: pEnd } = getDateRange();
  const nascimentos = animais.filter(a => a.origem === "nascido" && a.data_nascimento && a.data_nascimento >= pStart && a.data_nascimento <= pEnd).length;
  const mortes = movs.filter(m => m.tipo === "morte").length;

  const composicao = Object.entries(
    animaisAtivos.reduce((acc, a) => { acc[a.categoria] = (acc[a.categoria] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: CATEGORY_LABELS[name] || name, value, color: CATEGORY_COLORS[name] || "#999" }));

  const totalArrobas = animaisAtivos.reduce((s, a) => s + ((Number(a.peso_atual) || 0) * rendimento / 100 / 15), 0);
  const valorEstimado = totalArrobas * valorArroba;

  const cotacaoDesatualizada = dataCotacao ? (Date.now() - new Date(dataCotacao + "T12:00:00").getTime()) > 7 * 86400000 : true;

  const recentMovs = movs.slice(0, 5);

  const tipoBadge: Record<string, string> = {
    compra: "bg-[hsl(217,91%,60%)]/10 text-[hsl(217,91%,60%)]", venda: "bg-[hsl(160,84%,39%)]/10 text-[hsl(160,84%,39%)]",
    nascimento: "bg-[hsl(190,80%,50%)]/10 text-[hsl(190,80%,50%)]", morte: "bg-[hsl(0,84%,60%)]/10 text-[hsl(0,84%,60%)]",
    transferencia: "bg-muted text-muted-foreground",
  };
  const tipoLabel: Record<string, string> = {
    compra: "Compra", venda: "Venda", nascimento: "Nascimento", morte: "Morte", transferencia: "Transferência",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-1">Aqui está o resumo do seu rebanho.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="3meses">Últimos 3 Meses</SelectItem>
              <SelectItem value="6meses">Últimos 6 Meses</SelectItem>
              <SelectItem value="ano">Este Ano</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {periodo === "personalizado" && (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">De</span>
                <Input type="date" className="w-[150px] h-9" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Até</span>
                <Input type="date" className="w-[150px] h-9" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Cabeças - gradient */}
        <div className="rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ background: "linear-gradient(135deg, #16A34A, #166534)" }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <List className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70 font-semibold">Total de Cabeças</p>
              <p className="text-[32px] font-bold text-white leading-tight">{totalCabecas}</p>
            </div>
          </div>
        </div>
        {[
          { label: "Peso Médio", value: `${pesoMedio.toFixed(1)} kg`, icon: Scale, color: "#3B82F6", bg: "#DBEAFE" },
          { label: "Nascimentos", value: nascimentos.toString(), icon: Baby, color: "#10B981", bg: "#D1FAE5" },
          { label: "Mortes", value: mortes.toString(), icon: Skull, color: "#EF4444", bg: "#FEE2E2" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-6 pb-4 px-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: k.bg }}>
                  <k.icon className="h-5 w-5" style={{ color: k.color }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{k.label}</p>
                  <p className="text-[28px] font-bold text-foreground leading-tight">{k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Composição do Rebanho</CardTitle></CardHeader>
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

        <Card>
          <CardHeader><CardTitle>Valor Estimado do Rebanho</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de Arrobas</p>
              <p className="text-2xl font-bold text-foreground">{totalArrobas.toFixed(1)} @</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Estimado</p>
              <p className="text-2xl font-bold text-primary">{fmt(valorEstimado)}</p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Base: rendimento {rendimento}% | @ {fmt(valorArroba)}</p>
              {dataCotacao && (
                <p>Cotação da @: <strong>{fmt(valorArroba)}</strong> (atualizado em {new Date(dataCotacao + "T12:00:00").toLocaleDateString("pt-BR")})</p>
              )}
            </div>
            {cotacaoDesatualizada && (
              <div className="flex items-center gap-2 text-xs bg-warning/10 text-warning border border-warning/20 rounded-xl px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Cotação desatualizada — atualize nas Configurações.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">Próximas Vacinas
            {vacinas.length > 0 && <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">{vacinas.length}</span>}
          </CardTitle></CardHeader>
          <CardContent>
            {vacinas.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm">Nenhuma vacina pendente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-semibold text-[11px] uppercase tracking-wider">Animal</th>
                    <th className="pb-2 font-semibold text-[11px] uppercase tracking-wider">Medicamento</th>
                    <th className="pb-2 font-semibold text-[11px] uppercase tracking-wider">Próx. Dose</th>
                    <th className="pb-2 font-semibold text-[11px] uppercase tracking-wider">Dias</th>
                  </tr></thead>
                  <tbody>
                    {vacinas.map((v: any) => {
                      const dias = Math.ceil((new Date(v.proxima_dose).getTime() - Date.now()) / 86400000);
                      const bgClass = dias < 0 ? "bg-destructive/5" : dias < 3 ? "bg-warning/5" : "";
                      return (
                        <tr key={v.id} className={`border-b border-border ${bgClass}`}>
                          <td className="py-3 font-mono">{v.animal?.brinco}</td>
                          <td className="py-3">{v.medicamento?.nome}</td>
                          <td className="py-3">{new Date(v.proxima_dose + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                          <td className={`py-3 font-bold ${dias < 0 ? "text-destructive" : dias < 3 ? "text-warning" : ""}`}>{dias}d</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Últimas Movimentações</CardTitle></CardHeader>
          <CardContent>
            {recentMovs.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhuma movimentação no período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-semibold text-[11px] uppercase tracking-wider">Data</th>
                    <th className="pb-2 font-semibold text-[11px] uppercase tracking-wider">Tipo</th>
                    <th className="pb-2 font-semibold text-[11px] uppercase tracking-wider">Qtd</th>
                    <th className="pb-2 font-semibold text-[11px] uppercase tracking-wider">Valor</th>
                  </tr></thead>
                  <tbody>
                    {recentMovs.map((m: any) => (
                      <tr key={m.id} className="border-b border-border">
                        <td className="py-3">{new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</td>
                        <td className="py-3"><span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${tipoBadge[m.tipo] || ""}`}>{tipoLabel[m.tipo]}</span></td>
                        <td className="py-3">{m.quantidade}</td>
                        <td className="py-3">{m.valor_total ? fmt(Number(m.valor_total)) : "—"}</td>
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
