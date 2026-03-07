import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Armazenamento } from "@/types";
import { Warehouse, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const mockArmazenamento: Armazenamento[] = [
  { id: "1", periodo: "Mar/2026 - 1ª Quinzena", toneladasArmazenadas: 50.71, quantidadeSacos: 845, valorUnitario: 3.5, total: 2957.5, status: "pago" },
  { id: "2", periodo: "Mar/2026 - 2ª Quinzena", toneladasArmazenadas: 48.2, quantidadeSacos: 803, valorUnitario: 3.5, total: 2811.0, status: "pendente" },
];

export default function ArmazenamentoPage() {
  const [registros, setRegistros] = useState<Armazenamento[]>(mockArmazenamento);
  const [open, setOpen] = useState(false);
  const [periodo, setPeriodo] = useState("");
  const [toneladas, setToneladas] = useState("");
  const [sacos, setSacos] = useState("");
  const [valorUnit, setValorUnit] = useState("3.50");

  const handleAdd = () => {
    if (!periodo || !toneladas || !sacos) { toast.error("Preencha todos os campos."); return; }
    const ton = parseFloat(toneladas);
    const qtd = parseInt(sacos);
    const vu = parseFloat(valorUnit) || 3.5;
    setRegistros(prev => [{ id: crypto.randomUUID(), periodo, toneladasArmazenadas: ton, quantidadeSacos: qtd, valorUnitario: vu, total: qtd * vu, status: "pendente" }, ...prev]);
    toast.success("Registro de armazenamento adicionado!");
    setPeriodo(""); setToneladas(""); setSacos(""); setOpen(false);
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

      <div className="form-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-foreground">Cobranças de Armazenamento</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Registro</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Cobrança</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Período *</Label><Input value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="Mar/2026 - 1ª Quinzena" /></div>
                <div className="space-y-2"><Label>Toneladas Armazenadas *</Label><Input type="number" value={toneladas} onChange={e => setToneladas(e.target.value)} /></div>
                <div className="space-y-2"><Label>Quantidade de Sacos *</Label><Input type="number" value={sacos} onChange={e => setSacos(e.target.value)} /></div>
                <div className="space-y-2"><Label>Valor Unitário (R$)</Label><Input type="number" step="0.01" value={valorUnit} onChange={e => setValorUnit(e.target.value)} /></div>
                <Button onClick={handleAdd} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.map(r => (
                <TableRow key={r.id}>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
