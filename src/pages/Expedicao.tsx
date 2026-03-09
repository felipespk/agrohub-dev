import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppContext";
import { Truck } from "lucide-react";

export default function ExpedicaoPage() {
  const { saidas } = useAppData();
  const totalKgs = saidas.reduce((sum, s) => sum + s.kgs_expedidos, 0);
  const totalSacos = totalKgs / 60;
  const totalToneladas = totalKgs / 1000;

  const fmtSacos = (kgs: number) => (kgs / 60).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtTon = (kgs: number) => (kgs / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /><h1 className="page-title">Expedição</h1></div>
        <p className="page-subtitle">Resumo consolidado de expedições</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total de Sacos</p><p className="text-2xl font-display font-bold text-foreground">{fmtSacos(totalKgs)}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total de Kgs</p><p className="text-2xl font-display font-bold text-foreground">{totalKgs.toLocaleString("pt-BR")}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total de Toneladas</p><p className="text-2xl font-display font-bold text-primary">{fmtTon(totalKgs)}</p></div>
      </div>
      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Detalhamento das Expedições</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Produtor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Kgs</TableHead>
              <TableHead className="text-right">Sacos</TableHead>
              <TableHead className="text-right">Toneladas</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {saidas.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="tabular-nums">{new Date(s.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono">{s.placa_caminhao}</TableCell>
                  <TableCell>{s.comprador_nome}</TableCell>
                  <TableCell>{s.produtor_nome || "—"}</TableCell>
                  <TableCell>{s.categoria}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.kgs_expedidos.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtSacos(s.kgs_expedidos)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtTon(s.kgs_expedidos)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter><TableRow>
              <TableCell colSpan={5} className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{totalKgs.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{fmtSacos(totalKgs)}</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{fmtTon(totalKgs)}</TableCell>
            </TableRow></TableFooter>
          </Table>
        </div>
      </div>
    </div>
  );
}
