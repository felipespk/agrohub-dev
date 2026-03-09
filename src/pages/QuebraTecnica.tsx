import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppContext";
import { AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getBrazilDateInputValue } from "@/lib/date";
import { cn } from "@/lib/utils";

export default function QuebraTecnicaPage() {
  const { quebras, addQuebra, deleteQuebra } = useAppData();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(getBrazilDateInputValue());
  const [kgAjuste, setKgAjuste] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) =>
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const handleAdd = async () => {
    const newErrors: Record<string, string> = {};
    if (!kgAjuste || kgAjuste === "0") newErrors.kgAjuste = "Informe o Kg de ajuste (diferente de zero)";
    if (!justificativa.trim()) newErrors.justificativa = "Justificativa é obrigatória";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }
    setErrors({});

    const row = await addQuebra({ data, kg_ajuste: parseFloat(kgAjuste), justificativa: justificativa.trim() });
    if (row) {
      toast.success("Quebra técnica registrada.");
      setKgAjuste(""); setJustificativa(""); setOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteQuebra(id);
    if (ok) toast.success("Quebra removida.");
  };

  const totalQuebra = quebras.reduce((s, q) => s + q.kg_ajuste, 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-accent" /><h1 className="page-title">Quebra Técnica</h1></div>
        <p className="page-subtitle">Registro de ajustes e perdas do secador</p>
      </div>
      <div className="kpi-card max-w-xs">
        <p className="text-xs text-muted-foreground">Total de Quebras Registradas</p>
        <p className="text-2xl font-display font-bold text-destructive">{totalQuebra.toLocaleString("pt-BR")} Kg</p>
      </div>
      <div className="form-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-foreground">Registros de Quebra</h2>
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setErrors({}); setKgAjuste(""); setJustificativa(""); } }}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Ajuste</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Quebra Técnica</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Data</Label>
                  <Input type="date" value={data} onChange={e => setData(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Kg de Ajuste * <span className="text-xs text-muted-foreground">(negativo = perda)</span></Label>
                  <Input
                    type="number"
                    value={kgAjuste}
                    onChange={e => { setKgAjuste(e.target.value); clearError("kgAjuste"); }}
                    placeholder="-150"
                    className={cn(errors.kgAjuste && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.kgAjuste && <p className="text-xs text-destructive">{errors.kgAjuste}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Justificativa *</Label>
                  <Textarea
                    value={justificativa}
                    onChange={e => { setJustificativa(e.target.value); clearError("justificativa"); }}
                    placeholder="Descreva o motivo do ajuste..."
                    className={cn(errors.justificativa && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.justificativa && <p className="text-xs text-destructive">{errors.justificativa}</p>}
                </div>
                <Button onClick={handleAdd} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead className="text-right">Kg Ajuste</TableHead><TableHead>Justificativa</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {quebras.map(q => (
                <TableRow key={q.id}>
                  <TableCell>{formatDateBR(q.data)}</TableCell>
                  <TableCell className={`text-right font-semibold ${q.kg_ajuste < 0 ? "text-destructive" : "text-primary"}`}>{q.kg_ajuste > 0 ? "+" : ""}{q.kg_ajuste.toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{q.justificativa}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="text-destructive hover:text-destructive"><AlertTriangle className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
