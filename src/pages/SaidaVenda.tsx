import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/contexts/AppContext";
import { CategoriaSaida, Saida } from "@/types";
import { ArrowUpFromLine, Save, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const categorias: CategoriaSaida[] = ["Venda", "Transferência", "Devolução", "Outros"];

export default function SaidaVendaPage() {
  const { compradores, saidas, setSaidas } = useAppData();
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [placa, setPlaca] = useState("");
  const [compradorId, setCompradorId] = useState("");
  const [categoria, setCategoria] = useState<CategoriaSaida>("Venda");
  const [classificacao, setClassificacao] = useState("");
  const [kgsExpedidos, setKgsExpedidos] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const clearForm = () => {
    setData(new Date().toISOString().split("T")[0]);
    setPlaca(""); setCompradorId(""); setCategoria("Venda"); setClassificacao(""); setKgsExpedidos("");
    setEditingId(null);
  };

  const handleEdit = (s: Saida) => {
    setData(s.data); setPlaca(s.placaCaminhao); setCompradorId(s.compradorId);
    setCategoria(s.categoria); setClassificacao(s.classificacao); setKgsExpedidos(String(s.kgsExpedidos));
    setEditingId(s.id);
  };

  const handleDelete = (id: string) => {
    setSaidas(prev => prev.filter(s => s.id !== id));
    toast.success("Saída removida.");
    if (editingId === id) clearForm();
  };

  const handleSalvar = () => {
    if (!placa || !compradorId || !kgsExpedidos) {
      toast.error("Preencha Placa, Comprador e Kgs Expedidos.");
      return;
    }
    const comprador = compradores.find(c => c.id === compradorId);
    const entry = {
      data, placaCaminhao: placa.toUpperCase(),
      compradorId, compradorNome: comprador?.nome || "", classificacao,
      kgsExpedidos: parseFloat(kgsExpedidos), categoria,
    };

    if (editingId) {
      setSaidas(prev => prev.map(s => s.id === editingId ? { ...s, ...entry } : s));
      toast.success("Saída atualizada!");
    } else {
      const nova: Saida = { id: crypto.randomUUID(), ...entry, createdAt: new Date().toISOString() };
      setSaidas(prev => [nova, ...prev]);
      toast.success(`Saída registrada! ${parseFloat(kgsExpedidos).toLocaleString("pt-BR")} Kg expedidos.`);
    }
    clearForm();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="h-6 w-6 text-primary" />
          <h1 className="page-title">Saída (Lançamento)</h1>
        </div>
        <p className="page-subtitle">Registre saídas de grãos (vendas, transferências, devoluções)</p>
      </div>

      <div className="form-section space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-foreground">
            {editingId ? "Editando Saída" : "Nova Saída"}
          </h2>
          {editingId && (
            <Button variant="outline" size="sm" onClick={clearForm} className="gap-1">
              <X className="h-4 w-4" /> Cancelar Edição
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Placa do Caminhão *</Label>
            <Input placeholder="ABC-1234" value={placa} onChange={e => setPlaca(e.target.value)} className="uppercase" />
          </div>
          <div className="space-y-2">
            <Label>Comprador *</Label>
            <Select value={compradorId} onValueChange={setCompradorId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {[...compradores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoria da Saída *</Label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaSaida)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categorias.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Classificação do Grão</Label>
            <Input placeholder="Ex: 71/61" value={classificacao} onChange={e => setClassificacao(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Kgs Expedidos *</Label>
            <Input type="number" placeholder="15000" value={kgsExpedidos} onChange={e => setKgsExpedidos(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSalvar} className={`gap-2 ${editingId ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
          <Save className="h-4 w-4" /> {editingId ? "Atualizar Registro" : "Salvar Saída"}
        </Button>
      </div>

      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Saídas Registradas</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead className="text-right">Kgs Expedidos</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saidas.map(s => (
                <TableRow key={s.id} className={editingId === s.id ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                  <TableCell>{new Date(s.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono">{s.placaCaminhao}</TableCell>
                  <TableCell>{s.compradorNome}</TableCell>
                  <TableCell><Badge variant="outline">{s.categoria}</Badge></TableCell>
                  <TableCell>{s.classificacao}</TableCell>
                  <TableCell className="text-right font-semibold">{s.kgsExpedidos.toLocaleString("pt-BR")}</TableCell>
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
