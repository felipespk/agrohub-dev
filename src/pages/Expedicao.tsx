import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/contexts/AppContext";
import { Truck, TrendingDown, TrendingUp, Calendar, Warehouse, Filter, X } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const UMIDADE_IDEAL = 13; // Umidade ideal padrão
const CARENCIA_DIAS = 30; // Carência de 30 dias grátis
const TAXA_QUINZENAL_SACA = 0.15; // R$ 0,15 por saca por quinzena (valor default do recebimento)

interface SaidaComAjuste {
  id: string;
  data: string;
  placa_caminhao: string;
  comprador_nome: string;
  produtor_nome: string | undefined;
  produtor_id: string | null | undefined;
  categoria: string;
  kgs_expedidos: number;
  umidade_saida: number;
  peso_ajustado: number;
  ajuste_kg: number;
  tipo_ajuste: "desconto" | "acrescimo" | "neutro";
  valor_expedicao: number;
  // Armazenamento
  diasArmazenados: number;
  diasCobrados: number;
  quinzenas: number;
  taxaQuinzenal: number;
  valorArmazenamento: number;
  dataEntrada: string | null;
}

export default function ExpedicaoPage() {
  const { saidas, recebimentos } = useAppData();
  
  // Filter states
  const [filterProdutor, setFilterProdutor] = useState<string>("");
  const [filterComprador, setFilterComprador] = useState<string>("");

  // Calcula peso ajustado + armazenamento para cada saída
  const saidasComAjuste = useMemo<SaidaComAjuste[]>(() => {
    return saidas.map(s => {
      const umidade = s.umidade_saida || UMIDADE_IDEAL;
      const delta = umidade - UMIDADE_IDEAL;
      let ajuste_kg = 0;
      let tipo_ajuste: "desconto" | "acrescimo" | "neutro" = "neutro";

      if (delta > 0) {
        // Acima do ideal → desconto 1.3% por ponto
        ajuste_kg = s.kgs_expedidos * (delta * 0.013);
        tipo_ajuste = "desconto";
      } else if (delta < 0) {
        // Abaixo do ideal → acréscimo 1.5% por ponto
        ajuste_kg = s.kgs_expedidos * (Math.abs(delta) * 0.015);
        tipo_ajuste = "acrescimo";
      }

      const peso_ajustado = tipo_ajuste === "acrescimo"
        ? s.kgs_expedidos + ajuste_kg
        : s.kgs_expedidos - ajuste_kg;

      // Cálculo de armazenamento - buscar data de entrada mais antiga do produtor
      let diasArmazenados = 0;
      let diasCobrados = 0;
      let quinzenas = 0;
      let taxaQuinzenal = TAXA_QUINZENAL_SACA;
      let valorArmazenamento = 0;
      let dataEntrada: string | null = null;

      if (s.produtor_id) {
        // Encontrar recebimentos do produtor ordenados por data
        const recebimentosProdutor = recebimentos
          .filter(r => r.produtor_id === s.produtor_id)
          .sort((a, b) => a.data.localeCompare(b.data));

        if (recebimentosProdutor.length > 0) {
          // Usar a data do primeiro recebimento como data de entrada
          const primeiroRecebimento = recebimentosProdutor[0];
          dataEntrada = primeiroRecebimento.data;
          taxaQuinzenal = primeiroRecebimento.valor_armazenamento || TAXA_QUINZENAL_SACA;

          // Calcular dias armazenados
          const dataSaida = parseISO(s.data);
          const dataEntradaParsed = parseISO(dataEntrada);
          diasArmazenados = differenceInDays(dataSaida, dataEntradaParsed);

          // Aplicar carência de 30 dias
          diasCobrados = Math.max(0, diasArmazenados - CARENCIA_DIAS);

          // Calcular quinzenas (arredondando para cima)
          if (diasCobrados > 0) {
            quinzenas = Math.ceil(diasCobrados / 15);
          }

          // Calcular valor: quinzenas * taxa * sacos
          const sacos = Math.ceil(peso_ajustado / 60);
          valorArmazenamento = quinzenas * taxaQuinzenal * sacos;
        }
      }

      return {
        id: s.id,
        data: s.data,
        placa_caminhao: s.placa_caminhao,
        comprador_nome: s.comprador_nome || "",
        produtor_nome: s.produtor_nome,
        produtor_id: s.produtor_id,
        categoria: s.categoria,
        kgs_expedidos: s.kgs_expedidos,
        umidade_saida: umidade,
        peso_ajustado: Math.max(0, peso_ajustado),
        ajuste_kg,
        tipo_ajuste,
        valor_expedicao: s.valor_expedicao || 0,
        diasArmazenados,
        diasCobrados,
        quinzenas,
        taxaQuinzenal,
        valorArmazenamento,
        dataEntrada,
      };
    });
  }, [saidas, recebimentos]);

  // Extract unique produtores and compradores for filter options
  const produtoresUnicos = useMemo(() => {
    const set = new Set<string>();
    saidasComAjuste.forEach(s => {
      if (s.produtor_nome) set.add(s.produtor_nome);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [saidasComAjuste]);

  const compradoresUnicos = useMemo(() => {
    const set = new Set<string>();
    saidasComAjuste.forEach(s => {
      if (s.comprador_nome) set.add(s.comprador_nome);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [saidasComAjuste]);

  // Apply filters
  const saidasFiltradas = useMemo(() => {
    return saidasComAjuste
      .filter(s => !filterProdutor || s.produtor_nome === filterProdutor)
      .filter(s => !filterComprador || s.comprador_nome === filterComprador);
  }, [saidasComAjuste, filterProdutor, filterComprador]);

  const hasActiveFilters = filterProdutor || filterComprador;

  const clearFilters = () => {
    setFilterProdutor("");
    setFilterComprador("");
  };

  // Totals calculated from FILTERED data
  const totalPesoBruto = saidasFiltradas.reduce((sum, s) => sum + s.kgs_expedidos, 0);
  const totalPesoAjustado = saidasFiltradas.reduce((sum, s) => sum + s.peso_ajustado, 0);
  const totalValorExpedicao = saidasFiltradas.reduce((sum, s) => sum + s.valor_expedicao, 0);
  const totalValorArmazenamento = saidasFiltradas.reduce((sum, s) => sum + s.valorArmazenamento, 0);

  const fmtKg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtSacos = (kgs: number) => (kgs / 60).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtTon = (kgs: number) => (kgs / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmtPct = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  const getArmazenamentoLabel = (s: SaidaComAjuste) => {
    if (!s.produtor_id || !s.dataEntrada) return "Sem produtor vinculado";
    if (s.diasCobrados <= 0) return `${s.diasArmazenados} dias (carência)`;
    return `${s.diasArmazenados} dias - ${s.quinzenas} quinz.`;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /><h1 className="page-title">Expedição</h1></div>
        <p className="page-subtitle">Resumo consolidado de expedições com ajuste de umidade (base: {UMIDADE_IDEAL}%) e armazenamento (carência: {CARENCIA_DIAS} dias)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Peso Bruto Total</p>
          <p className="text-2xl font-display font-bold text-foreground">{fmtKg(totalPesoBruto)} Kg</p>
        </div>
        <div className="kpi-card border-primary/30 bg-primary/5">
          <p className="text-xs text-muted-foreground">Peso Ajustado Total</p>
          <p className="text-2xl font-display font-bold text-primary">{fmtKg(totalPesoAjustado)} Kg</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Total de Sacos</p>
          <p className="text-2xl font-display font-bold text-foreground">{fmtSacos(totalPesoAjustado)}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-muted-foreground">Total de Toneladas</p>
          <p className="text-2xl font-display font-bold text-foreground">{fmtTon(totalPesoAjustado)}</p>
        </div>
        <div className="kpi-card border-emerald-500/30 bg-emerald-500/5">
          <p className="text-xs text-muted-foreground">Taxa de Expedição</p>
          <p className="text-2xl font-display font-bold text-emerald-600 dark:text-emerald-400">{fmtBRL(totalValorExpedicao)}</p>
        </div>
        <div className="kpi-card border-amber-500/30 bg-amber-500/5">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Warehouse className="h-3 w-3" /> Armazenamento</p>
          <p className="text-2xl font-display font-bold text-amber-600 dark:text-amber-400">{fmtBRL(totalValorArmazenamento)}</p>
        </div>
      </div>

      <div className="form-section">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="font-display font-semibold text-lg text-foreground">Detalhamento das Expedições</h2>
          
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filtros:</span>
            </div>
            
            <Select value={filterProdutor} onValueChange={setFilterProdutor}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="Produtor" />
              </SelectTrigger>
              <SelectContent>
                {produtoresUnicos.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterComprador} onValueChange={setFilterComprador}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="Comprador" />
              </SelectTrigger>
              <SelectContent>
                {compradoresUnicos.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground mb-3">
            Exibindo {saidasFiltradas.length} de {saidasComAjuste.length} registros
          </p>
        )}

        <div className="overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Produtor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Umid. (%)</TableHead>
                <TableHead className="text-right">Peso (Kg)</TableHead>
                <TableHead className="text-right">Ajuste</TableHead>
                <TableHead className="text-right">Peso Ajustado</TableHead>
                <TableHead className="text-right">Sacos</TableHead>
                <TableHead className="text-right">Toneladas</TableHead>
                <TableHead className="text-right">Taxa Exp. (R$)</TableHead>
                <TableHead className="text-right">Armaz. (R$)</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {saidasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters ? "Nenhum registro encontrado com os filtros selecionados." : "Nenhuma expedição registrada."}
                    </TableCell>
                  </TableRow>
                ) : (
                  saidasFiltradas.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="tabular-nums">{new Date(s.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-mono">{s.placa_caminhao}</TableCell>
                      <TableCell>{s.comprador_nome}</TableCell>
                      <TableCell>{s.produtor_nome || "—"}</TableCell>
                      <TableCell>{s.categoria}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPct(s.umidade_saida)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtKg(s.kgs_expedidos)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.tipo_ajuste === "neutro" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : s.tipo_ajuste === "desconto" ? (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                            <TrendingDown className="h-3 w-3" />−{fmtKg(s.ajuste_kg)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                            <TrendingUp className="h-3 w-3" />+{fmtKg(s.ajuste_kg)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-primary">{fmtKg(s.peso_ajustado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtSacos(s.peso_ajustado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtTon(s.peso_ajustado)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{fmtBRL(s.valor_expedicao)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`font-medium cursor-help ${s.valorArmazenamento > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                              {s.valorArmazenamento > 0 ? fmtBRL(s.valorArmazenamento) : "—"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Calendar className="h-3 w-3" />
                              <span>{getArmazenamentoLabel(s)}</span>
                            </div>
                            {s.produtor_id && s.dataEntrada && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Entrada: {new Date(s.dataEntrada).toLocaleDateString("pt-BR")} · Taxa: {fmtBRL(s.taxaQuinzenal)}/saca/quinz.
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {saidasFiltradas.length > 0 && (
                <TableFooter><TableRow>
                  <TableCell colSpan={6} className="font-semibold">Total {hasActiveFilters ? "(filtrado)" : ""}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{fmtKg(totalPesoBruto)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-muted-foreground">
                    {totalPesoAjustado >= totalPesoBruto ? "+" : "−"}{fmtKg(Math.abs(totalPesoAjustado - totalPesoBruto))}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-primary">{fmtKg(totalPesoAjustado)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{fmtSacos(totalPesoAjustado)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{fmtTon(totalPesoAjustado)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtBRL(totalValorExpedicao)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-amber-600 dark:text-amber-400">{fmtBRL(totalValorArmazenamento)}</TableCell>
                </TableRow></TableFooter>
              )}
            </Table>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}