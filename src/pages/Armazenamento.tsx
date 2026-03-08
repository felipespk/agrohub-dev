import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/contexts/AppContext";
import { Warehouse, Receipt, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

// Overrides per producer (valor unitário custom + status)
interface ProdutorOverride {
  valorSaca?: number;
  status: "pendente" | "pago";
}

const OVERRIDES_KEY = "armazenamento_overrides";
const FATURAS_KEY = "faturas_armazenamento";

function loadOverrides(): Record<string, ProdutorOverride> {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}"); } catch { return {}; }
}
function saveOverrides(o: Record<string, ProdutorOverride>) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
}

interface FaturaArmazenamento {
  id: string;
  periodo: string;
  geradoEm: string;
  itens: { produtorNome: string; saldoKg: number; sacos: number; valorSaca: number; total: number }[];
  totalGeral: number;
  status: "pendente" | "pago";
}

function loadFaturas(): FaturaArmazenamento[] {
  try { return JSON.parse(localStorage.getItem(FATURAS_KEY) || "[]"); } catch { return []; }
}
function saveFaturas(f: FaturaArmazenamento[]) {
  localStorage.setItem(FATURAS_KEY, JSON.stringify(f));
}

export default function ArmazenamentoPage() {
  const { recebimentos, saidas } = useAppData();
  const [overrides, setOverrides] = useState<Record<string, ProdutorOverride>>(loadOverrides);
  const [faturas, setFaturas] = useState<FaturaArmazenamento[]>(loadFaturas);
  const [periodo, setPeriodo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState("");

  // Compute per-produtor saldo + default valor from recebimento
  const saldoProdutores = useMemo(() => {
    const map = new Map<string, { produtorNome: string; saldoKg: number; valorSacaDefault: number; lastDate: string }>();

    for (const r of recebimentos) {
      const existing = map.get(r.produtor_id) || { produtorNome: r.produtor_nome || "", saldoKg: 0, valorSacaDefault: 0.15, lastDate: "" };
      existing.saldoKg += r.peso_liquido;
      if (r.data > existing.lastDate || r.created_at > existing.lastDate) {
        existing.valorSacaDefault = r.valor_armazenamento ?? 0.15;
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
      .map(([id, val]) => {
        const override = overrides[id];
        const valorSaca = override?.valorSaca ?? val.valorSacaDefault;
        const sacos = Math.ceil(val.saldoKg / 60);
        return {
          produtorId: id,
          produtorNome: val.produtorNome,
          saldoKg: val.saldoKg,
          sacos,
          valorSaca,
          total: sacos * valorSaca,
          status: (override?.status || "pendente") as "pendente" | "pago",
        };
      })
      .filter(p => p.saldoKg > 0)
      .sort((a, b) => a.produtorNome.localeCompare(b.produtorNome, "pt-BR"));
  }, [recebimentos, saidas, overrides]);

  const totalGeral = saldoProdutores.reduce((sum, p) => sum + p.total, 0);

  const startEdit = (p: typeof saldoProdutores[0]) => {
    setEditingId(p.produtorId);
    setEditValor(String(p.valorSaca));
  };

  const cancelEdit = () => { setEditingId(null); setEditValor(""); };

  const confirmEdit = useCallback(() => {
    if (!editingId) return;
    const val = parseFloat(editValor);
    if (isNaN(val) || val < 0) { toast.error("Valor inválido."); return; }
    const updated = { ...overrides, [editingId]: { ...overrides[editingId], valorSaca: val, status: overrides[editingId]?.status || "pendente" } };
    setOverrides(updated);
    saveOverrides(updated);
    setEditingId(null);
    toast.success("Valor unitário atualizado!");
  }, [editingId, editValor, overrides]);

  const toggleStatus = (produtorId: string) => {
    const current = overrides[produtorId]?.status || "pendente";
    const updated = { ...overrides, [produtorId]: { ...overrides[produtorId], status: (current === "pago" ? "pendente" : "pago") as "pendente" | "pago" } };
    setOverrides(updated);
    saveOverrides(updated);
  };

  // Gerar fatura snapshot
  const handleGerarFatura = () => {
    if (!periodo) { toast.error("Informe o período da fatura."); return; }
    if (saldoProdutores.length === 0) { toast.error("Nenhum produtor com saldo positivo."); return; }
    const novaFatura: FaturaArmazenamento = {
      id: crypto.randomUUID(),
      periodo,
      geradoEm: new Date().toISOString(),
      itens: saldoProdutores.map(p => ({ produtorNome: p.produtorNome, saldoKg: p.saldoKg, sacos: p.sacos, valorSaca: p.valorSaca, total: p.total })),
      totalGeral,
      status: "pendente",
    };
    const updated = [novaFatura, ...faturas];
    setFaturas(updated);
    saveFaturas(updated);
    toast.success(`Fatura "${periodo}" gerada com sucesso!`);
  };

  const toggleFaturaStatus = (id: string) => {
    const updated = faturas.map(f => f.id === id ? { ...f, status: (f.status === "pago" ? "pendente" : "pago") as "pago" | "pendente" } : f);
    setFaturas(updated);
    saveFaturas(updated);
  };

  const deleteFatura = (id: string) => {
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
        <p className="page-subtitle">Faturamento automático baseado no saldo em tempo real de cada produtor</p>
      </div>

      {/* Live computed table */}
      <div className="form-section space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display font-semibold text-lg text-foreground">Saldo e Cobrança por Produtor</h2>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Input value={periodo} onChange={e => setPeriodo(e.target.value)} placeholder="Mar/2026 - 1ª Quinzena" className="w-56" />
            </div>
            <Button onClick={handleGerarFatura} className="gap-2" size="sm" disabled={saldoProdutores.length === 0}>
              <Receipt className="h-4 w-4" /> Gerar Fatura
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Produtor</TableHead>
              <TableHead className="text-right">Saldo (Kg)</TableHead>
              <TableHead className="text-right">Sacos (÷60)</TableHead>
              <TableHead className="text-right">R$/Saca</TableHead>
              <TableHead className="text-right">Total a Cobrar</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {saldoProdutores.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum produtor com saldo positivo no momento.</TableCell></TableRow>
              ) : (
                <>
                  {saldoProdutores.map(p => (
                    <TableRow key={p.produtorId} className={editingId === p.produtorId ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                      <TableCell className="font-medium">{p.produtorNome}</TableCell>
                      <TableCell className="text-right">{fmtKg(p.saldoKg)}</TableCell>
                      <TableCell className="text-right">{p.sacos.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        {editingId === p.produtorId ? (
                          <Input type="number" step="0.01" value={editValor} onChange={e => setEditValor(e.target.value)}
                            className="w-24 ml-auto text-right h-8" autoFocus
                            onKeyDown={e => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") cancelEdit(); }}
                          />
                        ) : fmt(p.valorSaca)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">{fmt(p.total)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={p.status === "pago" ? "default" : "destructive"} className="cursor-pointer" onClick={() => toggleStatus(p.produtorId)}>
                          {p.status === "pago" ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {editingId === p.produtorId ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={confirmEdit} className="text-green-600 hover:text-green-700 h-8 w-8"><Check className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={cancelEdit} className="text-muted-foreground h-8 w-8"><X className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => startEdit(p)} className="text-amber-600 hover:text-amber-700 h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-right">Total Geral</TableCell>
                    <TableCell className="text-right text-primary">{fmt(totalGeral)}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Faturas históricas */}
      {faturas.length > 0 && (
        <div className="form-section space-y-4">
          <h2 className="font-display font-semibold text-lg text-foreground">Histórico de Faturas</h2>
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
                      <Badge variant={f.status === "pago" ? "default" : "destructive"} className="cursor-pointer" onClick={() => toggleFaturaStatus(f.id)}>
                        {f.status === "pago" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteFatura(f.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
