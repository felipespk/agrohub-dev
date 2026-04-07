import { useMemo, useState } from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Landmark, TrendingUp, TrendingDown, Scale, Clock, CheckCircle, ArrowDown, ArrowUp, ArrowRight } from "lucide-react";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { formatarMoeda, formatarData } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { getGreeting } from "@/lib/greeting";

type PeriodoKey = "mes" | "3meses" | "6meses" | "ano" | "personalizado";

function getPeriodoRange(key: PeriodoKey, customStart?: string, customEnd?: string): { start: string; end: string; label: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const todayStr = fmt(now);
  if (key === "personalizado") {
    return { start: customStart || fmt(new Date(now.getFullYear(), 0, 1)), end: customEnd || todayStr, label: "Personalizado" };
  }
  switch (key) {
    case "mes": { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { start: fmt(s), end: todayStr, label: "Este Mês" }; }
    case "3meses": { const s = new Date(now.getFullYear(), now.getMonth() - 2, 1); return { start: fmt(s), end: todayStr, label: "Últimos 3 Meses" }; }
    case "6meses": { const s = new Date(now.getFullYear(), now.getMonth() - 5, 1); return { start: fmt(s), end: todayStr, label: "Últimos 6 Meses" }; }
    case "ano": { const s = new Date(now.getFullYear(), 0, 1); return { start: fmt(s), end: todayStr, label: "Este Ano" }; }
  }
}

export default function FinanceiroDashboard() {
  const { centrosCusto, contasBancarias, contasPR, lancamentos, loading } = useFinanceiro();
  const { user } = useAuth();
  const [ccFiltro, setCcFiltro] = useState("todos");
  const [periodo, setPeriodo] = useState<PeriodoKey>("mes");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const navigate = useNavigate();

  const { greeting } = getGreeting(null, user?.email);

  const today = new Date().toISOString().split("T")[0];
  const { start: periodoStart, end: periodoEnd, label: periodoLabel } = getPeriodoRange(periodo, customStart, customEnd);

  const lancFiltrados = useMemo(() => {
    let l = lancamentos.filter(x => x.data >= periodoStart && x.data <= periodoEnd);
    if (ccFiltro !== "todos") l = l.filter(x => x.centro_custo_id === ccFiltro);
    return l;
  }, [lancamentos, periodoStart, periodoEnd, ccFiltro]);

  const prevPeriodLanc = useMemo(() => {
    const startDate = new Date(periodoStart);
    const endDate = new Date(periodoEnd);
    const diff = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diff);
    const ps = prevStart.toISOString().split("T")[0];
    const pe = prevEnd.toISOString().split("T")[0];
    let l = lancamentos.filter(x => x.data >= ps && x.data <= pe);
    if (ccFiltro !== "todos") l = l.filter(x => x.centro_custo_id === ccFiltro);
    return l;
  }, [lancamentos, periodoStart, periodoEnd, ccFiltro]);

  const saldoTotal = contasBancarias.reduce((s, c) => s + Number(c.saldo_atual || 0), 0);
  const receitasMes = lancFiltrados.filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
  const despesasMes = lancFiltrados.filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
  const resultado = receitasMes - despesasMes;

  const prevReceitas = prevPeriodLanc.filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
  const prevDespesas = prevPeriodLanc.filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);

  const calcVar = (curr: number, prev: number) => {
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const contasVencidas = useMemo(() => {
    let items = contasPR.filter(c => c.status === "vencido" || (c.status === "aberto" && c.data_vencimento < today));
    if (ccFiltro !== "todos") items = items.filter(c => c.centro_custo_id === ccFiltro);
    return items;
  }, [contasPR, today, ccFiltro]);

  const proxVencimentos = useMemo(() => {
    const d7 = new Date(); d7.setDate(d7.getDate() + 7);
    const d7s = d7.toISOString().split("T")[0];
    let items = contasPR.filter(c => c.status === "aberto" && c.data_vencimento >= today && c.data_vencimento <= d7s);
    if (ccFiltro !== "todos") items = items.filter(c => c.centro_custo_id === ccFiltro);
    return items;
  }, [contasPR, today, ccFiltro]);

  const proxPagar = proxVencimentos.filter(c => c.tipo === "pagar").slice(0, 3);
  const proxReceber = proxVencimentos.filter(c => c.tipo === "receber").slice(0, 3);

  const chartData = useMemo(() => {
    const months: { mes: string; receitas: number; despesas: number }[] = [];
    const startD = new Date(periodoStart + "T12:00:00");
    const endD = new Date(periodoEnd + "T12:00:00");
    const cur = new Date(startD.getFullYear(), startD.getMonth(), 1);
    const endMonth = new Date(endD.getFullYear(), endD.getMonth(), 1);
    while (cur <= endMonth) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      const label = cur.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      let lans = lancamentos.filter(l => l.data?.startsWith(key));
      if (ccFiltro !== "todos") lans = lans.filter(l => l.centro_custo_id === ccFiltro);
      months.push({
        mes: label.charAt(0).toUpperCase() + label.slice(1),
        receitas: lans.filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0),
        despesas: lans.filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0),
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  }, [lancamentos, ccFiltro, periodoStart, periodoEnd]);

  const resultadoPorCentro = useMemo(() => {
    return centrosCusto.filter(c => c.ativo).map(cc => {
      const lans = lancFiltrados.filter(l => l.centro_custo_id === cc.id);
      const rec = lans.filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
      const desp = lans.filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
      return { id: cc.id, nome: cc.nome, cor: cc.cor || "#6B7280", resultado: rec - desp };
    });
  }, [centrosCusto, lancFiltrados]);

  const fluxo30d = useMemo(() => {
    const data: { dia: string; saldo: number }[] = [];
    const entries: Record<string, number> = {};
    lancamentos.forEach(l => {
      const delta = l.tipo === "receita" ? Number(l.valor) : l.tipo === "despesa" ? -Number(l.valor) : 0;
      entries[l.data] = (entries[l.data] || 0) + delta;
    });
    const todayD = new Date();
    let reversal = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(todayD); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      reversal += (entries[ds] || 0);
    }
    let running = saldoTotal - reversal;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayD); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      running += (entries[ds] || 0);
      data.push({ dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), saldo: running });
    }
    return data;
  }, [lancamentos, saldoTotal]);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-foreground">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-1">Aqui está o resumo financeiro da sua fazenda.</p>
        </div>
        <div className="flex gap-3">
          <Select value={ccFiltro} onValueChange={setCcFiltro}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Centros</SelectItem>
              {centrosCusto.filter(c => c.ativo).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodo} onValueChange={v => setPeriodo(v as PeriodoKey)}>
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

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Saldo - gradient */}
        <div className="rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ background: "linear-gradient(135deg, #16A34A, #166534)" }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/20">
              <Landmark className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70 uppercase tracking-wide">Saldo em Contas</p>
              <p className="text-[32px] font-bold leading-tight mt-1 text-white">{formatarMoeda(saldoTotal)}</p>
            </div>
          </div>
        </div>
        <KpiCard icon={TrendingUp} label="Receitas no Período" value={formatarMoeda(receitasMes)} color="#16A34A" positive variation={calcVar(receitasMes, prevReceitas)} />
        <KpiCard icon={TrendingDown} label="Despesas no Período" value={formatarMoeda(despesasMes)} color="#EF4444" positive={false} variation={calcVar(despesasMes, prevDespesas)} invertVariation />
        <KpiCard icon={Scale} label="Resultado" value={formatarMoeda(resultado)} color={resultado >= 0 ? "#16A34A" : "#EF4444"} positive={resultado >= 0} variation={null} />
      </div>

      {/* Chart + Result by Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg text-foreground">Receitas vs Despesas</h2>
              <p className="text-xs text-muted-foreground">{periodoLabel}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(142, 76%, 36%)" }} />Receitas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(0, 84%, 60%)" }} />Despesas</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="mes" fontSize={11} tick={{ fill: "#94A3B8" }} />
                <YAxis fontSize={11} tick={{ fill: "#94A3B8" }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 91%)", fontSize: 13 }} />
                <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#16A34A" fill="url(#gradReceitas)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#EF4444" fill="url(#gradDespesas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="font-bold text-lg text-foreground mb-4">Resultado por Atividade</h2>
          <div className="space-y-3">
            {resultadoPorCentro.map(cc => (
              <div key={cc.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cc.cor }} />
                  <span className="text-sm font-medium text-foreground">{cc.nome}</span>
                </div>
                <span className={`text-sm font-bold ${cc.resultado >= 0 ? "text-[hsl(160,84%,39%)]" : "text-[hsl(0,84%,60%)]"}`}>
                  {formatarMoeda(cc.resultado)}
                </span>
              </div>
            ))}
            {resultadoPorCentro.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum centro de custo</p>}
          </div>
        </div>
      </div>

      {/* Overdue + Upcoming */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
              Contas Vencidas
              {contasVencidas.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ backgroundColor: "hsl(0, 84%, 60%)", color: "white" }}>{contasVencidas.length}</span>
              )}
            </h2>
            {contasVencidas.length > 0 && (
              <button onClick={() => navigate("/financeiro/contas-pagar")} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {contasVencidas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-10 w-10 text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conta vencida</p>
            </div>
          ) : (
            <div className="space-y-1">
              {contasVencidas.slice(0, 5).map(c => {
                const dias = Math.ceil((new Date().getTime() - new Date(c.data_vencimento + "T12:00:00").getTime()) / 86400000);
                return (
                  <div key={c.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.descricao}</p>
                      <p className="text-xs text-muted-foreground">{c.contato?.nome || "—"}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold" style={{ color: "hsl(0, 84%, 60%)" }}>{formatarMoeda(Number(c.valor_total) - Number(c.valor_pago))}</p>
                      <p className="text-xs font-semibold" style={{ color: "hsl(0, 70%, 65%)" }}>{dias}d atraso</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
              Próximos 7 Dias
              {proxVencimentos.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ backgroundColor: "hsl(217, 91%, 60%)", color: "white" }}>{proxVencimentos.length}</span>
              )}
            </h2>
          </div>
          {proxVencimentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conta nos próximos 7 dias</p>
            </div>
          ) : (
            <div className="space-y-4">
              {proxPagar.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">A Pagar</p>
                  {proxPagar.map(c => (
                    <div key={c.id} className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-muted/30">
                      <ArrowDown className="h-4 w-4 shrink-0" style={{ color: "hsl(0, 84%, 60%)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.descricao}</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{formatarMoeda(Number(c.valor_total))}</span>
                      <span className="text-xs text-muted-foreground">{formatarData(c.data_vencimento)}</span>
                    </div>
                  ))}
                </div>
              )}
              {proxReceber.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">A Receber</p>
                  {proxReceber.map(c => (
                    <div key={c.id} className="flex items-center gap-2.5 py-2 px-3 rounded-xl hover:bg-muted/30">
                      <ArrowUp className="h-4 w-4 shrink-0" style={{ color: "hsl(160, 84%, 39%)" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.descricao}</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{formatarMoeda(Number(c.valor_total))}</span>
                      <span className="text-xs text-muted-foreground">{formatarData(c.data_vencimento)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cash Flow Summary */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h2 className="font-bold text-lg text-foreground mb-4">Fluxo de Caixa — Últimos 30 dias</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fluxo30d}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="dia" fontSize={10} tick={{ fill: "#94A3B8" }} interval={Math.max(1, Math.floor(fluxo30d.length / 8))} />
              <YAxis fontSize={10} tick={{ fill: "#94A3B8" }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 91%)", fontSize: 13 }} />
              <defs>
                <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#16A34A" fill="url(#saldoGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, positive, variation, invertVariation }: {
  icon: any; label: string; value: string; color: string; positive: boolean; variation: number | null; invertVariation?: boolean;
}) {
  const varPositive = variation !== null ? (invertVariation ? variation < 0 : variation > 0) : true;
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + "1A" }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={`text-[28px] font-bold leading-tight mt-1 ${positive ? "text-foreground" : "text-[hsl(0,84%,60%)]"}`}>{value}</p>
          {variation !== null && (
            <span className={`inline-flex items-center gap-1 mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${varPositive ? "bg-[hsl(160,84%,39%)]/10 text-[hsl(160,84%,39%)]" : "bg-[hsl(0,84%,60%)]/10 text-[hsl(0,84%,60%)]"}`}>
              {varPositive ? "↑" : "↓"} {Math.abs(variation).toFixed(1)}% vs anterior
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
