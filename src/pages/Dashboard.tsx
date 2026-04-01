import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, TrendingUp, TrendingDown, Settings2, Check, Scale } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/contexts/AppContext";
import { formatDateBR } from "@/lib/date";

const PIE_COLORS = [
  "hsl(142, 76%, 36%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)",
  "hsl(350, 60%, 50%)", "hsl(280, 40%, 50%)",
];
const EMPTY_COLOR = "hsl(220, 13%, 91%)";

export default function Dashboard() {
  const { recebimentos, saidas, quebras, capacidadeSilo, setCapacidadeSilo } = useAppData();
  const [editingCap, setEditingCap] = useState(false);
  const [capInput, setCapInput] = useState(String(capacidadeSilo / 1000));

  const totalRecebido = recebimentos.reduce((s, r) => s + r.peso_liquido, 0);
  const totalBruto = recebimentos.reduce((s, r) => s + r.peso_bruto, 0);
  const totalExpedido = saidas.reduce((s, r) => s + r.kgs_expedidos, 0);
  const totalQuebra = quebras.reduce((s, q) => s + q.kg_ajuste, 0);
  const totalEstoque = totalRecebido - totalExpedido + totalQuebra;

  const areaData = useMemo(() => {
    const today = new Date();
    const days: { dia: string; entrada: number; saida: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entrada = recebimentos.filter(r => r.data === ds).reduce((s, r) => s + r.peso_liquido, 0);
      const saida = saidas.filter(r => r.data === ds).reduce((s, r) => s + r.kgs_expedidos, 0);
      days.push({ dia: label, entrada, saida });
    }
    return days;
  }, [recebimentos, saidas]);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    recebimentos.forEach(r => {
      const nome = r.tipo_grao_nome || "Outros";
      map.set(nome, (map.get(nome) || 0) + r.peso_liquido);
    });
    const grainSlices = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    const totalArmazenado = grainSlices.reduce((s, g) => s + g.value, 0);
    const espacoVazio = Math.max(0, capacidadeSilo - totalArmazenado);
    return { slices: [...grainSlices, { name: "Espaço Vazio", value: espacoVazio }], totalArmazenado };
  }, [recebimentos, capacidadeSilo]);

  const ultimasMovimentacoes = useMemo(() => {
    const entradas = recebimentos.slice(0, 5).map(r => ({
      id: r.id, data: r.data, tipo: "Entrada" as const,
      descricao: `${r.produtor_nome} — ${r.tipo_grao_nome}`,
      placa: r.placa_caminhao, kgs: r.peso_liquido, createdAt: r.created_at,
    }));
    const saidasList = saidas.slice(0, 5).map(s => ({
      id: s.id, data: s.data, tipo: "Saída" as const,
      descricao: `${s.comprador_nome} — ${s.categoria}`,
      placa: s.placa_caminhao, kgs: s.kgs_expedidos, createdAt: s.created_at,
    }));
    return [...entradas, ...saidasList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
  }, [recebimentos, saidas]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral do secador de grãos</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={Package} label="Estoque Atual" value={`${(totalEstoque / 1000).toFixed(1)} ton`} sub={`${totalEstoque.toLocaleString("pt-BR")} Kg`} trend={+5.2} />
        <KpiCard icon={Scale} label="Volume Bruto Recebido" value={`${(totalBruto / 1000).toFixed(1)} ton`} sub={`${totalBruto.toLocaleString("pt-BR")} Kg`} trend={+12.0} />
        <KpiCard icon={ArrowDownToLine} label="Recebido (Ajustado)" value={`${(totalRecebido / 1000).toFixed(1)} ton`} sub={`${recebimentos.length} entradas`} trend={+12.0} />
        <KpiCard icon={ArrowUpFromLine} label="Expedido no Mês" value={`${(totalExpedido / 1000).toFixed(1)} ton`} sub={`${saidas.length} saídas`} trend={-3.1} />
        <KpiCard icon={AlertTriangle} label="Quebra Técnica" value={`${Math.abs(totalQuebra).toLocaleString("pt-BR")} Kg`} sub={`${quebras.length} registros`} trend={-1.5} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 form-section">
          <h2 className="font-semibold text-base text-foreground mb-4">Fluxo de Entrada vs Saída — 30 dias</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="gradEntrada" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSaida" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 96%)" />
                <XAxis dataKey="dia" fontSize={11} tick={{ fill: 'hsl(220, 9%, 64%)' }} interval={4} />
                <YAxis fontSize={11} tick={{ fill: 'hsl(220, 9%, 64%)' }} tickFormatter={(v: number) => v > 0 ? `${(v / 1000).toFixed(0)}t` : "0"} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString("pt-BR")} Kg`} />
                <Legend />
                <Area type="monotone" dataKey="entrada" name="Entrada" stroke="hsl(142, 76%, 36%)" fill="url(#gradEntrada)" strokeWidth={2} />
                <Area type="monotone" dataKey="saida" name="Saída" stroke="hsl(217, 91%, 60%)" fill="url(#gradSaida)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="form-section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base text-foreground">Ocupação do Silo</h2>
            {editingCap ? (
              <div className="flex items-center gap-2">
                <Input type="number" className="w-28 h-8 text-sm" value={capInput} onChange={e => setCapInput(e.target.value)} placeholder="Ton" />
                <span className="text-xs text-muted-foreground">ton</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { const v = parseFloat(capInput); if (v > 0) { setCapacidadeSilo(v * 1000); } setEditingCap(false); }}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button onClick={() => { setCapInput(String(capacidadeSilo / 1000)); setEditingCap(true); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Settings2 className="h-3.5 w-3.5" /> {(capacidadeSilo / 1000).toLocaleString("pt-BR")} ton
              </button>
            )}
          </div>
          <div className="h-72 flex items-center justify-center">
            {pieData.slices.every(s => s.value === 0) ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData.slices} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.slices.map((entry, i) => (
                      <Cell key={i} fill={entry.name === "Espaço Vazio" ? EMPTY_COLOR : PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${(value / 1000).toFixed(1)} ton (${value.toLocaleString("pt-BR")} Kg)`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Armazenado: <span className="font-semibold text-foreground">{(pieData.totalArmazenado / 1000).toFixed(1)} ton</span> de {(capacidadeSilo / 1000).toLocaleString("pt-BR")} ton ({capacidadeSilo > 0 ? ((pieData.totalArmazenado / capacidadeSilo) * 100).toFixed(1) : 0}%)
          </p>
        </div>
      </div>

      <div className="form-section">
        <h2 className="font-semibold text-base text-foreground mb-4">Últimas Movimentações</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Data</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tipo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Placa</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Descrição</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right">Kgs</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {ultimasMovimentacoes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada.</TableCell></TableRow>
              ) : ultimasMovimentacoes.map(m => (
                <TableRow key={m.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm">{formatDateBR(m.data)}</TableCell>
                  <TableCell><Badge variant={m.tipo === "Entrada" ? "default" : "secondary"} className="text-xs">{m.tipo}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{m.placa}</TableCell>
                  <TableCell className="text-sm">{m.descricao}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">{m.kgs.toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, trend }: { icon: any; label: string; value: string; sub: string; trend: number }) {
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend >= 0 ? "text-emerald-600" : "text-destructive";
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">{sub}</p>
        <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}><TrendIcon className="h-3 w-3" />{Math.abs(trend)}%</div>
      </div>
    </div>
  );
}