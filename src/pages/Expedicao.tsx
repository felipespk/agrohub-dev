import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/contexts/AppContext";
import { formatDateBR } from "@/lib/date";
import { Truck, TrendingDown, TrendingUp, Calendar, Warehouse, Filter, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CARENCIA_DIAS = 30;

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
  umidade_combinada: number;
  peso_ajustado: number;
  ajuste_kg: number;
  tipo_ajuste: "desconto" | "acrescimo" | "neutro";
  valor_expedicao: number;
  diasArmazenados: number;
  diasCobrados: number;
  quinzenas: number;
  valorArmazenamento: number;
  dataEntrada: string | null;
  tipo_grao_nome: string;
}

export default function ExpedicaoPage() {
  const { saidas, recebimentos, tiposGrao } = useAppData();

  const [filterProdutor, setFilterProdutor] = useState<string>("");
  const [filterComprador, setFilterComprador] = useState<string>("");

  // Use per-record saved data (calculated at SaidaVenda time)
  const saidasComAjuste = useMemo<SaidaComAjuste[]>(() => {
    return saidas.map(s => {
      const grao = tiposGrao.find(t => t.id === s.tipo_grao_id);
      const umidadeComb = s.umidade_combinada || grao?.umidade_padrao || 12;
      const taxaAgio = grao?.taxa_agio ?? 1.3;
      const taxaDesagio = grao?.taxa_desagio ?? 1.5;
      const umidadeReal = s.umidade_saida || umidadeComb;
      const diferenca = umidadeReal - umidadeComb;

      let ajuste_kg = 0;
      let tipo_ajuste: "desconto" | "acrescimo" | "neutro" = "neutro";

      if (diferenca > 0) {
        ajuste_kg = s.kgs_expedidos * (diferenca * (taxaAgio / 100));
        tipo_ajuste = "acrescimo";
      } else if (diferenca < 0) {
        ajuste_kg = s.kgs_expedidos * (Math.abs(diferenca) * (taxaDesagio / 100));
        tipo_ajuste = "desconto";
      }

      const peso_ajustado = s.peso_ajustado > 0 ? s.peso_ajustado :
        tipo_ajuste === "acrescimo" ? s.kgs_expedidos + ajuste_kg : s.kgs_expedidos - ajuste_kg;

      // Use saved storage data or recalculate
      let diasArmazenados = s.dias_armazenados || 0;
      let diasCobrados = Math.max(0, diasArmazenados - CARENCIA_DIAS);
      let quinzenas = s.quinzenas_cobradas || (diasCobrados > 0 ? Math.ceil(diasCobrados / 15) : 0);
      let valorArmazenamento = s.valor_armazenamento_exp || 0;
      let dataEntrada: string | null = null;

      // Find linked recebimento for display
      if (s.recebimento_id) {
        const rec = recebimentos.find(r => r.id === s.recebimento_id);
        if (rec) dataEntrada = rec.data;
      }

      return {
        id: s.id, data: s.data, placa_caminhao: s.placa_caminhao,
        comprador_nome: s.comprador_nome || "", produtor_nome: s.produtor_nome,
        produtor_id: s.produtor_id, categoria: s.categoria,
        kgs_expedidos: s.kgs_expedidos, umidade_saida: umidadeReal,
        umidade_combinada: umidadeComb,
        peso_ajustado: Math.max(0, peso_ajustado), ajuste_kg, tipo_ajuste,
        valor_expedicao: s.valor_expedicao || 0,
        diasArmazenados, diasCobrados, quinzenas, valorArmazenamento, dataEntrada,
        tipo_grao_nome: s.tipo_grao_nome || grao?.nome || "",
      };
    });
  }, [saidas, recebimentos, tiposGrao]);

  const produtoresUnicos = useMemo(() => {
    const set = new Set<string>();
    saidasComAjuste.forEach(s => { if (s.produtor_nome) set.add(s.produtor_nome); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [saidasComAjuste]);

  const compradoresUnicos = useMemo(() => {
    const set = new Set<string>();
    saidasComAjuste.forEach(s => { if (s.comprador_nome) set.add(s.comprador_nome); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [saidasComAjuste]);

  const saidasFiltradas = useMemo(() => {
    return saidasComAjuste
      .filter(s => !filterProdutor || s.produtor_nome === filterProdutor)
      .filter(s => !filterComprador || s.comprador_nome === filterComprador);
  }, [saidasComAjuste, filterProdutor, filterComprador]);

  const hasActiveFilters = filterProdutor || filterComprador;
  const clearFilters = () => { setFilterProdutor(""); setFilterComprador(""); };

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
    if (!s.dataEntrada) return "Sem lote vinculado";
    if (s.diasCobrados <= 0) return `${s.diasArmazenados} dias (carência)`;
    return `${s.diasArmazenados} dias - ${s.quinzenas} quinz.`;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /><h1 className="page-title">Expedição</h1></div>
        <p className="page-subtitle">Resumo consolidado com ajuste de umidade por grão e armazenamento (carência: {CARENCIA_DIAS} dias)</p>
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Filter className="h-3.5 w-3.5" /><span>Filtros:</span></div>
            <Select value={filterProdutor} onValueChange={setFilterProdutor}>
              <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Produtor" /></SelectTrigger>
              <SelectContent>{produtoresUnicos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterComprador} onValueChange={setFilterComprador}>
              <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Comprador" /></SelectTrigger>
              <SelectContent>{compradoresUnicos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />Limpar
              </Button>
            )}
          </div>
        </div>

        {hasActiveFilters && <p className="text-xs text-muted-foreground mb-3">Exibindo {saidasFiltradas.length} de {saidasComAjuste.length} registros</p>}

        <div className="overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Comprador</TableHead>
                <TableHead>Produtor</TableHead><TableHead>Grão</TableHead><TableHead>Categoria</TableHead>
                <TableHead className="text-right">Umid. (%)</TableHead><TableHead className="text-right">Comb. (%)</TableHead>
                <TableHead className="text-right">Peso (Kg)</TableHead><TableHead className="text-right">Ajuste</TableHead>
                <TableHead className="text-right">Peso Ajustado</TableHead><TableHead className="text-right">Sacos</TableHead>
                <TableHead className="text-right">Toneladas</TableHead><TableHead className="text-right">Taxa Exp.</TableHead>
                <TableHead className="text-right">Armaz.</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {saidasFiltradas.length === 0 ? (
                  <TableRow><TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? "Nenhum registro encontrado." : "Nenhuma expedição registrada."}
                  </TableCell></TableRow>
                ) : saidasFiltradas.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="tabular-nums">{formatDateBR(s.data)}</TableCell>
                    <TableCell className="font-mono">{s.placa_caminhao}</TableCell>
                    <TableCell>{s.comprador_nome}</TableCell>
                    <TableCell>{s.produtor_nome || "—"}</TableCell>
                    <TableCell>{s.tipo_grao_nome || "—"}</TableCell>
                    <TableCell>{s.categoria}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(s.umidade_saida)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(s.umidade_combinada)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtKg(s.kgs_expedidos)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.tipo_ajuste === "neutro" ? <span className="text-muted-foreground">—</span> :
                        s.tipo_ajuste === "desconto" ? (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1"><TrendingDown className="h-3 w-3" />−{fmtKg(s.ajuste_kg)}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1"><TrendingUp className="h-3 w-3" />+{fmtKg(s.ajuste_kg)}</span>
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
                          <div className="flex items-center gap-1.5 text-xs"><Calendar className="h-3 w-3" /><span>{getArmazenamentoLabel(s)}</span></div>
                          {s.dataEntrada && <p className="text-xs text-muted-foreground mt-1">Entrada: {formatDateBR(s.dataEntrada)}</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {saidasFiltradas.length > 0 && (
                <TableFooter><TableRow>
                  <TableCell colSpan={8} className="font-semibold">Total {hasActiveFilters ? "(filtrado)" : ""}</TableCell>
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
