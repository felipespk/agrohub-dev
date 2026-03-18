import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAppData, Saida } from "@/contexts/AppContext";
import { ArrowUpFromLine, Save, Edit2, Trash2, X, ChevronDown, Info, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { maskPlaca, maskClassificacao, maskKg, unmaskKg } from "@/lib/masks";
import { getBrazilDateInputValue, formatDateBR } from "@/lib/date";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { isRecordLocked } from "@/lib/record-lock";
import { useMasterPassword } from "@/hooks/useMasterPassword";
import MasterPasswordModal from "@/components/MasterPasswordModal";

const categorias = ["Venda", "Transferência", "Devolução", "Outros"];
const CARENCIA_DIAS = 30;

interface FatiaFIFO {
  recebimento_id: string;
  data_entrada: string;
  kg_consumidos: number;
  dias_armazenados: number;
  dias_cobrados: number;
  quinzenas: number;
  valor_armazenamento: number;
}

export default function SaidaVendaPage() {
  const { compradores, produtores, tiposGrao, saidas, recebimentos, addSaida, updateSaida, deleteSaida, refresh } = useAppData();
  const { hasPassword } = useMasterPassword();
  const [data, setData] = useState(getBrazilDateInputValue());
  const [placa, setPlaca] = useState("");
  const [compradorId, setCompradorId] = useState("");
  const [produtorId, setProdutorId] = useState("");
  const [tipoGraoId, setTipoGraoId] = useState("");
  const [categoria, setCategoria] = useState("Venda");
  const [classificacao, setClassificacao] = useState("");
  const [kgsExpedidos, setKgsExpedidos] = useState("");
  const [umidadeSaida, setUmidadeSaida] = useState("");
  const [umidadeCombinada, setUmidadeCombinada] = useState("12");
  const [taxaPorTonelada, setTaxaPorTonelada] = useState("15");
  const [taxaArmazenamento, setTaxaArmazenamento] = useState("0.15");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showComposicao, setShowComposicao] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const clearError = (field: string) =>
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  // Get selected grain config (used for umidade_padrao auto-fill)
  const _selectedGrao = tiposGrao.find(t => t.id === tipoGraoId);

  // Calculate saldo geral for selected produtor + grão
  const saldoGeral = useMemo(() => {
    if (!produtorId || !tipoGraoId) return 0;
    return recebimentos
      .filter(r => r.produtor_id === produtorId && r.tipo_grao_id === tipoGraoId)
      .reduce((sum, r) => sum + ((r as any).saldo_restante_kg || 0), 0);
  }, [produtorId, tipoGraoId, recebimentos]);

  // Calculations — Bifurcated rates with correct sign inversion
  const kgsNum = parseFloat(unmaskKg(kgsExpedidos)) || 0;
  const umidadeReal = parseFloat(umidadeSaida) || 0;
  const umidadeCombNum = parseFloat(umidadeCombinada.replace(",", ".")) || 12;
  const TAXA_AGIO = 1.5;   // Grão seco (Real < Base) → SOMA
  const TAXA_DESAGIO = 1.3; // Grão úmido (Real > Base) → SUBTRAI

  const diferencaPontos = Math.abs(umidadeReal - umidadeCombNum);
  let pesoAjustado = kgsNum;
  let kgsAjuste = 0;
  let taxaAplicada = 0;
  let tipoAjuste: "agio" | "desagio" | "neutro" = "neutro";

  if (umidadeReal < umidadeCombNum && umidadeReal > 0) {
    // ÁGIO: grão mais seco → produtor ganha peso
    taxaAplicada = TAXA_AGIO;
    const percentual = diferencaPontos * taxaAplicada;
    kgsAjuste = kgsNum * (percentual / 100);
    pesoAjustado = kgsNum + kgsAjuste;
    tipoAjuste = "agio";
  } else if (umidadeReal > umidadeCombNum) {
    // DESÁGIO: grão mais úmido → produtor perde peso
    taxaAplicada = TAXA_DESAGIO;
    const percentual = diferencaPontos * taxaAplicada;
    kgsAjuste = kgsNum * (percentual / 100);
    pesoAjustado = kgsNum - kgsAjuste;
    tipoAjuste = "desagio";
  }
  pesoAjustado = Math.max(0, pesoAjustado);

  // Real-time overage detection
  const saldoExcedido = pesoAjustado > 0 && pesoAjustado > saldoGeral && produtorId && tipoGraoId;

  const taxa = parseFloat(taxaPorTonelada.replace(",", ".")) || 15;
  const valorExpedicao = (pesoAjustado / 1000) * taxa;

  // FIFO/PEPS calculation
  const composicaoFIFO = useMemo<FatiaFIFO[]>(() => {
    if (!produtorId || !tipoGraoId || pesoAjustado <= 0 || !data) return [];

    const taxaQuinzenal = parseFloat(taxaArmazenamento.replace(",", ".")) || 0.15;
    
    // Get all entries for this produtor+grão with remaining balance, ordered by date ASC (FIFO)
    const lotesOrdenados = recebimentos
      .filter(r => r.produtor_id === produtorId && r.tipo_grao_id === tipoGraoId && ((r as any).saldo_restante_kg || 0) > 0)
      .sort((a, b) => a.data.localeCompare(b.data));

    const fatias: FatiaFIFO[] = [];
    let restante = pesoAjustado;

    for (const lote of lotesOrdenados) {
      if (restante <= 0) break;
      const saldo = (lote as any).saldo_restante_kg || 0;
      const consumir = Math.min(saldo, restante);
      
      const diasArmazenados = differenceInDays(parseISO(data), parseISO(lote.data));
      const diasCobrados = Math.max(0, diasArmazenados - CARENCIA_DIAS);
      const quinzenas = diasCobrados > 0 ? Math.ceil(diasCobrados / 15) : 0;
      const sacos = Math.ceil(consumir / 60);
      const valorFatia = quinzenas * taxaQuinzenal * sacos;

      fatias.push({
        recebimento_id: lote.id,
        data_entrada: lote.data,
        kg_consumidos: Math.round(consumir * 100) / 100,
        dias_armazenados: diasArmazenados,
        dias_cobrados: diasCobrados,
        quinzenas,
        valor_armazenamento: Math.round(valorFatia * 100) / 100,
      });

      restante -= consumir;
    }

    return fatias;
  }, [produtorId, tipoGraoId, pesoAjustado, data, recebimentos, taxaArmazenamento]);

  const totalDiasArmazenados = composicaoFIFO.length > 0
    ? Math.round(composicaoFIFO.reduce((sum, f) => sum + f.dias_armazenados * f.kg_consumidos, 0) / composicaoFIFO.reduce((sum, f) => sum + f.kg_consumidos, 0))
    : 0;
  const totalQuinzenas = composicaoFIFO.reduce((max, f) => Math.max(max, f.quinzenas), 0);
  const totalValorArmazenamento = composicaoFIFO.reduce((sum, f) => sum + f.valor_armazenamento, 0);

  // Auto-fill umidade when grain changes
  const handleGraoChange = (v: string) => {
    setTipoGraoId(v);
    clearError("tipoGraoId");
    const grao = tiposGrao.find(t => t.id === v);
    if (grao) setUmidadeCombinada(String(grao.umidade_padrao));
  };

  const handleProdutorChange = (v: string) => {
    setProdutorId(v);
    clearError("produtorId");
  };

  const clearForm = () => {
    setData(getBrazilDateInputValue());
    setPlaca(""); setCompradorId(""); setProdutorId(""); setTipoGraoId("");
    setCategoria("Venda"); setClassificacao(""); setKgsExpedidos(""); setUmidadeSaida("");
    setUmidadeCombinada("12"); setTaxaPorTonelada("15"); setTaxaArmazenamento("0.15"); setEditingId(null);
    setErrors({}); setShowComposicao(false);
  };

  const tryLockedAction = (record: Saida, action: () => void) => {
    const locked = isRecordLocked(record.created_at) && hasPassword;
    if (locked) {
      setPendingAction(() => action);
      setLockModalOpen(true);
    } else {
      action();
    }
  };

  const handleEdit = (s: Saida) => {
    setData(s.data); setPlaca(maskPlaca(s.placa_caminhao)); setCompradorId(s.comprador_id);
    setProdutorId(s.produtor_id || ""); setTipoGraoId(s.tipo_grao_id || "");
    setCategoria(s.categoria); setClassificacao(maskClassificacao(s.classificacao || ""));
    setKgsExpedidos(maskKg(String(s.kgs_expedidos))); setUmidadeSaida(String(s.umidade_saida || ""));
    setUmidadeCombinada(String(s.umidade_combinada || 12));
    const tons = s.kgs_expedidos / 1000;
    setTaxaPorTonelada(tons > 0 ? String(Math.round((s.valor_expedicao / tons) * 100) / 100) : "15");
    if (s.quinzenas_cobradas > 0 && s.peso_ajustado > 0) {
      const sacos = Math.ceil(s.peso_ajustado / 60);
      const rate = s.valor_armazenamento_exp / (s.quinzenas_cobradas * sacos);
      setTaxaArmazenamento(String(Math.round(rate * 100) / 100));
    } else {
      setTaxaArmazenamento("0.15");
    }
    setEditingId(s.id);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteSaida(id);
    if (ok) { toast.success("Saída removida."); if (editingId === id) clearForm(); await refresh(); }
  };

  const handlePreSalvar = () => {
    const newErrors: Record<string, string> = {};
    if (!placa.trim()) newErrors.placa = "Placa é obrigatória";
    if (!produtorId) newErrors.produtorId = "Selecione o produtor";
    if (!tipoGraoId) newErrors.tipoGraoId = "Selecione o tipo de grão";
    if (!compradorId) newErrors.compradorId = "Selecione o comprador";
    const rawKgs = unmaskKg(kgsExpedidos);
    if (!rawKgs || parseFloat(rawKgs) <= 0) newErrors.kgsExpedidos = "Peso deve ser maior que zero";
    if (!umidadeSaida || parseFloat(umidadeSaida) <= 0) newErrors.umidadeSaida = "Umidade de saída é obrigatória";
    if (!classificacao.trim()) newErrors.classificacao = "Classificação é obrigatória";

    if (pesoAjustado > saldoGeral) {
      newErrors.kgsExpedidos = `Saldo insuficiente. O peso ajustado (${Math.round(pesoAjustado).toLocaleString("pt-BR")} Kg) excede o saldo geral do produtor (${Math.round(saldoGeral).toLocaleString("pt-BR")} Kg).`;
    }

    if (composicaoFIFO.length === 0 && pesoAjustado > 0) {
      newErrors.kgsExpedidos = "Não há lotes disponíveis para este produtor/grão.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }
    setErrors({});
    setShowConfirmDialog(true);
  };

  const handleConfirmarSaida = async () => {
    setShowConfirmDialog(false);

    const entry = {
      data,
      placa_caminhao: placa.replace(/[^A-Z0-9]/g, "").toUpperCase(),
      comprador_id: compradorId,
      produtor_id: produtorId,
      tipo_grao_id: tipoGraoId,
      recebimento_id: null as string | null,
      classificacao,
      kgs_expedidos: kgsNum,
      umidade_saida: umidadeReal,
      umidade_combinada: umidadeCombNum,
      peso_ajustado: Math.round(pesoAjustado * 100) / 100,
      dias_armazenados: totalDiasArmazenados,
      quinzenas_cobradas: totalQuinzenas,
      valor_armazenamento_exp: Math.round(totalValorArmazenamento * 100) / 100,
      categoria,
      valor_expedicao: Math.round(valorExpedicao * 100) / 100,
      composicao_peps: composicaoFIFO,
    };

    if (editingId) {
      const ok = await updateSaida(editingId, entry);
      if (ok) { toast.success("Saída atualizada!"); clearForm(); }
    } else {
      const row = await addSaida(entry);
      if (row) {
        // SERVER-SIDE SAFETY NET: Re-check saldo before deducting
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: freshLotes } = await supabase
          .from("recebimentos")
          .select("id, saldo_restante_kg")
          .eq("produtor_id", produtorId)
          .eq("tipo_grao_id", tipoGraoId);
        const freshSaldo = (freshLotes || []).reduce((sum: number, r: any) => sum + (r.saldo_restante_kg || 0), 0);
        if (pesoAjustado > freshSaldo) {
          // Abort: delete the just-inserted saida and warn user
          await supabase.from("saidas").delete().eq("id", row.id);
          await refresh();
          toast.error(`Transação recusada: Saldo insuficiente. Saldo atual: ${Math.round(freshSaldo).toLocaleString("pt-BR")} Kg.`);
          return;
        }

        // Update saldo_restante_kg using PESO AJUSTADO (via FIFO slices)
        for (const fatia of composicaoFIFO) {
          const freshLote = (freshLotes || []).find((r: any) => r.id === fatia.recebimento_id);
          if (freshLote) {
            const novoSaldo = (freshLote.saldo_restante_kg || 0) - fatia.kg_consumidos;
            await supabase.from("recebimentos").update({ saldo_restante_kg: Math.max(0, novoSaldo) }).eq("id", fatia.recebimento_id);
          }
        }
        await refresh();
        toast.success(`Saída registrada! ${Math.round(pesoAjustado).toLocaleString("pt-BR")} Kg (peso ajustado) deduzidos do estoque via PEPS.`);
        setPlaca(""); setClassificacao(""); setKgsExpedidos(""); setUmidadeSaida("");
        setTaxaPorTonelada("15"); setTaxaArmazenamento("0.15"); setShowComposicao(false);
      }
    }
  };

  const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><ArrowUpFromLine className="h-6 w-6 text-primary" /><h1 className="page-title">Saída (Lançamento)</h1></div>
        <p className="page-subtitle">Baixa automática por saldo geral do produtor (PEPS/FIFO — Primeiro a Entrar, Primeiro a Sair)</p>
      </div>

      <div className="form-section space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-foreground">{editingId ? "Editando Saída" : "Nova Saída"}</h2>
          {editingId && <Button variant="outline" size="sm" onClick={clearForm} className="gap-1"><X className="h-4 w-4" /> Cancelar Edição</Button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Placa *</Label>
            <Input placeholder="ABC-1234" value={placa}
              onChange={e => { setPlaca(maskPlaca(e.target.value)); clearError("placa"); }}
              className={cn(errors.placa && "border-destructive focus-visible:ring-destructive")} />
            {errors.placa && <p className="text-xs text-destructive">{errors.placa}</p>}
          </div>
          <div className="space-y-1">
            <Label>Produtor *</Label>
            <Select value={produtorId} onValueChange={handleProdutorChange}>
              <SelectTrigger className={cn(errors.produtorId && "border-destructive")}><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{produtores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
            {errors.produtorId && <p className="text-xs text-destructive">{errors.produtorId}</p>}
          </div>
          <div className="space-y-1">
            <Label>Tipo de Grão *</Label>
            <Select value={tipoGraoId} onValueChange={handleGraoChange}>
              <SelectTrigger className={cn(errors.tipoGraoId && "border-destructive")}><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{tiposGrao.map(t => <SelectItem key={t.id} value={t.id}>{t.nome} (Base: {t.umidade_padrao}%)</SelectItem>)}</SelectContent>
            </Select>
            {errors.tipoGraoId && <p className="text-xs text-destructive">{errors.tipoGraoId}</p>}
          </div>
          {/* Saldo Geral - Read Only */}
          {produtorId && tipoGraoId && (
          <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                Saldo Disponível em Estoque (Kg)
                {saldoExcedido && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
              </Label>
              <div className={cn(
                "flex h-10 w-full items-center rounded-md border px-3 text-sm font-bold",
                saldoExcedido
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : saldoGeral <= 0
                    ? "bg-muted/50 text-destructive"
                    : "bg-muted/50 text-primary"
              )}>
                {Math.round(saldoGeral).toLocaleString("pt-BR")} Kg
              </div>
              {saldoExcedido && (
                <p className="text-xs font-medium text-destructive">
                  Atenção: O Peso Ajustado ({Math.round(pesoAjustado).toLocaleString("pt-BR")} Kg) ultrapassa o saldo disponível do produtor ({Math.round(saldoGeral).toLocaleString("pt-BR")} Kg).
                </p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <Label>Comprador *</Label>
            <Select value={compradorId} onValueChange={v => { setCompradorId(v); clearError("compradorId"); }}>
              <SelectTrigger className={cn(errors.compradorId && "border-destructive")}><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{compradores.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
            {errors.compradorId && <p className="text-xs text-destructive">{errors.compradorId}</p>}
          </div>
          <div className="space-y-1">
            <Label>Categoria *</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Classificação *</Label>
            <Input placeholder="Ex: 71/61" value={classificacao}
              onChange={e => { setClassificacao(maskClassificacao(e.target.value)); clearError("classificacao"); }}
              className={cn(errors.classificacao && "border-destructive focus-visible:ring-destructive")} />
            {errors.classificacao && <p className="text-xs text-destructive">{errors.classificacao}</p>}
          </div>
          <div className="space-y-1">
            <Label>Peso (Kg) *</Label>
            <Input type="text" inputMode="numeric" placeholder="15.000" value={kgsExpedidos}
              onChange={e => { setKgsExpedidos(maskKg(e.target.value)); clearError("kgsExpedidos"); }}
              className={cn(errors.kgsExpedidos && "border-destructive focus-visible:ring-destructive")} />
            {errors.kgsExpedidos && <p className="text-xs text-destructive">{errors.kgsExpedidos}</p>}
          </div>
          <div className="space-y-1">
            <Label>Umidade Real do Caminhão (%) *</Label>
            <Input type="number" step="0.1" placeholder="12.5" value={umidadeSaida}
              onChange={e => { setUmidadeSaida(e.target.value); clearError("umidadeSaida"); }}
              className={cn(errors.umidadeSaida && "border-destructive focus-visible:ring-destructive")} />
            {errors.umidadeSaida && <p className="text-xs text-destructive">{errors.umidadeSaida}</p>}
          </div>
          <div className="space-y-1">
            <Label>Umidade Combinada (%)</Label>
            <Input type="number" step="0.1" value={umidadeCombinada}
              onChange={e => setUmidadeCombinada(e.target.value)} />
            <p className="text-xs text-muted-foreground">Base contratual (auto-preenchida pelo grão)</p>
          </div>
          <div className="space-y-1">
            <Label>Taxa por Tonelada (R$)</Label>
            <Input type="text" inputMode="decimal" placeholder="15" value={taxaPorTonelada}
              onChange={e => setTaxaPorTonelada(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Taxa Armazenamento (R$/Saca/Quinz.)</Label>
            <Input type="text" inputMode="decimal" placeholder="0.15" value={taxaArmazenamento}
              onChange={e => setTaxaArmazenamento(e.target.value)} />
            <p className="text-xs text-muted-foreground">Carência: {CARENCIA_DIAS} dias grátis</p>
          </div>
        </div>

        {/* Preview dos cálculos */}
        {kgsNum > 0 && umidadeReal > 0 && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/50 p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <p className="text-muted-foreground">Peso Comercial Final</p>
                <p className="font-bold text-lg text-primary">{Math.round(pesoAjustado).toLocaleString("pt-BR")} Kg</p>
              </div>
              <div>
                <p className="text-muted-foreground">Detalhamento do Ajuste</p>
                {tipoAjuste === "neutro" ? (
                  <p className="text-sm text-muted-foreground">Sem ajuste (umidade = base)</p>
                ) : (
                  <div className="text-sm space-y-0.5">
                    <p>Diferença: <span className="font-semibold">{diferencaPontos.toFixed(1)} pontos</span></p>
                    <p>Taxa: <span className="font-semibold">{taxaAplicada}%</span> ({tipoAjuste === "agio" ? "Ágio — grão seco" : "Deságio — grão úmido"})</p>
                    <p>Ajuste: <span className={cn("font-semibold", tipoAjuste === "agio" ? "text-emerald-600" : "text-amber-600")}>
                      {tipoAjuste === "agio" ? "+" : "−"}{Math.round(kgsAjuste).toLocaleString("pt-BR")} Kg
                    </span></p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Sacos / Toneladas</p>
                <p className="font-semibold">{(pesoAjustado / 60).toFixed(2)} sc · {(pesoAjustado / 1000).toFixed(3)} ton</p>
              </div>
              <div>
                <p className="text-muted-foreground">Taxa de Expedição</p>
                <p className="font-semibold text-emerald-600">{fmtBRL(valorExpedicao)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Armazenamento (PEPS)</p>
                <p className={cn("font-semibold", totalValorArmazenamento > 0 ? "text-amber-600" : "text-muted-foreground")}>
                  {totalValorArmazenamento > 0 ? fmtBRL(totalValorArmazenamento) : composicaoFIFO.length > 0 ? "Isento (carência)" : "—"}
                </p>
                {composicaoFIFO.length > 0 && (
                  <p className="text-xs text-muted-foreground">{composicaoFIFO.length} fatia(s) · Média: {totalDiasArmazenados} dias</p>
                )}
              </div>
            </div>

            {/* FIFO Breakdown */}
            {composicaoFIFO.length > 0 && (
              <Collapsible open={showComposicao} onOpenChange={setShowComposicao}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                    <Info className="h-3.5 w-3.5" />
                    <span>Composição PEPS ({composicaoFIFO.length} lotes)</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showComposicao && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="rounded-lg border bg-background p-3 mt-2">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Entrada</TableHead>
                        <TableHead className="text-right">Kg Consumidos</TableHead>
                        <TableHead className="text-right">Dias Armaz.</TableHead>
                        <TableHead className="text-right">Dias Cobr.</TableHead>
                        <TableHead className="text-right">Quinzenas</TableHead>
                        <TableHead className="text-right">Armaz. (R$)</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {composicaoFIFO.map((f, i) => (
                          <TableRow key={i}>
                            <TableCell className="tabular-nums">{formatDateBR(f.data_entrada)}</TableCell>
                            <TableCell className="text-right tabular-nums">{Math.round(f.kg_consumidos).toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right tabular-nums">{f.dias_armazenados}</TableCell>
                            <TableCell className="text-right tabular-nums">{f.dias_cobrados > 0 ? f.dias_cobrados : <span className="text-muted-foreground">carência</span>}</TableCell>
                            <TableCell className="text-right tabular-nums">{f.quinzenas}</TableCell>
                            <TableCell className={cn("text-right tabular-nums font-medium", f.valor_armazenamento > 0 ? "text-amber-600" : "text-muted-foreground")}>
                              {f.valor_armazenamento > 0 ? fmtBRL(f.valor_armazenamento) : "R$ 0,00"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handlePreSalvar} disabled={!!saldoExcedido} className={`gap-2 ${editingId ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
            <Save className="h-4 w-4" /> {editingId ? "Atualizar Registro" : "Salvar Saída"}
          </Button>
          {!editingId && (
            <Button variant="outline" onClick={clearForm} className="gap-2">
              <X className="h-4 w-4" /> Limpar Formulário
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog — Safety Check */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Dedução de Estoque
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Atenção: O valor a ser <strong>deduzido do estoque</strong> deste produtor será de{" "}
                  <span className="font-bold text-primary">{Math.round(pesoAjustado).toLocaleString("pt-BR")} Kg</span>{" "}
                  (Peso Ajustado), e <strong>não</strong> o peso físico da balança ({Math.round(kgsNum).toLocaleString("pt-BR")} Kg).
                </p>
                {tipoAjuste !== "neutro" && (
                  <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                    <p className="font-medium">Resumo do Ajuste Comercial:</p>
                    <p>Peso Balança: {Math.round(kgsNum).toLocaleString("pt-BR")} Kg</p>
                    <p>Ajuste ({tipoAjuste === "agio" ? "Ágio +1.5%" : "Deságio −1.3%"}): {" "}
                      <span className={cn(tipoAjuste === "agio" ? "text-emerald-600" : "text-amber-600", "font-semibold")}>
                        {tipoAjuste === "agio" ? "+" : "−"}{Math.round(kgsAjuste).toLocaleString("pt-BR")} Kg
                      </span>
                    </p>
                    <p className="font-bold">Peso Comercial Final: {Math.round(pesoAjustado).toLocaleString("pt-BR")} Kg</p>
                  </div>
                )}
                <p className="text-muted-foreground">Deseja confirmar esta operação?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarSaida}>Confirmar Saída</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Saídas Registradas</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Produtor</TableHead><TableHead>Grão</TableHead>
              <TableHead>Comprador</TableHead><TableHead>Categoria</TableHead>
              <TableHead>Classificação</TableHead><TableHead className="text-right">Umidade (%)</TableHead>
              <TableHead className="text-right">Peso (Kg)</TableHead><TableHead className="text-right">Peso Ajust.</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {saidas.map(s => (
                <TableRow key={s.id} className={editingId === s.id ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                  <TableCell>{formatDateBR(s.data)}</TableCell>
                  <TableCell className="font-mono">{s.placa_caminhao}</TableCell>
                  <TableCell>{s.produtor_nome || "—"}</TableCell>
                  <TableCell>{s.tipo_grao_nome || "—"}</TableCell>
                  <TableCell>{s.comprador_nome}</TableCell>
                  <TableCell><Badge variant="outline">{s.categoria}</Badge></TableCell>
                  <TableCell>{s.classificacao || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.umidade_saida ? `${s.umidade_saida}%` : "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{s.kgs_expedidos.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right tabular-nums text-primary font-semibold">{s.peso_ajustado ? s.peso_ajustado.toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    {(() => {
                      const locked = isRecordLocked(s.created_at) && hasPassword;
                      return (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon"
                            onClick={() => tryLockedAction(s, () => handleEdit(s))}
                            className={locked ? "text-muted-foreground" : "text-amber-600 hover:text-amber-700"}
                            title={locked ? "Bloqueado (>48h)" : "Editar"}
                          >
                            {locked ? <Lock className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon"
                            onClick={() => tryLockedAction(s, () => handleDelete(s.id))}
                            className={locked ? "text-muted-foreground" : "text-destructive hover:text-destructive"}
                            title={locked ? "Bloqueado (>48h)" : "Excluir"}
                          >
                            {locked ? <Lock className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
