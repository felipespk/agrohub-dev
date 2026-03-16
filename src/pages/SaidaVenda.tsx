import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAppData, Saida } from "@/contexts/AppContext";
import { ArrowUpFromLine, Save, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { maskPlaca, maskClassificacao, maskKg, unmaskKg } from "@/lib/masks";
import { getBrazilDateInputValue, formatDateBR } from "@/lib/date";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

const categorias = ["Venda", "Transferência", "Devolução", "Outros"];
const CARENCIA_DIAS = 30;

export default function SaidaVendaPage() {
  const { compradores, produtores, tiposGrao, saidas, recebimentos, addSaida, updateSaida, deleteSaida } = useAppData();
  const [data, setData] = useState(getBrazilDateInputValue());
  const [placa, setPlaca] = useState("");
  const [compradorId, setCompradorId] = useState("");
  const [produtorId, setProdutorId] = useState("");
  const [tipoGraoId, setTipoGraoId] = useState("");
  const [recebimentoId, setRecebimentoId] = useState("");
  const [categoria, setCategoria] = useState("Venda");
  const [classificacao, setClassificacao] = useState("");
  const [kgsExpedidos, setKgsExpedidos] = useState("");
  const [umidadeSaida, setUmidadeSaida] = useState("");
  const [umidadeCombinada, setUmidadeCombinada] = useState("12");
  const [taxaPorTonelada, setTaxaPorTonelada] = useState("15");
  const [taxaArmazenamento, setTaxaArmazenamento] = useState("0.15");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) =>
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  // Get selected grain config
  const selectedGrao = tiposGrao.find(t => t.id === tipoGraoId);

  // Filter recebimentos by selected produtor + grão, compute available balance
  const lotesDisponiveis = useMemo(() => {
    if (!produtorId || !tipoGraoId) return [];
    const recFiltered = recebimentos.filter(
      r => r.produtor_id === produtorId && r.tipo_grao_id === tipoGraoId
    );
    return recFiltered.map(r => {
      // Sum peso_ajustado (commercial weight) of all saidas linked to this recebimento
      const totalSaido = saidas
        .filter(s => s.recebimento_id === r.id && s.id !== editingId)
        .reduce((sum, s) => sum + (s.peso_ajustado || s.kgs_expedidos), 0);
      const saldoDisponivel = r.peso_liquido - totalSaido;
      return { ...r, saldoDisponivel };
    }).filter(r => r.saldoDisponivel > 0);
  }, [produtorId, tipoGraoId, recebimentos, saidas, editingId]);

  const selectedLote = lotesDisponiveis.find(l => l.id === recebimentoId);

  // Calculations
  const kgsNum = parseFloat(unmaskKg(kgsExpedidos)) || 0;
  const umidadeReal = parseFloat(umidadeSaida) || 0;
  const umidadeCombNum = parseFloat(umidadeCombinada.replace(",", ".")) || 12;
  const taxaAgio = selectedGrao?.taxa_agio ?? 1.3;
  const taxaDesagio = selectedGrao?.taxa_desagio ?? 1.5;

  const diferenca = umidadeReal - umidadeCombNum;
  let pesoAjustado = kgsNum;
  if (diferenca > 0) {
    pesoAjustado = kgsNum + kgsNum * diferenca * (taxaAgio / 100);
  } else if (diferenca < 0) {
    pesoAjustado = kgsNum - kgsNum * Math.abs(diferenca) * (taxaDesagio / 100);
  }
  pesoAjustado = Math.max(0, pesoAjustado);

  // Storage calculation
  let diasArmazenados = 0;
  let diasCobrados = 0;
  let quinzenasCobradas = 0;
  let valorArmazenamento = 0;
  if (selectedLote && data) {
    diasArmazenados = differenceInDays(parseISO(data), parseISO(selectedLote.data));
    diasCobrados = Math.max(0, diasArmazenados - CARENCIA_DIAS);
    if (diasCobrados > 0) quinzenasCobradas = Math.ceil(diasCobrados / 15);
    const taxaQuinzenal = parseFloat(taxaArmazenamento.replace(",", ".")) || 0.15;
    const sacos = Math.ceil(pesoAjustado / 60);
    valorArmazenamento = quinzenasCobradas * taxaQuinzenal * sacos;
  }

  const taxa = parseFloat(taxaPorTonelada.replace(",", ".")) || 15;
  const valorExpedicao = (pesoAjustado / 1000) * taxa;

  // Auto-fill umidade when grain changes
  const handleGraoChange = (v: string) => {
    setTipoGraoId(v);
    clearError("tipoGraoId");
    const grao = tiposGrao.find(t => t.id === v);
    if (grao) setUmidadeCombinada(String(grao.umidade_padrao));
    setRecebimentoId(""); // reset lote
  };

  const handleProdutorChange = (v: string) => {
    setProdutorId(v);
    clearError("produtorId");
    setRecebimentoId(""); // reset lote
  };

  const clearForm = () => {
    setData(getBrazilDateInputValue());
    setPlaca(""); setCompradorId(""); setProdutorId(""); setTipoGraoId("");
    setRecebimentoId("");
    setCategoria("Venda"); setClassificacao(""); setKgsExpedidos(""); setUmidadeSaida("");
    setUmidadeCombinada("12"); setTaxaPorTonelada("15"); setEditingId(null);
    setErrors({});
  };

  const handleEdit = (s: Saida) => {
    setData(s.data); setPlaca(maskPlaca(s.placa_caminhao)); setCompradorId(s.comprador_id);
    setProdutorId(s.produtor_id || ""); setTipoGraoId(s.tipo_grao_id || "");
    setRecebimentoId(s.recebimento_id || "");
    setCategoria(s.categoria); setClassificacao(maskClassificacao(s.classificacao || ""));
    setKgsExpedidos(maskKg(String(s.kgs_expedidos))); setUmidadeSaida(String(s.umidade_saida || ""));
    setUmidadeCombinada(String(s.umidade_combinada || 12));
    const tons = s.kgs_expedidos / 1000;
    setTaxaPorTonelada(tons > 0 ? String(Math.round((s.valor_expedicao / tons) * 100) / 100) : "15");
    setEditingId(s.id);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteSaida(id);
    if (ok) { toast.success("Saída removida."); if (editingId === id) clearForm(); }
  };

  const handleSalvar = async () => {
    const newErrors: Record<string, string> = {};
    if (!placa.trim()) newErrors.placa = "Placa é obrigatória";
    if (!produtorId) newErrors.produtorId = "Selecione o produtor";
    if (!tipoGraoId) newErrors.tipoGraoId = "Selecione o tipo de grão";
    if (!compradorId) newErrors.compradorId = "Selecione o comprador";
    if (!recebimentoId) newErrors.recebimentoId = "Selecione o lote de origem";
    const rawKgs = unmaskKg(kgsExpedidos);
    if (!rawKgs || parseFloat(rawKgs) <= 0) newErrors.kgsExpedidos = "Peso deve ser maior que zero";
    if (!umidadeSaida || parseFloat(umidadeSaida) <= 0) newErrors.umidadeSaida = "Umidade de saída é obrigatória";
    if (!classificacao.trim()) newErrors.classificacao = "Classificação é obrigatória";

    // Stock validation: compare COMMERCIAL weight (peso_ajustado) against available balance
    if (selectedLote && pesoAjustado > selectedLote.saldoDisponivel) {
      newErrors.kgsExpedidos = `Saldo insuficiente. O peso ajustado comercialmente (${Math.round(pesoAjustado).toLocaleString("pt-BR")} Kg) excede o estoque do produtor (${selectedLote.saldoDisponivel.toLocaleString("pt-BR")} Kg disponíveis).`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }
    setErrors({});

    const entry = {
      data,
      placa_caminhao: placa.replace(/[^A-Z0-9]/g, "").toUpperCase(),
      comprador_id: compradorId,
      produtor_id: produtorId,
      tipo_grao_id: tipoGraoId,
      recebimento_id: recebimentoId,
      classificacao,
      kgs_expedidos: kgsNum,
      umidade_saida: umidadeReal,
      umidade_combinada: umidadeCombNum,
      peso_ajustado: Math.round(pesoAjustado * 100) / 100,
      dias_armazenados: diasArmazenados,
      quinzenas_cobradas: quinzenasCobradas,
      valor_armazenamento_exp: Math.round(valorArmazenamento * 100) / 100,
      categoria,
      valor_expedicao: Math.round(valorExpedicao * 100) / 100,
    };
    if (editingId) {
      const ok = await updateSaida(editingId, entry);
      if (ok) { toast.success("Saída atualizada!"); clearForm(); }
    } else {
      const row = await addSaida(entry);
      if (row) {
        toast.success(`Saída registrada! ${kgsNum.toLocaleString("pt-BR")} Kg expedidos.`);
        setPlaca(""); setClassificacao(""); setKgsExpedidos(""); setUmidadeSaida("");
        setRecebimentoId(""); setTaxaPorTonelada("15");
      }
    }
  };

  const fmtBRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><ArrowUpFromLine className="h-6 w-6 text-primary" /><h1 className="page-title">Saída (Lançamento)</h1></div>
        <p className="page-subtitle">Registre saídas de grãos (vendas, transferências, devoluções)</p>
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
          <div className="space-y-1">
            <Label>Lote de Origem (Entrada) *</Label>
            <Select value={recebimentoId} onValueChange={v => { setRecebimentoId(v); clearError("recebimentoId"); }} disabled={!produtorId || !tipoGraoId}>
              <SelectTrigger className={cn(errors.recebimentoId && "border-destructive")}>
                <SelectValue placeholder={!produtorId || !tipoGraoId ? "Selecione produtor e grão primeiro" : "Selecione o lote..."} />
              </SelectTrigger>
              <SelectContent>
                {lotesDisponiveis.length === 0 ? (
                  <SelectItem value="__none" disabled>Nenhum lote disponível</SelectItem>
                ) : lotesDisponiveis.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {formatDateBR(l.data)} - {l.placa_caminhao} - Saldo: {l.saldoDisponivel.toLocaleString("pt-BR")} Kg
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.recebimentoId && <p className="text-xs text-destructive">{errors.recebimentoId}</p>}
          </div>
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
        </div>

        {/* Preview dos cálculos */}
        {kgsNum > 0 && umidadeReal > 0 && (
          <div className="rounded-lg border bg-muted/50 p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">Peso Ajustado</p>
              <p className="font-semibold text-primary">{Math.round(pesoAjustado).toLocaleString("pt-BR")} Kg</p>
              <p className="text-xs text-muted-foreground">
                {diferenca > 0 ? `Ágio +${diferenca.toFixed(1)}pt (${taxaAgio}%)` : diferenca < 0 ? `Deságio ${diferenca.toFixed(1)}pt (${taxaDesagio}%)` : "Sem ajuste"}
              </p>
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
              <p className="text-muted-foreground">Armazenamento</p>
              <p className="font-semibold text-amber-600">
                {valorArmazenamento > 0 ? fmtBRL(valorArmazenamento) : diasArmazenados > 0 ? `${diasArmazenados} dias (carência)` : "—"}
              </p>
              {quinzenasCobradas > 0 && <p className="text-xs text-muted-foreground">{diasArmazenados} dias · {quinzenasCobradas} quinz.</p>}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSalvar} className={`gap-2 ${editingId ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
            <Save className="h-4 w-4" /> {editingId ? "Atualizar Registro" : "Salvar Saída"}
          </Button>
          {!editingId && (
            <Button variant="outline" onClick={clearForm} className="gap-2">
              <X className="h-4 w-4" /> Limpar Formulário
            </Button>
          )}
        </div>
      </div>

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
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} className="text-amber-600 hover:text-amber-700"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
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
