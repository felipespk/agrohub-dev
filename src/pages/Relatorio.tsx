import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppContext";
import { FileBarChart, Download } from "lucide-react";
import { toast } from "sonner";

export default function RelatorioPage() {
  const { produtores, tiposGrao, recebimentos, saidas } = useAppData();
  const [filtroProdutorId, setFiltroProdutorId] = useState("todos");
  const [filtroGraoId, setFiltroGraoId] = useState("todos");

  const saldo = useMemo(() => {
    const map = new Map<string, { produtorNome: string; tipoGraoNome: string; kgsEntrada: number; kgsSecagem: number; kgsSaida: number }>();

    // Sum recebimentos (entradas)
    for (const r of recebimentos) {
      if (filtroProdutorId !== "todos" && r.produtor_id !== filtroProdutorId) continue;
      if (filtroGraoId !== "todos" && r.tipo_grao_id !== filtroGraoId) continue;
      const key = `${r.produtor_id}-${r.tipo_grao_id}`;
      const existing = map.get(key) || { produtorNome: r.produtor_nome || "", tipoGraoNome: r.tipo_grao_nome || "", kgsEntrada: 0, kgsSecagem: 0, kgsSaida: 0 };
      existing.kgsEntrada += r.peso_liquido;
      existing.kgsSecagem += (r.desconto_secagem_kg || 0);
      map.set(key, existing);
    }

    // Subtract saídas
    for (const s of saidas) {
      if (!s.produtor_id || !s.tipo_grao_id) continue;
      if (filtroProdutorId !== "todos" && s.produtor_id !== filtroProdutorId) continue;
      if (filtroGraoId !== "todos" && s.tipo_grao_id !== filtroGraoId) continue;
      const key = `${s.produtor_id}-${s.tipo_grao_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.kgsSaida += s.kgs_expedidos;
      }
    }

    return Array.from(map.entries()).map(([key, val]) => ({
      key,
      ...val,
      saldo: val.kgsEntrada - val.kgsSaida,
    }));
  }, [filtroProdutorId, filtroGraoId, recebimentos, saidas]);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const exportCSV = () => {
    const header = "Produtor,Tipo de Grão,Entrada (Líquido Kg),Retido Secagem (Kg),Saída (Kg),Saldo Atual (Kg)\n";
    const rows = saldo.map(s => `${s.produtorNome},${s.tipoGraoNome},${fmt(s.kgsEntrada)},${fmt(s.kgsSecagem)},${fmt(s.kgsSaida)},${fmt(s.saldo)}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "relatorio-estoque.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><FileBarChart className="h-6 w-6 text-primary" /><h1 className="page-title">Relatório de Estoque</h1></div>
        <p className="page-subtitle">Saldo calculado automaticamente a partir dos recebimentos e saídas</p>
      </div>
      <div className="form-section space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Produtor</label>
            <Select value={filtroProdutorId} onValueChange={setFiltroProdutorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {produtores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Tipo de Grão</label>
            <Select value={filtroGraoId} onValueChange={setFiltroGraoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tiposGrao.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Produtor</TableHead><TableHead>Tipo de Grão</TableHead>
              <TableHead className="text-right">Entrada (Líquido Kg)</TableHead>
              <TableHead className="text-right">Retido Secagem (Kg)</TableHead>
              <TableHead className="text-right">Saída (Kg)</TableHead>
              <TableHead className="text-right">Saldo Atual (Kg)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {saldo.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
              ) : saldo.map(s => (
                <TableRow key={s.key}>
                  <TableCell className="font-medium">{s.produtorNome}</TableCell>
                  <TableCell>{s.tipoGraoNome}</TableCell>
                  <TableCell className="text-right">{fmt(s.kgsEntrada)}</TableCell>
                  <TableCell className="text-right text-amber-600 font-medium">{fmt(s.kgsSecagem)}</TableCell>
                  <TableCell className="text-right text-destructive font-medium">{fmt(s.kgsSaida)}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{fmt(s.saldo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
