import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Landmark, TrendingUp, TrendingDown, Scale, AlertCircle, Clock } from "lucide-react";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { formatarMoeda, formatarData } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

export default function FinanceiroDashboard() {
  const { centrosCusto, contasBancarias, contasPR, lancamentos, loading } = useFinanceiro();
  const [ccFiltro, setCcFiltro] = useState("todos");
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const mesAtual = today.slice(0, 7);

  const lancFiltrados = useMemo(() => {
    let l = lancamentos.filter(x => x.data?.startsWith(mesAtual));
    if (ccFiltro !== "todos") l = l.filter(x => x.centro_custo_id === ccFiltro);
    return l;
  }, [lancamentos, mesAtual, ccFiltro]);

  const saldoTotal = contasBancarias.reduce((s, c) => s + Number(c.saldo_atual || 0), 0);
  const receitasMes = lancFiltrados.filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
  const despesasMes = lancFiltrados.filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
  const resultado = receitasMes - despesasMes;

  const contasVencidas = useMemo(() => {
    let items = contasPR.filter(c => (c.status === "vencido" || (c.status === "aberto" && c.data_vencimento < today)));
    if (ccFiltro !== "todos") items = items.filter(c => c.centro_custo_id === ccFiltro);
    return items.slice(0, 5);
  }, [contasPR, today, ccFiltro]);

  const proxVencimentos = useMemo(() => {
    const d7 = new Date(); d7.setDate(d7.getDate() + 7);
    const d7s = d7.toISOString().split("T")[0];
    let items = contasPR.filter(c => c.status === "aberto" && c.data_vencimento >= today && c.data_vencimento <= d7s);
    if (ccFiltro !== "todos") items = items.filter(c => c.centro_custo_id === ccFiltro);
    return items.slice(0, 5);
  }, [contasPR, today, ccFiltro]);

  const chartData = useMemo(() => {
    const months: { mes: string; receitas: number; despesas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      let lans = lancamentos.filter(l => l.data?.startsWith(key));
      if (ccFiltro !== "todos") lans = lans.filter(l => l.centro_custo_id === ccFiltro);
      months.push({
        mes: label,
        receitas: lans.filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0),
        despesas: lans.filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0),
      });
    }
    return months;
  }, [lancamentos, ccFiltro]);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard Financeiro</h1>
          <p className="page-subtitle">Visão geral das finanças</p>
        </div>
        <Select value={ccFiltro} onValueChange={setCcFiltro}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Centro de Custo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Centros</SelectItem>
            {centrosCusto.filter(c => c.ativo).map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Landmark} label="Saldo Total" value={formatarMoeda(saldoTotal)} positive={saldoTotal >= 0} />
        <KpiCard icon={TrendingUp} label="Receitas do Mês" value={formatarMoeda(receitasMes)} positive />
        <KpiCard icon={TrendingDown} label="Despesas do Mês" value={formatarMoeda(despesasMes)} positive={false} />
        <KpiCard icon={Scale} label="Resultado do Mês" value={formatarMoeda(resultado)} positive={resultado >= 0} />
      </div>

      <div className="form-section">
        <h2 className="font-semibold text-base text-foreground mb-4">Receitas vs Despesas — Últimos 6 meses</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 96%)" />
              <XAxis dataKey="mes" fontSize={11} tick={{ fill: "hsl(220, 9%, 64%)" }} />
              <YAxis fontSize={11} tick={{ fill: "hsl(220, 9%, 64%)" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatarMoeda(value)} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="form-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" /> Contas Vencidas
            </h2>
            <button onClick={() => navigate("/financeiro/contas-pagar")} className="text-xs text-primary hover:underline">Ver todas</button>
          </div>
          {contasVencidas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma conta vencida</p>
          ) : (
            <div className="space-y-2">
              {contasVencidas.map(c => {
                const dias = Math.ceil((new Date().getTime() - new Date(c.data_vencimento).getTime()) / 86400000);
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.descricao}</p>
                      <p className="text-xs text-muted-foreground">{dias} dias de atraso</p>
                    </div>
                    <span className="text-sm font-semibold text-destructive">{formatarMoeda(Number(c.valor_total) - Number(c.valor_pago))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" /> Próximos Vencimentos
            </h2>
          </div>
          {proxVencimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum vencimento próximo</p>
          ) : (
            <div className="space-y-2">
              {proxVencimentos.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.descricao}</p>
                    <p className="text-xs text-muted-foreground">Vence em {formatarData(c.data_vencimento)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">{formatarMoeda(Number(c.valor_total))}</span>
                    <Badge variant={c.tipo === "pagar" ? "destructive" : "default"} className="ml-2 text-[10px]">{c.tipo === "pagar" ? "Pagar" : "Receber"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, positive }: { icon: any; label: string; value: string; positive: boolean }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className={`text-2xl font-bold leading-none ${positive ? "text-foreground" : "text-destructive"}`}>{value}</p>
    </div>
  );
}
