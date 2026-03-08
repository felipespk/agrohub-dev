import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Armazenamento } from "@/types";
import { Warehouse, Save, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const mockArmazenamento: Armazenamento[] = [
  { id: "1", periodo: "Mar/2026 - 1ª Quinzena", toneladasArmazenadas: 50.71, quantidadeSacos: 845, valorUnitario: 3.5, total: 2957.5, status: "pago" },
  { id: "2", periodo: "Mar/2026 - 2ª Quinzena", toneladasArmazenadas: 48.2, quantidadeSacos: 803, valorUnitario: 3.5, total: 2811.0, status: "pendente" },
];

export default function ArmazenamentoPage() {
  const [registros, setRegistros] = useState<Armazenamento[]>(mockArmazenamento);
  const [periodo, setPeriodo] = useState("");
  const [toneladas, setToneladas] = useState("");
  const [sacos, setSacos] = useState("");
  const [valorUnit, setValorUnit] = useState("3.50");
  const [editingId, setEditingId] = useState<string | null>(null);

  const clearForm = () => {
    setPeriodo(""); setToneladas(""); setSacos(""); setValorUnit("3.50");
    setEditingId(null);
  };

  const handleSalvar = () => {
    if (!periodo || !toneladas || !sacos) { toast.error("Preencha todos os campos."); return; }
    const ton = parseFloat(toneladas);
    const qtd = parseInt(sacos);
    const vu = parseFloat(valorUnit) || 3.5;
    const total = qtd * vu;

    if (editingId) {
      setRegistros(prev => prev.map(r => r.id === editingId ? { ...r, periodo, toneladasArmazenadas: ton, quantidadeSacos: qtd, valorUnitario: vu, total } : r));
      toast.success("Lançamento atualizado!");
      setEditingId(null);
    } else {
      setRegistros(prev => [{ id: crypto.randomUUID(), periodo, toneladasArmazenadas: ton, quantidadeSacos: qtd, valorUnitario: vu, total, status: "pendente" }, ...prev]);
      toast.success("Registro de armazenamento adicionado!");
    }
  };

  const handleEdit = (r: Armazenamento) => {
    setPeriodo(r.periodo);
    setToneladas(String(r.toneladasArmazenadas));
    setSacos(String(r.quantidadeSacos));
    setValorUnit(String(r.valorUnitario));
    setEditingId(r.id);
  };

  const handleDelete = (id: string) => {
    setRegistros(prev => prev.filter(r => r.id !== id));
    toast.success("Registro removido.");
    if (editingId === id) clearForm();
  };

  const toggleStatus = (id: string) => {
    setRegistros(prev => prev.map(r => r.id === id ? { ...r, status: r.status === "pago" ? "pendente" : "pago" } : r));
  };

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-primary" />
          <h1 className="page-title">Armazenamento</h1>
        </div>
        <p className="page-subtitle">Faturamento quinzenal/mensal de armazenamento</p>
      </div>

      <div className="form-section space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-foreground">{editingId ? "Editando Lançamento" : "Novo Lançamento"}</h2>
          {editingId && <Button variant="outline" size="sm" onClick={clearForm} className="gap-1"><X className="h-4 w-4" /> Cancelar Edição</Button>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2"><Label>Período *</Label><Input value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="Mar/2026 - 1ª Quinzena" /></div>
          <div className="space-y-2"><Label>Toneladas Armazenadas *</Label><Input type="number" value={toneladas} onChange={e => setToneladas(e.target.value)} placeholder="50" /></div>
          <div className="space-y-2"><Label>Quantidade de Sacos *</Label><Input type="number" value={sacos} onChange={e => setSacos(e.target.value)} placeholder="845" /></div>
          <div className="space-y-2"><Label>Valor Unitário (R$)</Label><Input type="number" step="0.01" value={valorUnit} onChange={e => setValorUnit(e.target.value)} /></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSalvar} className={`gap-2 ${editingId ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
            <Save className="h-4 w-4" /> {editingId ? "Atualizar Lançamento" : "Salvar Lançamento"}
          </Button>
          {!editingId && (
            <Button variant="outline" onClick={clearForm} className="gap-2">
              <X className="h-4 w-4" /> Limpar Formulário
            </Button>
          )}
        </div>
      </div>

      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Cobranças de Armazenamento</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Toneladas</TableHead>
                <TableHead className="text-right">Sacos</TableHead>
                <TableHead className="text-right">Valor Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.map(r => (
                <TableRow key={r.id} className={editingId === r.id ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                  <TableCell className="font-medium">{r.periodo}</TableCell>
                  <TableCell className="text-right">{r.toneladasArmazenadas.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{r.quantidadeSacos.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{fmt(r.valorUnitario)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(r.total)}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={r.status === "pago" ? "default" : "destructive"}
                      className="cursor-pointer"
                      onClick={() => toggleStatus(r.id)}
                    >
                      {r.status === "pago" ? "Pago" : "Pendente"}
                    </Badge>
                  </TableCell>
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
