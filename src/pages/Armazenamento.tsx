import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/contexts/AppContext";
import { Warehouse, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FaturaArmazenamento {
  id: string;
  periodo: string;
  geradoEm: string;
  itens: { produtorNome: string; saldoKg: number; sacos: number; valorSaca: number; total: number }[];
  totalGeral: number;
  status: "pendente" | "pago";
}

const STORAGE_KEY = "faturas_armazenamento";

function loadFaturas(): FaturaArmazenamento[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveFaturas(f: FaturaArmazenamento[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
}

export default function ArmazenamentoPage() {
  const { recebimentos, saidas } = useAppData();
  const [faturas, setFaturas] = useState<FaturaArmazenamento[]>(loadFaturas);
  const [periodo, setPeriodo] = useState("");

  // Per-produtor: saldo + valor armazenamento from most recent recebimento
  const saldoProdutores = useMemo(() => {
    const map = new Map<string, { produtorNome: string; saldoKg: number; valorSaca: number; lastDate: string }>();

    for (const r of recebimentos) {
      const existing = map.get(r.produtor_id) || { produtorNome: r.produtor_nome || "", saldoKg: 0, valorSaca: 0.15, lastDate: "" };
      existing.saldoKg += r.peso_liquido;
      // Use the most recent recebimento's valor_armazenamento
      if (r.data > existing.lastDate || r.created_at > existing.lastDate) {
        existing.valorSaca = r.valor_armazenamento ?? 0.15;
        existing.lastDate = r.data;
      }
      map.set(r.produtor_id, existing);
    }

    for (const s of saidas) {
      if (!s.produtor_id) continue;
      const existing = map.get(s.produtor_id);
      if (existing) existing.saldoKg -= s.kgs_expedidos;
    }

    return Array.from(map.entries())
      .map(([id, val]) => ({ produtorId: id, produtorNome: val.produtorNome, saldoKg: val.saldoKg, valorSaca: val.valorSaca }))
      .filter(p => p.saldoKg > 0)
      .sort((a, b) => a.produtorNome.localeCompare(b.produtorNome, "pt-BR"));
  }, [recebimentos, saidas]);

  const previewItens = useMemo(() => {
    return saldoProdutores.map(p => {
      const sacos = Math.ceil(p.saldoKg / 60);
      return { produtorNome: p.produtorNome, saldoKg: p.saldoKg, sacos, valorSaca: p.valorSaca, total: sacos * p.valorSaca };
    });
  }, [saldoProdutores]);

  const totalGeral = previewItens.reduce((sum, i) => sum + i.total, 0);

  const handleGerarFatura = () => {
    if (!periodo) { toast.error("Informe o período da fatura."); return; }
    if (previewItens.length === 0) { toast.error("Nenhum produtor com saldo positivo."); return; }
    const novaFatura: FaturaArmazenamento = {
      id: crypto.randomUUID(),
      periodo,
      geradoEm: new Date().toISOString(),
      itens: previewItens,
      totalGeral,
      status: "pendente",
    };
    const updated = [novaFatura, ...faturas];
    setFaturas(updated);
    saveFaturas(updated);
    toast.success(`Fatura "${periodo}" gerada com sucesso!`);
  };

  const toggleStatus = (id: string) => {
    const updated = faturas.map(f => f.id === id ? { ...f, status: (f.status === "pago" ? "pendente" : "pago") as "pago" | "pendente" } : f);
    setFaturas(updated);
    saveFaturas(updated);
  };

  const handleDelete = (id: string) => {
    const updated = faturas.filter(f => f.id !== id);
    setFaturas(updated);
    saveFaturas(updated);
    toast.success("Fatura removida.");
  };

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtKg = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-primary" />
          <h1 className="page-title">Armazenamento</h1>
        </div>
        <p className="page-subtitle">Faturamento calculado automaticamente — valor por saca definido no Recebimento</p>
      </div>

      <div className="form-section space-y-4">
        <h2 className="font-display font-semibold text-lg text-foreground">Saldo Atual por Produtor</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2"><Label>Período da Fatura *</Label><Input value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="Mar/2026 - 1ª Quinzena" /></div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Produtor</TableHead>
              <TableHead className="text-right">Saldo (Kg)</TableHead>
              <TableHead className="text-right">Sacos (÷60)</TableHead>
              <TableHead className="text-right">R$/Saca</TableHead>
              <TableHead className="text-right">Total Armazenamento</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {previewItens.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum produtor com saldo positivo.</TableCell></TableRow>
              ) : (
                <>
                  {previewItens.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.produtorNome}</TableCell>
                      <TableCell className="text-right">{fmtKg(item.saldoKg)}</TableCell>
                      <TableCell className="text-right">{item.sacos.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">{fmt(item.valorSaca)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(item.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-right">Total Geral</TableCell>
                    <TableCell className="text-right text-primary">{fmt(totalGeral)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        <Button onClick={handleGerarFatura} className="gap-2" disabled={previewItens.length === 0}>
          <Receipt className="h-4 w-4" /> Gerar Faturamento do Período
        </Button>
      </div>

      {faturas.length > 0 && (
        <div className="form-section space-y-4">
          <h2 className="font-display font-semibold text-lg text-foreground">Faturas Geradas</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Gerada em</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {faturas.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.periodo}</TableCell>
                    <TableCell>{new Date(f.geradoEm).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(f.totalGeral)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={f.status === "pago" ? "default" : "destructive"} className="cursor-pointer" onClick={() => toggleStatus(f.id)}>
                        {f.status === "pago" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
