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
import { maskPlaca, maskClassificacao } from "@/lib/masks";
import { getBrazilDateInputValue } from "@/lib/date";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) =>
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const clearForm = () => {
    setData(getBrazilDateInputValue());
    setPlaca(""); setCompradorId(""); setProdutorId(""); setTipoGraoId("");
    setCategoria("Venda"); setClassificacao(""); setKgsExpedidos("");
    setEditingId(null);
    setErrors({});
  };

  const handleEdit = (s: Saida) => {
    setData(s.data); setPlaca(maskPlaca(s.placa_caminhao)); setCompradorId(s.comprador_id);
    setProdutorId(s.produtor_id || ""); setTipoGraoId(s.tipo_grao_id || "");
    setCategoria(s.categoria); setClassificacao(maskClassificacao(s.classificacao || "")); setKgsExpedidos(String(s.kgs_expedidos));
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
    if (!kgsExpedidos || parseFloat(kgsExpedidos) <= 0) newErrors.kgsExpedidos = "Kgs expedidos deve ser maior que zero";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }
    setErrors({});

    const entry = {
      data, placa_caminhao: placa.replace(/[^A-Z0-9]/g, "").toUpperCase(), comprador_id: compradorId,
      produtor_id: produtorId, tipo_grao_id: tipoGraoId,
      classificacao, kgs_expedidos: parseFloat(kgsExpedidos), categoria,
    };
    if (editingId) {
      const ok = await updateSaida(editingId, entry);
      if (ok) { toast.success("Saída atualizada!"); clearForm(); }
    } else {
      const row = await addSaida(entry);
      if (row) toast.success(`Saída registrada! ${parseFloat(kgsExpedidos).toLocaleString("pt-BR")} Kg expedidos.`);
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
            <Label>Classificação</Label>
            <Input placeholder="Ex: 71/61" value={classificacao} onChange={e => setClassificacao(maskClassificacao(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Kgs Expedidos *</Label>
            <Input
              type="number"
              placeholder="15000"
              value={kgsExpedidos}
              onChange={e => { setKgsExpedidos(e.target.value); clearError("kgsExpedidos"); }}
              className={cn(errors.kgsExpedidos && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.kgsExpedidos && <p className="text-xs text-destructive">{errors.kgsExpedidos}</p>}
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
              <TableHead>Classificação</TableHead><TableHead className="text-right">Kgs</TableHead><TableHead className="w-24">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {saidas.map(s => (
                <TableRow key={s.id} className={editingId === s.id ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                  <TableCell>{new Date(s.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono">{s.placa_caminhao}</TableCell>
                  <TableCell>{s.produtor_nome || "—"}</TableCell>
                  <TableCell>{s.tipo_grao_nome || "—"}</TableCell>
                  <TableCell>{s.comprador_nome}</TableCell>
                  <TableCell><Badge variant="outline">{s.categoria}</Badge></TableCell>
                  <TableCell>{s.classificacao}</TableCell>
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
