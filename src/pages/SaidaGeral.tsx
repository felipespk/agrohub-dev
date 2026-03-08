import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppContext";
import { ArrowRightLeft } from "lucide-react";

const COLORS = ["hsl(152, 45%, 28%)", "hsl(42, 80%, 55%)", "hsl(210, 50%, 45%)", "hsl(350, 60%, 50%)"];

export default function SaidaGeralPage() {
  const { saidas } = useAppData();

  const barData = useMemo(() => {
    const map = new Map<string, number>();
    saidas.forEach(s => map.set(s.categoria, (map.get(s.categoria) || 0) + s.kgs_expedidos));
    return Array.from(map.entries()).map(([categoria, kgs]) => ({ categoria, kgs }));
  }, [saidas]);

  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    saidas.forEach(s => {
      const nome = s.comprador_nome || "Outros";
      map.set(nome, (map.get(nome) || 0) + s.kgs_expedidos);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [saidas]);

  const resumo = useMemo(() => {
    const map = new Map<string, { compradorNome: string; categoria: string; kgs: number; count: number }>();
    saidas.forEach(s => {
      const key = `${s.comprador_nome}-${s.categoria}`;
      const ex = map.get(key) || { compradorNome: s.comprador_nome || "", categoria: s.categoria, kgs: 0, count: 0 };
      ex.kgs += s.kgs_expedidos;
      ex.count += 1;
      map.set(key, ex);
    });
    return Array.from(map.values()).sort((a, b) => b.kgs - a.kgs);
  }, [saidas]);

  const totalKgs = saidas.reduce((s, x) => s + x.kgs_expedidos, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><ArrowRightLeft className="h-6 w-6 text-primary" /><h1 className="page-title">Saída Geral (Análise)</h1></div>
        <p className="page-subtitle">Dashboard analítico das saídas registradas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total Expedido</p><p className="text-2xl font-display font-bold text-foreground">{(totalKgs / 1000).toFixed(1)} ton</p><p className="text-xs text-muted-foreground mt-1">{totalKgs.toLocaleString("pt-BR")} Kg</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total de Saídas</p><p className="text-2xl font-display font-bold text-foreground">{saidas.length}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Categorias</p><p className="text-2xl font-display font-bold text-foreground">{new Set(saidas.map(s => s.categoria)).size}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="form-section">
          <h2 className="font-display font-semibold text-lg text-foreground mb-4">Volume por Categoria (Kg)</h2>
          <div className="h-64">
            {barData.length === 0 ? <p className="text-sm text-muted-foreground text-center pt-20">Sem dados</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 15%, 88%)" />
                  <XAxis dataKey="categoria" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}t`} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString("pt-BR")} Kg`} />
                  <Bar dataKey="kgs" name="Kgs Expedidos" fill="hsl(152, 45%, 28%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="form-section">
          <h2 className="font-display font-semibold text-lg text-foreground mb-4">Top Compradores</h2>
          <div className="h-64 flex items-center justify-center">
            {pieData.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString("pt-BR")} Kg`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Resumo por Comprador e Categoria</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Comprador</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Total Kgs</TableHead><TableHead className="text-right">Toneladas</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {resumo.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma saída registrada.</TableCell></TableRow>
              ) : resumo.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.compradorNome}</TableCell>
                  <TableCell>{r.categoria}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right font-semibold">{r.kgs.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{(r.kgs / 1000).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {resumo.length > 0 && (
              <TableFooter><TableRow>
                <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-bold">{totalKgs.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right font-bold">{(totalKgs / 1000).toFixed(2)}</TableCell>
              </TableRow></TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
}
