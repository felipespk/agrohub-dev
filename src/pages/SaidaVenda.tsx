import { useState } from "react";
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

const categorias = ["Venda", "Transferência", "Devolução", "Outros"];

export default function SaidaVendaPage() {
  const { compradores, produtores, tiposGrao, saidas, addSaida, updateSaida, deleteSaida } = useAppData();
  const [data, setData] = useState(getBrazilDateInputValue());
  const [placa, setPlaca] = useState("");
  const [compradorId, setCompradorId] = useState("");
  const [produtorId, setProdutorId] = useState("");
  const [tipoGraoId, setTipoGraoId] = useState("");
  const [categoria, setCategoria] = useState("Venda");
  const [classificacao, setClassificacao] = useState("");
  const [kgsExpedidos, setKgsExpedidos] = useState("");
  const [umidadeSaida, setUmidadeSaida] = useState("");
  const [taxaPorTonelada, setTaxaPorTonelada] = useState("15");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) =>
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const clearForm = () => {
    setData(getBrazilDateInputValue());
    setPlaca(""); setCompradorId(""); setProdutorId(""); setTipoGraoId("");
    setCategoria("Venda"); setClassificacao(""); setKgsExpedidos(""); setUmidadeSaida("");
    setTaxaPorTonelada("15"); setEditingId(null);
    setErrors({});
  };

  const handleEdit = (s: Saida) => {
    setData(s.data); setPlaca(maskPlaca(s.placa_caminhao)); setCompradorId(s.comprador_id);
    setProdutorId(s.produtor_id || ""); setTipoGraoId(s.tipo_grao_id || "");
    setCategoria(s.categoria); setClassificacao(maskClassificacao(s.classificacao || ""));
    setKgsExpedidos(maskKg(String(s.kgs_expedidos))); setUmidadeSaida(String(s.umidade_saida || ""));
    // Recalculate taxa from saved valor_expedicao
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
    const rawKgs = unmaskKg(kgsExpedidos);
    if (!rawKgs || parseFloat(rawKgs) <= 0) newErrors.kgsExpedidos = "Peso deve ser maior que zero";
    if (!umidadeSaida || parseFloat(umidadeSaida) <= 0) newErrors.umidadeSaida = "Umidade de saída é obrigatória";
    if (!classificacao.trim()) newErrors.classificacao = "Classificação é obrigatória";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }
    setErrors({});

    const kgs = parseFloat(unmaskKg(kgsExpedidos));
    const taxa = parseFloat(taxaPorTonelada.replace(",", ".")) || 15;
    const toneladas = kgs / 1000;
    const valorExpedicao = toneladas * taxa;

    const entry = {
      data, placa_caminhao: placa.replace(/[^A-Z0-9]/g, "").toUpperCase(), comprador_id: compradorId,
      produtor_id: produtorId, tipo_grao_id: tipoGraoId,
      classificacao, kgs_expedidos: kgs, umidade_saida: parseFloat(umidadeSaida), categoria,
      valor_expedicao: valorExpedicao,
    };
    if (editingId) {
      const ok = await updateSaida(editingId, entry);
      if (ok) { toast.success("Saída atualizada!"); clearForm(); }
    } else {
      const row = await addSaida(entry);
      if (row) {
        toast.success(`Saída registrada! ${parseFloat(unmaskKg(kgsExpedidos)).toLocaleString("pt-BR")} Kg expedidos.`);
        // Partial reset: limpa apenas campos transacionais, mantém cabeçalho para lançamentos em lote
        setPlaca("");
        setClassificacao("");
        setKgsExpedidos("");
        setUmidadeSaida("");
        setTaxaPorTonelada("15");
      }
    }
  };

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
            <Input
              placeholder="ABC-1234"
              value={placa}
              onChange={e => { setPlaca(maskPlaca(e.target.value)); clearError("placa"); }}
              className={cn(errors.placa && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.placa && <p className="text-xs text-destructive">{errors.placa}</p>}
          </div>
          <div className="space-y-1">
            <Label>Produtor *</Label>
            <Select value={produtorId} onValueChange={v => { setProdutorId(v); clearError("produtorId"); }}>
              <SelectTrigger className={cn(errors.produtorId && "border-destructive")}><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{produtores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
            </Select>
            {errors.produtorId && <p className="text-xs text-destructive">{errors.produtorId}</p>}
          </div>
          <div className="space-y-1">
            <Label>Tipo de Grão *</Label>
            <Select value={tipoGraoId} onValueChange={v => { setTipoGraoId(v); clearError("tipoGraoId"); }}>
              <SelectTrigger className={cn(errors.tipoGraoId && "border-destructive")}><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{tiposGrao.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
            </Select>
            {errors.tipoGraoId && <p className="text-xs text-destructive">{errors.tipoGraoId}</p>}
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
            <Input
              placeholder="Ex: 71/61"
              value={classificacao}
              onChange={e => { setClassificacao(maskClassificacao(e.target.value)); clearError("classificacao"); }}
              className={cn(errors.classificacao && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.classificacao && <p className="text-xs text-destructive">{errors.classificacao}</p>}
          </div>
          <div className="space-y-1">
            <Label>Peso (Kg) *</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="15.000"
              value={kgsExpedidos}
              onChange={e => { setKgsExpedidos(maskKg(e.target.value)); clearError("kgsExpedidos"); }}
              className={cn(errors.kgsExpedidos && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.kgsExpedidos && <p className="text-xs text-destructive">{errors.kgsExpedidos}</p>}
          </div>
          <div className="space-y-1">
            <Label>Umidade de Saída (%) *</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="12.5"
              value={umidadeSaida}
              onChange={e => { setUmidadeSaida(e.target.value); clearError("umidadeSaida"); }}
              className={cn(errors.umidadeSaida && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.umidadeSaida && <p className="text-xs text-destructive">{errors.umidadeSaida}</p>}
          </div>
          <div className="space-y-1">
            <Label>Taxa por Tonelada (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="15"
              value={taxaPorTonelada}
              onChange={e => setTaxaPorTonelada(e.target.value)}
            />
            {unmaskKg(kgsExpedidos) && parseFloat(unmaskKg(kgsExpedidos)) > 0 && (
              <p className="text-xs text-muted-foreground">
                Valor: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  (parseFloat(unmaskKg(kgsExpedidos)) / 1000) * (parseFloat(taxaPorTonelada.replace(",", ".")) || 15)
                )}
              </p>
            )}
          </div>
        </div>
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
              <TableHead>Classificação</TableHead><TableHead className="text-right">Umidade (%)</TableHead><TableHead className="text-right">Peso (Kg)</TableHead><TableHead className="w-24">Ações</TableHead>
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
