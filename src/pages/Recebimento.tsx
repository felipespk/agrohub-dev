import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData, Recebimento } from "@/contexts/AppContext";
import { ArrowDownToLine, Calculator, Save, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { maskPlaca, maskKg, unmaskKg } from "@/lib/masks";
import { getBrazilDateInputValue, formatDateBR } from "@/lib/date";
import { cn } from "@/lib/utils";

export default function RecebimentoPage() {
  const { produtores, tiposGrao, recebimentos, addRecebimento, updateRecebimento, deleteRecebimento } = useAppData();

  const placaRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState(getBrazilDateInputValue());
  const [placa, setPlaca] = useState("");
  const [produtorId, setProdutorId] = useState(() => localStorage.getItem("receb_produtorId") || "");
  const [tipoGraoId, setTipoGraoId] = useState(() => localStorage.getItem("receb_tipoGraoId") || "");
  const [pesoBruto, setPesoBruto] = useState("");
  const [umidadeInicial, setUmidadeInicial] = useState("");
  const [impureza, setImpureza] = useState("");
  const [taxaSecagem, setTaxaSecagem] = useState(() => localStorage.getItem("receb_taxaSecagem") || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [umidadeFinalAlvo, setUmidadeFinalAlvo] = useState(() => localStorage.getItem("receb_umidadeFinalAlvo") || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Persist sticky fields to localStorage
  useEffect(() => { localStorage.setItem("receb_produtorId", produtorId); }, [produtorId]);
  useEffect(() => { localStorage.setItem("receb_tipoGraoId", tipoGraoId); }, [tipoGraoId]);
  useEffect(() => { localStorage.setItem("receb_taxaSecagem", taxaSecagem); }, [taxaSecagem]);
  useEffect(() => { localStorage.setItem("receb_umidadeFinalAlvo", umidadeFinalAlvo); }, [umidadeFinalAlvo]);

  const clearError = (field: string) =>
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const handleTipoGraoChange = (id: string) => {
    setTipoGraoId(id);
    clearError("tipoGraoId");
    const grao = tiposGrao.find(t => t.id === id);
    if (grao) setUmidadeFinalAlvo(String(grao.umidade_padrao));
  };

  const calculos = useMemo(() => {
    const peso = parseFloat(unmaskKg(pesoBruto)) || 0;
    const umIni = parseFloat(umidadeInicial) || 0;
    const umAlvo = parseFloat(umidadeFinalAlvo) || 12;
    const imp = parseFloat(impureza) || 0;
    const secagem = parseFloat(taxaSecagem) || 0;

    // Fase 1: Descontos sobre o Bruto
    const desconto_umidade_percent = umIni > umAlvo ? (umIni - umAlvo) * 1.3 : 0;
    const desconto_umidade_kg = peso * (desconto_umidade_percent / 100);
    const desconto_impureza_kg = peso * (imp / 100);

    // Fase 2: Subtotal Grão Seco (base para secagem)
    const peso_grao_seco = Math.max(0, peso - desconto_impureza_kg - desconto_umidade_kg);

    // Fase 3: Taxa do Secador sobre o Grão Seco (CASCATA)
    const desconto_secagem_kg = peso_grao_seco * (secagem / 100);

    // Fase 4: Peso Líquido Final
    const peso_liquido = Math.max(0, peso_grao_seco - desconto_secagem_kg);

    return {
      desconto_umidade_percent,
      desconto_umidade_kg,
      desconto_impureza_kg,
      peso_grao_seco,
      taxa_secagem_percentual: secagem,
      desconto_secagem_kg,
      peso_liquido,
    };
  }, [pesoBruto, umidadeInicial, umidadeFinalAlvo, impureza, taxaSecagem]);

  const clearForm = () => {
    setData(getBrazilDateInputValue());
    setPlaca(""); setProdutorId(""); setTipoGraoId(""); setPesoBruto(""); setUmidadeInicial("");
    setImpureza(""); setTaxaSecagem(""); setUmidadeFinalAlvo("");
    setEditingId(null);
    setErrors({});
    localStorage.removeItem("receb_produtorId");
    localStorage.removeItem("receb_tipoGraoId");
    localStorage.removeItem("receb_taxaSecagem");
    localStorage.removeItem("receb_umidadeFinalAlvo");
  };

  const handleEdit = (r: Recebimento) => {
    setData(r.data); setPlaca(maskPlaca(r.placa_caminhao)); setProdutorId(r.produtor_id);
    setTipoGraoId(r.tipo_grao_id); setPesoBruto(maskKg(String(r.peso_bruto)));
    setUmidadeInicial(String(r.umidade_inicial)); setImpureza(String(r.impureza));
    setTaxaSecagem(String(r.taxa_secagem_percentual || 0));
    setUmidadeFinalAlvo(String(r.umidade_final_alvo));
    setEditingId(r.id);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteRecebimento(id);
    if (ok) { toast.success("Recebimento removido."); if (editingId === id) clearForm(); }
  };

  const handleSalvar = async () => {
    const newErrors: Record<string, string> = {};
    if (!placa.trim()) newErrors.placa = "Placa é obrigatória";
    if (!produtorId) newErrors.produtorId = "Selecione o produtor";
    if (!tipoGraoId) newErrors.tipoGraoId = "Selecione o tipo de grão";
    if (!unmaskKg(pesoBruto) || parseFloat(unmaskKg(pesoBruto)) <= 0) newErrors.pesoBruto = "Peso bruto deve ser maior que zero";
    if (!umidadeInicial || parseFloat(umidadeInicial) <= 0) newErrors.umidadeInicial = "Umidade inicial é obrigatória";
    if (!umidadeFinalAlvo || parseFloat(umidadeFinalAlvo) <= 0) newErrors.umidadeFinalAlvo = "Umidade alvo é obrigatória";
    if (impureza === "") newErrors.impureza = "Informe a impureza (0 se não houver)";
    if (taxaSecagem === "") newErrors.taxaSecagem = "Informe a taxa de secagem (0 se não houver)";
    if (!valorArmazenamento || parseFloat(valorArmazenamento) < 0) newErrors.valorArmazenamento = "Valor de armazenamento é obrigatório";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }
    setErrors({});

    const entry = {
      data, placa_caminhao: placa.replace(/[^A-Z0-9]/g, "").toUpperCase(),
      produtor_id: produtorId, tipo_grao_id: tipoGraoId,
      peso_bruto: parseFloat(unmaskKg(pesoBruto)), umidade_inicial: parseFloat(umidadeInicial),
      umidade_final_alvo: parseFloat(umidadeFinalAlvo) || 12, impureza: parseFloat(impureza) || 0,
      valor_armazenamento: parseFloat(valorArmazenamento) || 0.15,
      ...calculos,
    };
    if (editingId) {
      const ok = await updateRecebimento(editingId, entry);
      if (ok) { toast.success("Recebimento atualizado!"); clearForm(); }
    } else {
      const row = await addRecebimento(entry);
      if (row) {
        toast.success(`Entrada salva! Peso líquido: ${calculos.peso_liquido.toFixed(0)} Kg`);
        setPlaca("");
        setPesoBruto("");
        setUmidadeInicial("");
        setImpureza("");
        setErrors({});
        setTimeout(() => placaRef.current?.focus(), 100);
      }
    }
  };

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><ArrowDownToLine className="h-6 w-6 text-primary" /><h1 className="page-title">Recebimento de Grãos</h1></div>
        <p className="page-subtitle">Registre a entrada de grãos com cálculos automáticos de secagem</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 form-section space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-foreground">{editingId ? "Editando Entrada" : "Nova Entrada"}</h2>
            {editingId && <Button variant="outline" size="sm" onClick={clearForm} className="gap-1"><X className="h-4 w-4" /> Cancelar Edição</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Placa do Caminhão *</Label>
              <Input
                ref={placaRef}
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
              <Select value={tipoGraoId} onValueChange={handleTipoGraoChange}>
                <SelectTrigger className={cn(errors.tipoGraoId && "border-destructive")}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{tiposGrao.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
              {errors.tipoGraoId && <p className="text-xs text-destructive">{errors.tipoGraoId}</p>}
            </div>
            <div className="space-y-1">
              <Label>Peso Bruto (Kg) *</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="30.000"
                value={pesoBruto}
                onChange={e => { setPesoBruto(maskKg(e.target.value)); clearError("pesoBruto"); }}
                className={cn(errors.pesoBruto && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.pesoBruto && <p className="text-xs text-destructive">{errors.pesoBruto}</p>}
            </div>
            <div className="space-y-1">
              <Label>Umidade Inicial (%) *</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="18"
                value={umidadeInicial}
                onChange={e => { setUmidadeInicial(e.target.value); clearError("umidadeInicial"); }}
                className={cn(errors.umidadeInicial && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.umidadeInicial && <p className="text-xs text-destructive">{errors.umidadeInicial}</p>}
            </div>
            <div className="space-y-1">
              <Label>Impureza (%) *</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="2"
                value={impureza}
                onChange={e => { setImpureza(e.target.value); clearError("impureza"); }}
                className={cn(errors.impureza && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.impureza && <p className="text-xs text-destructive">{errors.impureza}</p>}
            </div>
            <div className="space-y-1">
              <Label>Taxa de Secagem (%) *</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="8.5"
                value={taxaSecagem}
                onChange={e => { setTaxaSecagem(e.target.value); clearError("taxaSecagem"); }}
                className={cn(errors.taxaSecagem && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.taxaSecagem && <p className="text-xs text-destructive">{errors.taxaSecagem}</p>}
            </div>
            <div className="space-y-1">
              <Label>Umidade Final Alvo (%) *</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="12"
                value={umidadeFinalAlvo}
                onChange={e => { setUmidadeFinalAlvo(e.target.value); clearError("umidadeFinalAlvo"); }}
                className={cn(errors.umidadeFinalAlvo && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.umidadeFinalAlvo && <p className="text-xs text-destructive">{errors.umidadeFinalAlvo}</p>}
            </div>
            <div className="space-y-1">
              <Label>Valor Armazenamento (R$/Saca) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.15"
                value={valorArmazenamento}
                onChange={e => { setValorArmazenamento(e.target.value); clearError("valorArmazenamento"); }}
                className={cn(errors.valorArmazenamento && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.valorArmazenamento && <p className="text-xs text-destructive">{errors.valorArmazenamento}</p>}
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleSalvar} className={`gap-2 ${editingId ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
              <Save className="h-4 w-4" /> {editingId ? "Atualizar Registro" : "Salvar Entrada"}
            </Button>
            {!editingId && (
              <Button variant="outline" onClick={clearForm} className="gap-2">
                <X className="h-4 w-4" /> Limpar Formulário
              </Button>
            )}
          </div>
        </div>

        <div className="results-section space-y-4">
          <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><h2 className="font-display font-semibold text-lg text-foreground">Resultados</h2></div>
          <p className="text-xs text-muted-foreground">Cálculos em tempo real</p>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fase 1 — Descontos sobre o Bruto</p>
            <ResultCard
              label={`Desc. Umidade (${fmt(calculos.desconto_umidade_percent)}%)`}
              value={`${fmt(calculos.desconto_umidade_kg)} Kg`}
              variant={calculos.desconto_umidade_kg > 0 ? "discount" : undefined}
            />
            <ResultCard label="Desc. Impureza" value={`${fmt(calculos.desconto_impureza_kg)} Kg`} />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Fase 2 — Subtotal Grão Seco</p>
            <div className="rounded-lg bg-accent/50 border border-accent p-4">
              <p className="text-xs text-muted-foreground">Subtotal Grão Seco</p>
              <p className="text-xl font-display font-bold text-foreground">{fmt(calculos.peso_grao_seco)} Kg</p>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Fase 3 — Taxa Secador (sobre Grão Seco)</p>
            <ResultCard label="Desc. Secagem" value={`${fmt(calculos.desconto_secagem_kg)} Kg`} variant={calculos.desconto_secagem_kg > 0 ? "discount" : undefined} />

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Fase 4 — Peso Líquido Final</p>
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
              <p className="text-xs text-muted-foreground">Peso Líquido Final</p>
              <p className="text-2xl font-display font-bold text-primary">{fmt(calculos.peso_liquido)} Kg</p>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Últimos Recebimentos</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Produtor</TableHead><TableHead>Grão</TableHead>
              <TableHead className="text-right">Peso Bruto</TableHead><TableHead className="text-right">Umidade (%)</TableHead>
              <TableHead className="text-right">Desc. Umidade</TableHead><TableHead className="text-right">Desc. Impureza</TableHead><TableHead className="text-right">Desc. Secagem</TableHead><TableHead className="text-right">Peso Líquido</TableHead><TableHead className="w-24">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recebimentos.map(r => (
                <TableRow key={r.id} className={editingId === r.id ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                  <TableCell>{formatDateBR(r.data)}</TableCell>
                  <TableCell className="font-mono">{r.placa_caminhao}</TableCell>
                  <TableCell>{r.produtor_nome}</TableCell>
                  <TableCell>{r.tipo_grao_nome}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.peso_bruto.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.umidade_inicial}%</TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">{fmt(r.desconto_umidade_kg || 0)} Kg</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(r.desconto_impureza_kg || 0)} Kg</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(r.desconto_secagem_kg || 0)} Kg</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{r.peso_liquido.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="text-amber-600 hover:text-amber-700"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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

function ResultCard({ label, value, variant }: { label: string; value: string; variant?: "bonus" | "discount" | "neutral" }) {
  return (
    <div className={cn(
      "rounded-lg border p-3",
      variant === "bonus" && "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
      variant === "discount" && "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
      !variant && "bg-card",
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "text-lg font-semibold",
        variant === "bonus" ? "text-emerald-600 dark:text-emerald-400" : variant === "discount" ? "text-amber-600 dark:text-amber-400" : "text-foreground",
      )}>{value}</p>
    </div>
  );
}
