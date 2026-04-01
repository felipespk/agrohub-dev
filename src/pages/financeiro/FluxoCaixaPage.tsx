import { useMemo, useState } from "react";
import { Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from "recharts";
import { AlertTriangle } from "lucide-react";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { formatarMoeda, formatarData } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
      <div className="page-header">
        <h1 className="page-title">Fluxo de Caixa Projetado</h1>
        <p className="page-subtitle">Previsão de entradas e saídas financeiras</p>
      </div>

      <div className="form-section">
        <div className="flex flex-wrap gap-3 mb-4">
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
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-4 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Atenção: saldo projetado ficará negativo em {diaNegativo.dia}.
          </div>
        )}

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 96%)" />
              <XAxis dataKey="dia" fontSize={10} tick={{ fill: "hsl(220, 9%, 64%)" }} interval={Math.max(1, Math.floor(chartData.length / 10))} />
              <YAxis fontSize={10} tick={{ fill: "hsl(220, 9%, 64%)" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatarMoeda(value)} />
              <Legend />
              <Bar dataKey="receber" name="Recebimentos" fill="hsl(142, 76%, 36%)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="pagar" name="Pagamentos" fill="hsl(0, 84%, 60%)" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="saldo" name="Saldo Projetado" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="form-section">
        <h2 className="font-semibold text-base text-foreground mb-4">Contas Futuras</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs uppercase tracking-wider">Tipo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Descrição</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Centro de Custo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Valor</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Vencimento</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {contasFuturas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conta futura.</TableCell></TableRow>
              ) : contasFuturas.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/50">
                  <TableCell><Badge variant={c.tipo === "pagar" ? "destructive" : "default"} className="text-[10px]">{c.tipo === "pagar" ? "Pagar" : "Receber"}</Badge></TableCell>
                  <TableCell className="text-sm">{c.descricao}</TableCell>
                  <TableCell className="text-sm">{c.centro?.nome || "-"}</TableCell>
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
