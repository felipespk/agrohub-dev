import { useMemo, useState } from "react";
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { AlertTriangle } from "lucide-react";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { formatarMoeda, formatarData } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function FluxoCaixaPage() {
  const { contasPR, contasBancarias, centrosCusto } = useFinanceiro();
  const [periodo, setPeriodo] = useState("30");
  const [filtroCentro, setFiltroCentro] = useState("todos");
  const [filtroConta, setFiltroConta] = useState("todos");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const saldoAtual = useMemo(() => {
    let contas = contasBancarias;
    if (filtroConta !== "todos") contas = contas.filter(c => c.id === filtroConta);
    return contas.reduce((s, c) => s + Number(c.saldo_atual || 0), 0);
  }, [contasBancarias, filtroConta]);

  const contasFuturas = useMemo(() => {
    let items = contasPR.filter(c => c.status === "aberto" && c.data_vencimento >= todayStr);
    if (filtroCentro !== "todos") items = items.filter(c => c.centro_custo_id === filtroCentro);
    return items;
  }, [contasPR, todayStr, filtroCentro]);

  const chartData = useMemo(() => {
    const dias = parseInt(periodo);
    const data: { dia: string; receber: number; pagar: number; saldo: number }[] = [];
    let saldoAcum = saldoAtual;

    for (let i = 0; i < dias; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const receber = contasFuturas.filter(c => c.tipo === "receber" && c.data_vencimento === ds).reduce((s, c) => s + (Number(c.valor_total) - Number(c.valor_pago)), 0);
      const pagar = contasFuturas.filter(c => c.tipo === "pagar" && c.data_vencimento === ds).reduce((s, c) => s + (Number(c.valor_total) - Number(c.valor_pago)), 0);
      saldoAcum += receber - pagar;
      data.push({ dia: label, receber, pagar, saldo: saldoAcum });
    }
    return data;
  }, [contasFuturas, periodo, saldoAtual, today]);

  const diaNegativo = chartData.find(d => d.saldo < 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fluxo de Caixa Projetado</h1>
        <p className="text-sm text-muted-foreground mt-1">Previsão de entradas e saídas financeiras</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-wrap gap-3 mb-5">
          <div><Label className="text-xs">Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}><SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="30">30 dias</SelectItem><SelectItem value="60">60 dias</SelectItem><SelectItem value="90">90 dias</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Centro de Custo</Label>
            <Select value={filtroCentro} onValueChange={setFiltroCentro}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem>{centrosCusto.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Conta Bancária</Label>
            <Select value={filtroConta} onValueChange={setFiltroConta}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todas</SelectItem>{contasBancarias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {diaNegativo && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Atenção: saldo projetado ficará negativo em {diaNegativo.dia}</p>
              <p className="text-xs text-red-600 mt-0.5">Considere antecipar recebimentos ou adiar pagamentos.</p>
            </div>
          </div>
        )}

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="dia" fontSize={10} tick={{ fill: "#94A3B8" }} interval={Math.max(1, Math.floor(chartData.length / 10))} />
              <YAxis fontSize={10} tick={{ fill: "#94A3B8" }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip formatter={(value: number) => formatarMoeda(value)} contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13 }} />
              <Legend />
              <Bar dataKey="receber" name="Recebimentos" fill="#16A34A" radius={[2, 2, 0, 0]} />
              <Bar dataKey="pagar" name="Pagamentos" fill="#EF4444" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="saldo" name="Saldo Projetado" stroke="#2563EB" strokeWidth={2.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Future bills table */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="font-semibold text-base text-foreground mb-4">Movimentações Previstas</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/30">
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Tipo</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Descrição</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Centro de Custo</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Valor</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Vencimento</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {contasFuturas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conta futura.</TableCell></TableRow>
              ) : contasFuturas.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.tipo === "pagar" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.tipo === "pagar" ? "bg-red-500" : "bg-emerald-500"}`} />
                      {c.tipo === "pagar" ? "Pagar" : "Receber"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">{c.descricao}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.centro?.nome || "—"}</TableCell>
                  <TableCell className="text-sm text-right font-semibold">{formatarMoeda(Number(c.valor_total) - Number(c.valor_pago))}</TableCell>
                  <TableCell className="text-sm">{formatarData(c.data_vencimento)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
