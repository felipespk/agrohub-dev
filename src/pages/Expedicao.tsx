import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppContext";
import { Truck, TrendingDown, TrendingUp } from "lucide-react";

const UMIDADE_IDEAL = 13; // Umidade ideal padrão

interface SaidaComAjuste {
  id: string;
  data: string;
  placa_caminhao: string;
  comprador_nome: string;
  produtor_nome: string | undefined;
  categoria: string;
  kgs_expedidos: number;
  umidade_saida: number;
  peso_ajustado: number;
  ajuste_kg: number;
  tipo_ajuste: "desconto" | "acrescimo" | "neutro";
  valor_expedicao: number;
}

export default function ExpedicaoPage() {
  const { saidas } = useAppData();

  // Calcula peso ajustado para cada saída
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

      return {
        id: s.id,
        data: s.data,
        placa_caminhao: s.placa_caminhao,
        comprador_nome: s.comprador_nome || "",
        produtor_nome: s.produtor_nome,
        categoria: s.categoria,
        kgs_expedidos: s.kgs_expedidos,
        umidade_saida: umidade,
        peso_ajustado: Math.max(0, peso_ajustado),
        ajuste_kg,
        tipo_ajuste,
      };
    });
  }, [saidas]);

  const totalPesoBruto = saidasComAjuste.reduce((sum, s) => sum + s.kgs_expedidos, 0);
  const totalPesoAjustado = saidasComAjuste.reduce((sum, s) => sum + s.peso_ajustado, 0);

  const fmtKg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtSacos = (kgs: number) => (kgs / 60).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtTon = (kgs: number) => (kgs / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const fmtPct = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /><h1 className="page-title">Expedição</h1></div>
        <p className="page-subtitle">Resumo consolidado de expedições com ajuste de umidade (base: {UMIDADE_IDEAL}%)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
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
              <TableHead className="text-right">Umid. (%)</TableHead>
              <TableHead className="text-right">Peso (Kg)</TableHead>
              <TableHead className="text-right">Ajuste</TableHead>
              <TableHead className="text-right">Peso Ajustado</TableHead>
              <TableHead className="text-right">Sacos</TableHead>
              <TableHead className="text-right">Toneladas</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {saidasComAjuste.map(s => (
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
                </TableRow>
              ))}
            </TableBody>
            <TableFooter><TableRow>
              <TableCell colSpan={6} className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{fmtKg(totalPesoBruto)}</TableCell>
              <TableCell className="text-right font-bold tabular-nums text-muted-foreground">
                {totalPesoAjustado >= totalPesoBruto ? "+" : "−"}{fmtKg(Math.abs(totalPesoAjustado - totalPesoBruto))}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-primary">{fmtKg(totalPesoAjustado)}</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{fmtSacos(totalPesoAjustado)}</TableCell>
              <TableCell className="text-right font-bold tabular-nums">{fmtTon(totalPesoAjustado)}</TableCell>
            </TableRow></TableFooter>
          </Table>
        </div>
      </div>
    </div>
  );
}
