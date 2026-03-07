import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Package, ArrowDownToLine, ArrowUpFromLine, Wheat } from "lucide-react";
import { recebimentosMock, saidasMock } from "@/data/mock-data";

const chartData = [
  { dia: "01/03", entrada: 30000, saida: 0 },
  { dia: "02/03", entrada: 0, saida: 0 },
  { dia: "03/03", entrada: 25000, saida: 0 },
  { dia: "04/03", entrada: 0, saida: 0 },
  { dia: "05/03", entrada: 0, saida: 15000 },
  { dia: "06/03", entrada: 0, saida: 0 },
  { dia: "07/03", entrada: 0, saida: 0 },
];

export default function Dashboard() {
  const totalEstoque = recebimentosMock.reduce((s, r) => s + r.pesoLiquido, 0) - saidasMock.reduce((s, r) => s + r.kgsExpedidos, 0);
  const totalRecebido = recebimentosMock.reduce((s, r) => s + r.pesoLiquido, 0);
  const totalExpedido = saidasMock.reduce((s, r) => s + r.kgsExpedidos, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Wheat className="h-6 w-6 text-primary" />
          <h1 className="page-title">Dashboard</h1>
        </div>
        <p className="page-subtitle">Visão geral do secador de grãos</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Package} label="Estoque Atual" value={`${(totalEstoque / 1000).toFixed(1)} ton`} sub={`${totalEstoque.toLocaleString("pt-BR")} Kg`} color="text-primary" />
        <KpiCard icon={ArrowDownToLine} label="Recebido no Mês" value={`${(totalRecebido / 1000).toFixed(1)} ton`} sub={`${recebimentosMock.length} entradas`} color="text-success" />
        <KpiCard icon={ArrowUpFromLine} label="Expedido no Mês" value={`${(totalExpedido / 1000).toFixed(1)} ton`} sub={`${saidasMock.length} saídas`} color="text-warning" />
      </div>

      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Entrada vs Saída — Últimos 7 dias (Kg)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 88%)" />
              <XAxis dataKey="dia" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}t`} />
              <Tooltip formatter={(value: number) => `${value.toLocaleString("pt-BR")} Kg`} />
              <Legend />
              <Bar dataKey="entrada" name="Entrada" fill="hsl(152 45% 28%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saida" name="Saída" fill="hsl(42 80% 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
