import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { recebimentosMock, saidasMock, produtoresMock, tiposGraoMock } from "@/data/mock-data";
import { FileBarChart, Download } from "lucide-react";
import { toast } from "sonner";

export default function RelatorioPage() {
  const [filtroProdutorId, setFiltroProdutorId] = useState("todos");
  const [filtroGraoId, setFiltroGraoId] = useState("todos");

  const saldo = useMemo(() => {
    const map = new Map<string, { produtorNome: string; tipoGraoNome: string; kgsEntrada: number; kgsSaida: number }>();

    for (const r of recebimentosMock) {
      if (filtroProdutorId !== "todos" && r.produtorId !== filtroProdutorId) continue;
      if (filtroGraoId !== "todos" && r.tipoGraoId !== filtroGraoId) continue;
      const key = `${r.produtorId}-${r.tipoGraoId}`;
      const existing = map.get(key) || { produtorNome: r.produtorNome, tipoGraoNome: r.tipoGraoNome, kgsEntrada: 0, kgsSaida: 0 };
      existing.kgsEntrada += r.pesoLiquido;
      map.set(key, existing);
    }

    // For simplicity, distribute saídas proportionally (in a real app this would be tracked per produtor)
    const totalSaida = saidasMock.reduce((s, x) => s + x.kgsExpedidos, 0);

    return Array.from(map.entries()).map(([key, val]) => ({
      key,
      ...val,
      saldo: val.kgsEntrada - val.kgsSaida,
    }));
  }, [filtroProdutorId, filtroGraoId]);

  const exportCSV = () => {
    const header = "Produtor,Tipo de Grão,Kgs Entrada,Saldo\n";
    const rows = saldo.map(s => `${s.produtorNome},${s.tipoGraoNome},${s.kgsEntrada},${s.saldo}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-estoque.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-primary" />
          <h1 className="page-title">Relatório</h1>
        </div>
        <p className="page-subtitle">Saldo de estoque por produtor e tipo de grão</p>
      </div>

      <div className="form-section space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Produtor</label>
            <Select value={filtroProdutorId} onValueChange={setFiltroProdutorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {produtoresMock.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-[200px]">
            <label className="text-sm font-medium text-foreground">Tipo de Grão</label>
            <Select value={filtroGraoId} onValueChange={setFiltroGraoId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tiposGraoMock.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produtor</TableHead>
                <TableHead>Tipo de Grão</TableHead>
                <TableHead className="text-right">Kgs Entrada (Líquido)</TableHead>
                <TableHead className="text-right">Saldo (Kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saldo.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
              ) : saldo.map(s => (
                <TableRow key={s.key}>
                  <TableCell className="font-medium">{s.produtorNome}</TableCell>
                  <TableCell>{s.tipoGraoNome}</TableCell>
                  <TableCell className="text-right">{s.kgsEntrada.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{s.saldo.toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
