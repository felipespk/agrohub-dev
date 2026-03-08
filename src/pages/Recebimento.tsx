import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData, Recebimento } from "@/contexts/AppContext";
import { ArrowDownToLine, Calculator, Save, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { maskPlaca } from "@/lib/masks";

export default function RecebimentoPage() {
  const { produtores, tiposGrao, recebimentos, addRecebimento, updateRecebimento, deleteRecebimento } = useAppData();

  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [placa, setPlaca] = useState("");
  const [produtorId, setProdutorId] = useState("");
  const [tipoGraoId, setTipoGraoId] = useState("");
  const [pesoBruto, setPesoBruto] = useState("");
  const [umidadeInicial, setUmidadeInicial] = useState("");
  const [impureza, setImpureza] = useState("");
  const [taxaSecagem, setTaxaSecagem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [umidadeFinalAlvo, setUmidadeFinalAlvo] = useState("");

  const handleTipoGraoChange = (id: string) => {
    setTipoGraoId(id);
    const grao = tiposGrao.find(t => t.id === id);
    if (grao) setUmidadeFinalAlvo(String(grao.umidade_padrao));
  };

  const calculos = useMemo(() => {
    const peso = parseFloat(pesoBruto) || 0;
    const umidade = parseFloat(umidadeInicial) || 0;
    const imp = parseFloat(impureza) || 0;
    const secagem = parseFloat(taxaSecagem) || 0;
    const alvo = parseFloat(umidadeFinalAlvo) || 12;
    const desconto_umidade_percent = umidade > alvo ? (umidade - alvo) * 1.3 : 0;
    const desconto_umidade_kg = peso * (desconto_umidade_percent / 100);
    const desconto_impureza_kg = peso * (imp / 100);
    const desconto_secagem_kg = peso * (secagem / 100);
    const peso_liquido = Math.max(0, peso - desconto_umidade_kg - desconto_impureza_kg - desconto_secagem_kg);
    return { desconto_umidade_percent, desconto_umidade_kg, desconto_impureza_kg, taxa_secagem_percentual: secagem, desconto_secagem_kg, peso_liquido };
  }, [pesoBruto, umidadeInicial, impureza, taxaSecagem, umidadeFinalAlvo]);

  const clearForm = () => {
    setData(new Date().toISOString().split("T")[0]);
    setPlaca(""); setProdutorId(""); setTipoGraoId(""); setPesoBruto(""); setUmidadeInicial(""); setImpureza(""); setTaxaSecagem(""); setUmidadeFinalAlvo("");
    setEditingId(null);
  };

  const handleEdit = (r: Recebimento) => {
    setData(r.data); setPlaca(maskPlaca(r.placa_caminhao)); setProdutorId(r.produtor_id);
    setTipoGraoId(r.tipo_grao_id); setPesoBruto(String(r.peso_bruto));
    setUmidadeInicial(String(r.umidade_inicial)); setImpureza(String(r.impureza));
    setTaxaSecagem(String(r.taxa_secagem_percentual || 0));
    setUmidadeFinalAlvo(String(r.umidade_final_alvo));
    setEditingId(r.id);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteRecebimento(id);
    if (ok) { toast.success("Recebimento removido."); if (editingId === id) clearForm(); }
  };

  const handleSalvar = async () => {
    if (!placa || !produtorId || !tipoGraoId || !pesoBruto || !umidadeInicial) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    const entry = {
      data, placa_caminhao: placa.toUpperCase(),
      produtor_id: produtorId, tipo_grao_id: tipoGraoId,
      peso_bruto: parseFloat(pesoBruto), umidade_inicial: parseFloat(umidadeInicial),
      umidade_final_alvo: parseFloat(umidadeFinalAlvo) || 12, impureza: parseFloat(impureza) || 0,
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
      }
    }
  };

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><ArrowDownToLine className="h-6 w-6 text-primary" /><h1 className="page-title">Recebimento de Arroz</h1></div>
        <p className="page-subtitle">Registre a entrada de grãos com cálculos automáticos de secagem</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 form-section space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-foreground">{editingId ? "Editando Entrada" : "Nova Entrada"}</h2>
            {editingId && <Button variant="outline" size="sm" onClick={clearForm} className="gap-1"><X className="h-4 w-4" /> Cancelar Edição</Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
            <div className="space-y-2"><Label>Placa do Caminhão *</Label><Input placeholder="ABC-1234" value={placa} onChange={e => setPlaca(e.target.value)} className="uppercase" /></div>
            <div className="space-y-2">
              <Label>Produtor *</Label>
              <Select value={produtorId} onValueChange={setProdutorId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{produtores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Grão *</Label>
              <Select value={tipoGraoId} onValueChange={handleTipoGraoChange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{tiposGrao.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Peso Bruto (Kg) *</Label><Input type="number" placeholder="30000" value={pesoBruto} onChange={e => setPesoBruto(e.target.value)} /></div>
            <div className="space-y-2"><Label>Umidade Inicial (%) *</Label><Input type="number" step="0.1" placeholder="18" value={umidadeInicial} onChange={e => setUmidadeInicial(e.target.value)} /></div>
            <div className="space-y-2"><Label>Impureza (%)</Label><Input type="number" step="0.1" placeholder="2" value={impureza} onChange={e => setImpureza(e.target.value)} /></div>
            <div className="space-y-2"><Label>Taxa de Secagem (%)</Label><Input type="number" step="0.1" placeholder="8.5" value={taxaSecagem} onChange={e => setTaxaSecagem(e.target.value)} /></div>
            <div className="space-y-2"><Label>Umidade Final Alvo (%)</Label><Input type="number" step="0.1" placeholder="12" value={umidadeFinalAlvo} onChange={e => setUmidadeFinalAlvo(e.target.value)} /></div>
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
            <ResultCard label="Desconto de Umidade" value={`${fmt(calculos.desconto_umidade_percent)}%`} />
            <ResultCard label="Kg Descontados (Umidade)" value={`${fmt(calculos.desconto_umidade_kg)} Kg`} />
            <ResultCard label="Kg Descontados (Impureza)" value={`${fmt(calculos.desconto_impureza_kg)} Kg`} />
            <ResultCard label="Desconto de Secagem" value={`${fmt(calculos.desconto_secagem_kg)} Kg`} />
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
              <TableHead className="text-right">Peso Bruto</TableHead><TableHead className="text-right">Umidade</TableHead>
              <TableHead className="text-right">Desc. Umid.</TableHead><TableHead className="text-right">Desc. Secagem</TableHead><TableHead className="text-right">Peso Líquido</TableHead><TableHead className="w-24">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recebimentos.map(r => (
                <TableRow key={r.id} className={editingId === r.id ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                  <TableCell>{new Date(r.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono">{r.placa_caminhao}</TableCell>
                  <TableCell>{r.produtor_nome}</TableCell>
                  <TableCell>{r.tipo_grao_nome}</TableCell>
                  <TableCell className="text-right">{r.peso_bruto.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{r.umidade_inicial}%</TableCell>
                  <TableCell className="text-right">{fmt(r.desconto_umidade_percent)}%</TableCell>
                  <TableCell className="text-right">{fmt(r.desconto_secagem_kg || 0)} Kg</TableCell>
                  <TableCell className="text-right font-semibold">{r.peso_liquido.toLocaleString("pt-BR")}</TableCell>
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

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
