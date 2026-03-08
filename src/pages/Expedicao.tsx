import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppContext";
import { Truck } from "lucide-react";

export default function ExpedicaoPage() {
  const { saidas } = useAppData();
  const totalKgs = saidas.reduce((sum, s) => sum + s.kgsExpedidos, 0);
  const totalSacos = Math.round(totalKgs / 60);
  const totalToneladas = totalKgs / 1000;
  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          <h1 className="page-title">Expedição</h1>
        </div>
        <p className="page-subtitle">Resumo consolidado de expedições</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total de Sacos</p><p className="text-2xl font-display font-bold text-foreground">{totalSacos.toLocaleString("pt-BR")}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total de Kgs</p><p className="text-2xl font-display font-bold text-foreground">{totalKgs.toLocaleString("pt-BR")}</p></div>
        <div className="kpi-card"><p className="text-xs text-muted-foreground">Total de Toneladas</p><p className="text-2xl font-display font-bold text-primary">{fmt(totalToneladas)}</p></div>
      </div>
      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Detalhamento das Expedições</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Destino</TableHead><TableHead>Categoria</TableHead><TableHead>Classificação</TableHead>
              <TableHead className="text-right">Kgs</TableHead><TableHead className="text-right">Sacos</TableHead><TableHead className="text-right">Toneladas</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {saidas.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono">{s.placaCaminhao}</TableCell>
                  <TableCell>{s.compradorNome}</TableCell>
                  <TableCell>{s.categoria}</TableCell>
                  <TableCell>{s.classificacao}</TableCell>
                  <TableCell className="text-right">{s.kgsExpedidos.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{Math.round(s.kgsExpedidos / 60)}</TableCell>
                  <TableCell className="text-right">{fmt(s.kgsExpedidos / 1000)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter><TableRow>
              <TableCell colSpan={5} className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-bold">{totalKgs.toLocaleString("pt-BR")}</TableCell>
              <TableCell className="text-right font-bold">{totalSacos}</TableCell>
              <TableCell className="text-right font-bold">{fmt(totalToneladas)}</TableCell>
            </TableRow></TableFooter>
          </Table>
        </div>
      </div>
    </div>
  );
}
