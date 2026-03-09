import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAppData } from "@/contexts/AppContext";
import { FileBarChart, Download, ArrowDownToLine, ArrowUpFromLine, List } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { formatDateBR, parseLocalDate } from "@/lib/date";

type FilterMode = "all" | "in" | "out";

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
  // Saída fields
  umidadeSaida?: number;
  classificacao?: string;
}

export default function RelatorioPage() {
  const { produtores, tiposGrao, recebimentos, saidas } = useAppData();
  const [filtroProdutorId, setFiltroProdutorId] = useState("todos");
  const [filtroGraoId, setFiltroGraoId] = useState("todos");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // Função para filtrar lançamentos pelo modo
  const filterLancamentos = (lancamentos: LancamentoUnificado[]) => {
    if (filterMode === "in") return lancamentos.filter(l => l.tipo === "entrada");
    if (filterMode === "out") return lancamentos.filter(l => l.tipo === "saida");
    return lancamentos;
  };

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
        existing.lancamentos.push({
          id: s.id, data: s.data, tipo: "saida", placa: s.placa_caminhao, kg: s.kgs_expedidos,
          umidadeSaida: s.umidade_saida,
          classificacao: s.classificacao || "",
        });
      }
    }

    return Array.from(map.entries()).map(([key, val]) => {
      val.lancamentos.sort((a, b) => a.data.localeCompare(b.data));
      return { key, ...val, saldo: val.kgsEntrada - val.kgsSaida };
    });
  }, [filtroProdutorId, filtroGraoId, recebimentos, saidas]);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmt2 = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheetName = filterMode === "in" ? "Entradas" : filterMode === "out" ? "Saídas" : "Extrato de Estoque";
    const ws = workbook.addWorksheet(sheetName);

    // Page Setup
    ws.pageSetup.orientation = "landscape";
    ws.pageSetup.fitToPage = true;
    ws.pageSetup.fitToWidth = 1;
    ws.pageSetup.fitToHeight = 0;
    ws.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };

    // Dynamic columns based on filterMode
    const baseColumns = [
      { header: "Produtor", key: "produtor", width: 30 },
      { header: "Tipo de Grão", key: "tipoGrao", width: 18 },
      { header: "Data", key: "data", width: 12 },
    ];

    const entradaColumns = [
      { header: "Placa", key: "placa", width: 12 },
      { header: "Peso Bruto (Kg)", key: "pesoBruto", width: 16 },
      { header: "Umidade Ini (%)", key: "umidIni", width: 16 },
      { header: "Umidade Alvo (%)", key: "umidAlvo", width: 16 },
      { header: "Impureza (%)", key: "impureza", width: 14 },
      { header: "Tx Secagem (%)", key: "txSecagem", width: 14 },
      { header: "Desc. Umidade (Kg)", key: "ajusteUmid", width: 20 },
      { header: "Desc. Impureza (Kg)", key: "descImp", width: 18 },
      { header: "Desc. Secagem (Kg)", key: "descSec", width: 18 },
      { header: "Peso Líquido (Kg)", key: "pesoLiq", width: 18 },
    ];

    const saidaColumns = [
      { header: "Placa", key: "placa", width: 12 },
      { header: "Comprador", key: "comprador_destino", width: 24 },
      { header: "Categoria", key: "categoria", width: 14 },
      { header: "Peso (Kg)", key: "pesoKg", width: 16 },
      { header: "Umidade Saída (%)", key: "umidSaida", width: 18 },
      { header: "Classificação", key: "classificacao", width: 14 },
      { header: "Sacos", key: "sacos", width: 12 },
      { header: "Toneladas", key: "toneladas", width: 14 },
      { header: "Taxa Exp. (R$)", key: "taxaExp", width: 16 },
    ];

    const allColumns = [
      { header: "Operação", key: "operacao", width: 12 },
      { header: "Placa", key: "placa", width: 12 },
      { header: "Peso Bruto (Kg)", key: "pesoBruto", width: 16 },
      { header: "Umidade Ini (%)", key: "umidIni", width: 16 },
      { header: "Umidade Alvo (%)", key: "umidAlvo", width: 16 },
      { header: "Umidade Saída (%)", key: "umidSaida", width: 18 },
      { header: "Classificação", key: "classificacao", width: 14 },
      { header: "Impureza (%)", key: "impureza", width: 14 },
      { header: "Tx Secagem (%)", key: "txSecagem", width: 14 },
      { header: "Ajuste Umidade (Kg)", key: "ajusteUmid", width: 20 },
      { header: "Desc. Impureza (Kg)", key: "descImp", width: 18 },
      { header: "Desc. Secagem (Kg)", key: "descSec", width: 18 },
      { header: "Peso Líquido (Kg)", key: "pesoLiq", width: 18 },
    ];

    if (filterMode === "in") {
      ws.columns = [...baseColumns, ...entradaColumns];
    } else if (filterMode === "out") {
      ws.columns = [...baseColumns, ...saidaColumns];
    } else {
      ws.columns = [...baseColumns, ...allColumns];
    }

    // Format date column
    ws.getColumn("data").numFmt = "dd/mm/yy";

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });
    headerRow.height = 22;

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };


    // Add data rows
    for (const g of grupos) {
      const lancamentosFiltrados = filterLancamentos(g.lancamentos);

      for (const l of lancamentosFiltrados) {
        const isEntrada = l.tipo === "entrada";
        let rowData: Record<string, any>;

        if (filterMode === "in") {
          rowData = {
            produtor: g.produtorNome,
            tipoGrao: g.tipoGraoNome,
            data: parseLocalDate(l.data),
            placa: l.placa,
            pesoBruto: l.pesoBruto,
            umidIni: l.umidadeInicial,
            umidAlvo: l.umidadeFinalAlvo,
            impureza: l.impureza,
            txSecagem: l.taxaSecagem,
            ajusteUmid: l.descontoUmidadeKg,
            descImp: l.descontoImpurezaKg,
            descSec: l.descontoSecagemKg,
            pesoLiq: l.kg,
          };
        } else if (filterMode === "out") {
          rowData = {
            produtor: g.produtorNome,
            tipoGrao: g.tipoGraoNome,
            data: parseLocalDate(l.data),
            placa: l.placa,
            comprador_destino: "", // saidas don't have comprador in lancamento; filled from context if needed
            categoria: "",
            pesoKg: l.kg,
            umidSaida: l.umidadeSaida,
            classificacao: l.classificacao || "",
            sacos: Math.ceil(l.kg / 60),
            toneladas: Math.round((l.kg / 1000) * 1000) / 1000,
            taxaExp: "", // stored in saida record
          };
        } else {
          rowData = {
            produtor: g.produtorNome,
            tipoGrao: g.tipoGraoNome,
            data: parseDate(l.data),
            operacao: isEntrada ? "Entrada" : "Saída",
            placa: l.placa,
            pesoBruto: isEntrada ? l.pesoBruto : "—",
            umidIni: isEntrada ? l.umidadeInicial : "—",
            umidAlvo: isEntrada ? l.umidadeFinalAlvo : "—",
            umidSaida: !isEntrada ? l.umidadeSaida : "—",
            classificacao: !isEntrada ? (l.classificacao || "—") : "—",
            impureza: isEntrada ? l.impureza : "—",
            txSecagem: isEntrada ? l.taxaSecagem : "—",
            ajusteUmid: isEntrada ? l.descontoUmidadeKg : "—",
            descImp: isEntrada ? l.descontoImpurezaKg : "—",
            descSec: isEntrada ? l.descontoSecagemKg : "—",
            pesoLiq: l.kg,
          };
        }

        const row = ws.addRow(rowData);
        const bgColor = isEntrada ? "FFECFDF5" : "FFFEF2F2";
        const fontColor = isEntrada ? "FF065F46" : "FF991B1B";

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = thinBorder;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
          cell.font = { color: { argb: fontColor }, size: 10 };
        });
      }

      // Summary row per group
      const kgsEntradaFiltrado = lancamentosFiltrados.filter(l => l.tipo === "entrada").reduce((s, l) => s + l.kg, 0);
      const kgsSaidaFiltrado = lancamentosFiltrados.filter(l => l.tipo === "saida").reduce((s, l) => s + l.kg, 0);
      const saldoFiltrado = kgsEntradaFiltrado - kgsSaidaFiltrado;

      if (lancamentosFiltrados.length > 0) {
        const summaryData: Record<string, any> = {
          produtor: `TOTAL — ${g.produtorNome} / ${g.tipoGraoNome}`,
        };

        if (filterMode === "in") {
          summaryData.pesoLiq = kgsEntradaFiltrado;
        } else if (filterMode === "out") {
          summaryData.pesoKg = kgsSaidaFiltrado;
        } else {
          summaryData.operacao = `E: ${kgsEntradaFiltrado} | S: ${kgsSaidaFiltrado}`;
          summaryData.pesoLiq = saldoFiltrado;
        }

        const summaryRow = ws.addRow(summaryData);
        summaryRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = thinBorder;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
          cell.font = { bold: true, size: 10, color: { argb: "FF1E3A8A" } };
        });
      }
    }

    // Download
    const hoje = new Date();
    const filterSuffix = filterMode === "in" ? "_Entradas" : filterMode === "out" ? "_Saidas" : "";
    const nomeArquivo = `Relatorio_Estoque${filterSuffix}_${String(hoje.getDate()).padStart(2, "0")}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${hoje.getFullYear()}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Operação</label>
            <ToggleGroup type="single" value={filterMode} onValueChange={v => v && setFilterMode(v as FilterMode)} className="justify-start">
              <ToggleGroupItem value="all" className="gap-1 text-xs px-3">
                <List className="h-3.5 w-3.5" /> Tudo
              </ToggleGroupItem>
              <ToggleGroupItem value="in" className="gap-1 text-xs px-3">
                <ArrowDownToLine className="h-3.5 w-3.5" /> Entradas
              </ToggleGroupItem>
              <ToggleGroupItem value="out" className="gap-1 text-xs px-3">
                <ArrowUpFromLine className="h-3.5 w-3.5" /> Saídas
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button variant="outline" onClick={exportExcel} className="gap-2 self-end"><Download className="h-4 w-4" /> Exportar Excel (.xlsx)</Button>
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
                          <TableHead className="text-right">Umidade (%)</TableHead>
                          <TableHead className="text-center">Classificação</TableHead>
                          <TableHead className="text-right">Impureza</TableHead>
                          <TableHead className="text-right">Tx Secagem</TableHead>
                          <TableHead className="text-right">Ajuste Umidade (Kg)</TableHead>
                          <TableHead className="text-right">Peso Líquido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filterLancamentos(g.lancamentos).map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="tabular-nums">{formatDateBR(l.data)}</TableCell>
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
                              {l.tipo === "entrada"
                                ? `${fmt2(l.umidadeInicial!)}% → ${fmt2(l.umidadeFinalAlvo!)}%`
                                : l.umidadeSaida ? `${fmt2(l.umidadeSaida)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {l.tipo === "saida" ? (l.classificacao || "—") : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.tipo === "entrada" ? `${fmt2(l.impureza!)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.tipo === "entrada" ? `${fmt2(l.taxaSecagem!)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {l.tipo === "entrada"
                                ? (() => {
                                    const kg = l.descontoUmidadeKg || 0;
                                    if (kg > 0) return <span className="text-amber-600 dark:text-amber-400">−{fmt(kg)}</span>;
                                    if (kg < 0) return <span className="text-emerald-600 dark:text-emerald-400">+{fmt(Math.abs(kg))}</span>;
                                    return "0";
                                  })()
                                : "—"}
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
