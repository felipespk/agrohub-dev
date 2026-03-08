import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/contexts/AppContext";
import { FileBarChart, Download, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface LancamentoUnificado {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  placa: string;
  kg: number;
  // Recebimento-only fields
  pesoBruto?: number;
  umidadeInicial?: number;
  umidadeFinalAlvo?: number;
  impureza?: number;
  taxaSecagem?: number;
  descontoUmidadeKg?: number;
  descontoImpurezaKg?: number;
  descontoSecagemKg?: number;
  totalDescontos?: number;
}

export default function RelatorioPage() {
  const { produtores, tiposGrao, recebimentos, saidas } = useAppData();
  const [filtroProdutorId, setFiltroProdutorId] = useState("todos");
  const [filtroGraoId, setFiltroGraoId] = useState("todos");

  const grupos = useMemo(() => {
    const map = new Map<string, {
      produtorId: string; tipoGraoId: string;
      produtorNome: string; tipoGraoNome: string;
      kgsEntrada: number; kgsSaida: number;
      lancamentos: LancamentoUnificado[];
    }>();

    for (const r of recebimentos) {
      if (filtroProdutorId !== "todos" && r.produtor_id !== filtroProdutorId) continue;
      if (filtroGraoId !== "todos" && r.tipo_grao_id !== filtroGraoId) continue;
      const key = `${r.produtor_id}-${r.tipo_grao_id}`;
      const existing = map.get(key) || {
        produtorId: r.produtor_id, tipoGraoId: r.tipo_grao_id,
        produtorNome: r.produtor_nome || "", tipoGraoNome: r.tipo_grao_nome || "",
        kgsEntrada: 0, kgsSaida: 0, lancamentos: [],
      };
      existing.kgsEntrada += r.peso_liquido;
      const descontoU = r.desconto_umidade_kg || 0;
      const descontoI = r.desconto_impureza_kg || 0;
      const descontoS = r.desconto_secagem_kg || 0;
      existing.lancamentos.push({
        id: r.id, data: r.data, tipo: "entrada", placa: r.placa_caminhao, kg: r.peso_liquido,
        pesoBruto: r.peso_bruto,
        umidadeInicial: r.umidade_inicial,
        umidadeFinalAlvo: r.umidade_final_alvo,
        impureza: r.impureza,
        taxaSecagem: r.taxa_secagem_percentual,
        descontoUmidadeKg: descontoU,
        descontoImpurezaKg: descontoI,
        descontoSecagemKg: descontoS,
        totalDescontos: descontoU + descontoI + descontoS,
      });
      map.set(key, existing);
    }

    for (const s of saidas) {
      if (!s.produtor_id || !s.tipo_grao_id) continue;
      if (filtroProdutorId !== "todos" && s.produtor_id !== filtroProdutorId) continue;
      if (filtroGraoId !== "todos" && s.tipo_grao_id !== filtroGraoId) continue;
      const key = `${s.produtor_id}-${s.tipo_grao_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.kgsSaida += s.kgs_expedidos;
        existing.lancamentos.push({ id: s.id, data: s.data, tipo: "saida", placa: s.placa_caminhao, kg: s.kgs_expedidos });
      }
    }

    return Array.from(map.entries()).map(([key, val]) => {
      val.lancamentos.sort((a, b) => a.data.localeCompare(b.data));
      return { key, ...val, saldo: val.kgsEntrada - val.kgsSaida };
    });
  }, [filtroProdutorId, filtroGraoId, recebimentos, saidas]);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmt2 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportExcel = () => {
    const rows = grupos.flatMap(g =>
      g.lancamentos.map(l => {
        const base: Record<string, string | number> = {
          Produtor: g.produtorNome,
          "Tipo de Grão": g.tipoGraoNome,
          Data: l.data,
          Operação: l.tipo === "entrada" ? "Entrada" : "Saída",
          Placa: l.placa,
        };
        if (l.tipo === "entrada") {
          base["Peso Bruto (Kg)"] = l.pesoBruto!;
          base["Umidade Inicial (%)"] = l.umidadeInicial!;
          base["Umidade Alvo (%)"] = l.umidadeFinalAlvo!;
          base["Impureza (%)"] = l.impureza!;
          base["Tx Secagem (%)"] = l.taxaSecagem!;
          base["Desc. Umidade (Kg)"] = l.descontoUmidadeKg!;
          base["Desc. Impureza (Kg)"] = l.descontoImpurezaKg!;
          base["Desc. Secagem (Kg)"] = l.descontoSecagemKg!;
          base["Total Descontos (Kg)"] = l.totalDescontos!;
        } else {
          base["Peso Bruto (Kg)"] = "";
          base["Umidade Inicial (%)"] = "";
          base["Umidade Alvo (%)"] = "";
          base["Impureza (%)"] = "";
          base["Tx Secagem (%)"] = "";
          base["Desc. Umidade (Kg)"] = "";
          base["Desc. Impureza (Kg)"] = "";
          base["Desc. Secagem (Kg)"] = "";
          base["Total Descontos (Kg)"] = "";
        }
        base["Peso Líquido (Kg)"] = l.kg;
        return base;
      })
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 30 }, // Produtor
      { wch: 18 }, // Tipo de Grão
      { wch: 12 }, // Data
      { wch: 10 }, // Operação
      { wch: 10 }, // Placa
      { wch: 16 }, // Peso Bruto
      { wch: 16 }, // Umidade Ini
      { wch: 14 }, // Umidade Alvo
      { wch: 12 }, // Impureza
      { wch: 14 }, // Tx Secagem
      { wch: 16 }, // Desc Umidade
      { wch: 16 }, // Desc Impureza
      { wch: 16 }, // Desc Secagem
      { wch: 18 }, // Total Descontos
      { wch: 18 }, // Peso Líquido
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extrato de Estoque");

    const hoje = new Date();
    const nomeArquivo = `Relatorio_Estoque_${String(hoje.getDate()).padStart(2, "0")}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${hoje.getFullYear()}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
    toast.success("Planilha Excel exportada!");
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><FileBarChart className="h-6 w-6 text-primary" /><h1 className="page-title">Extrato de Estoque</h1></div>
        <p className="page-subtitle">Histórico detalhado de movimentações por produtor e tipo de grão</p>
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

        {grupos.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Nenhum registro encontrado.</div>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {grupos.map(g => (
              <AccordionItem key={g.key} value={g.key} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex flex-1 items-center justify-between gap-4 mr-4">
                    <div className="flex items-center gap-3 text-left">
                      <div>
                        <span className="font-semibold text-foreground">{g.produtorNome}</span>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{g.tipoGraoNome}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">{g.lancamentos.length} lançamentos</Badge>
                    </div>
                    <span className={`font-display font-bold text-lg tabular-nums ${g.saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                      {fmt(g.saldo)} Kg
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-24">Data</TableHead>
                          <TableHead className="w-28">Operação</TableHead>
                          <TableHead>Placa</TableHead>
                          <TableHead className="text-right">Peso Bruto</TableHead>
                          <TableHead className="text-right">Umid. Ini/Alvo</TableHead>
                          <TableHead className="text-right">Impureza</TableHead>
                          <TableHead className="text-right">Tx Secagem</TableHead>
                          <TableHead className="text-right">Descontos (Kg)</TableHead>
                          <TableHead className="text-right">Peso Líquido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.lancamentos.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="tabular-nums">{new Date(l.data).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell>
                              {l.tipo === "entrada" ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hover:bg-emerald-100 gap-1">
                                  <ArrowDownToLine className="h-3 w-3" /> Entrada
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 hover:bg-red-100 gap-1">
                                  <ArrowUpFromLine className="h-3 w-3" /> Saída
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{l.placa}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.tipo === "entrada" ? fmt(l.pesoBruto!) : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.tipo === "entrada" ? `${fmt2(l.umidadeInicial!)}% / ${fmt2(l.umidadeFinalAlvo!)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.tipo === "entrada" ? `${fmt2(l.impureza!)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.tipo === "entrada" ? `${fmt2(l.taxaSecagem!)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                              {l.tipo === "entrada" ? `−${fmt(l.totalDescontos!)}` : "—"}
                            </TableCell>
                            <TableCell className={`text-right font-semibold tabular-nums ${l.tipo === "entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                              {l.tipo === "entrada" ? "+" : "−"}{fmt(l.kg)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Summary footer */}
                  <div className="grid grid-cols-3 divide-x border-t bg-muted/20">
                    <div className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Entradas</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+{fmt(g.kgsEntrada)} Kg</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Saídas</p>
                      <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{fmt(g.kgsSaida)} Kg</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Saldo Final</p>
                      <p className={`font-bold text-lg tabular-nums ${g.saldo >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(g.saldo)} Kg</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
