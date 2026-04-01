import { useState, useMemo } from "react";
import { Plus, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatarMoeda, formatarData } from "@/lib/format";
import { toast } from "sonner";

export default function ContasBancariasPage() {
  const { contasBancarias, lancamentos, centrosCusto, reload } = useFinanceiro();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [transfOpen, setTransfOpen] = useState(false);
  const [extratoId, setExtratoId] = useState<string | null>(null);
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ nome: "", banco: "", saldo_inicial: "0" });
  const [transfForm, setTransfForm] = useState({ origem_id: "", destino_id: "", valor: "", data: new Date().toISOString().split("T")[0], centro_custo_id: "" });

  const extratoLancamentos = useMemo(() => {
    if (!extratoId) return [];
    let list = lancamentos.filter(l => l.conta_bancaria_id === extratoId || l.conta_destino_id === extratoId);
    if (filtroInicio) list = list.filter(l => l.data >= filtroInicio);
    if (filtroFim) list = list.filter(l => l.data <= filtroFim);
    return list;
  }, [extratoId, lancamentos, filtroInicio, filtroFim]);

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    const si = parseFloat(form.saldo_inicial) || 0;
    await supabase.from("contas_bancarias").insert({ nome: form.nome, banco: form.banco || null, saldo_inicial: si, saldo_atual: si, user_id: user!.id });
    setSaving(false);
    setModalOpen(false);
    toast.success("Conta criada!");
    reload();
  };

  const handleTransf = async () => {
    if (!transfForm.origem_id || !transfForm.destino_id || !transfForm.valor || !transfForm.centro_custo_id) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    if (transfForm.origem_id === transfForm.destino_id) { toast.error("Contas devem ser diferentes."); return; }
    setSaving(true);
    const valor = parseFloat(transfForm.valor);
    const origem = contasBancarias.find(c => c.id === transfForm.origem_id);
    const destino = contasBancarias.find(c => c.id === transfForm.destino_id);

    await supabase.from("lancamentos").insert({
      tipo: "transferencia", valor, data: transfForm.data, descricao: `Transferência: ${origem?.nome} → ${destino?.nome}`,
      centro_custo_id: transfForm.centro_custo_id, conta_bancaria_id: transfForm.origem_id, conta_destino_id: transfForm.destino_id, user_id: user!.id,
    });

    if (origem) await supabase.from("contas_bancarias").update({ saldo_atual: Number(origem.saldo_atual) - valor }).eq("id", origem.id);
    if (destino) await supabase.from("contas_bancarias").update({ saldo_atual: Number(destino.saldo_atual) + valor }).eq("id", destino.id);

    setSaving(false);
    setTransfOpen(false);
    toast.success("Transferência realizada!");
    reload();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Contas Bancárias</h1>
          <p className="page-subtitle">Gerencie suas contas e saldos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setTransfForm({ origem_id: "", destino_id: "", valor: "", data: new Date().toISOString().split("T")[0], centro_custo_id: "" }); setTransfOpen(true); }} className="gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Transferência
          </Button>
          <Button onClick={() => { setForm({ nome: "", banco: "", saldo_inicial: "0" }); setModalOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Conta
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contasBancarias.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhuma conta bancária cadastrada.</p>
        ) : contasBancarias.map(c => (
          <button key={c.id} onClick={() => { setExtratoId(extratoId === c.id ? null : c.id); setFiltroInicio(""); setFiltroFim(""); }}
            className={`kpi-card text-left cursor-pointer transition-all ${extratoId === c.id ? "ring-2 ring-primary" : ""}`}>
            <p className="text-sm font-semibold text-foreground">{c.nome}</p>
            {c.banco && <p className="text-xs text-muted-foreground">{c.banco}</p>}
            <p className={`text-2xl font-bold mt-2 ${Number(c.saldo_atual) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {formatarMoeda(Number(c.saldo_atual))}
            </p>
          </button>
        ))}
      </div>

      {extratoId && (
        <div className="form-section">
          <h2 className="font-semibold text-base text-foreground mb-4">
            Extrato — {contasBancarias.find(c => c.id === extratoId)?.nome}
          </h2>
          <div className="flex gap-3 mb-4">
            <div><Label className="text-xs">De</Label><Input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} /></div>
            <div><Label className="text-xs">Até</Label><Input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} /></div>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs uppercase tracking-wider">Data</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Descrição</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Tipo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Valor</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {extratoLancamentos.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum lançamento.</TableCell></TableRow>
              ) : extratoLancamentos.map(l => {
                const isCredito = l.tipo === "receita" || (l.tipo === "transferencia" && l.conta_destino_id === extratoId);
                return (
                  <TableRow key={l.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm">{formatarData(l.data)}</TableCell>
                    <TableCell className="text-sm">{l.descricao || "-"}</TableCell>
                    <TableCell className="text-sm">{l.tipo}</TableCell>
                    <TableCell className={`text-sm text-right font-semibold ${isCredito ? "text-emerald-600" : "text-destructive"}`}>
                      {isCredito ? "+" : "-"}{formatarMoeda(Number(l.valor))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Conta Bancária</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><Label>Banco</Label><Input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} /></div>
            <div><Label>Saldo Inicial</Label><Input type="number" step="0.01" value={form.saldo_inicial} onChange={e => setForm(f => ({ ...f, saldo_inicial: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transfOpen} onOpenChange={setTransfOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Transferência entre Contas</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Conta Origem *</Label>
              <Select value={transfForm.origem_id} onValueChange={v => setTransfForm(f => ({ ...f, origem_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{contasBancarias.filter(c => c.ativa).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Conta Destino *</Label>
              <Select value={transfForm.destino_id} onValueChange={v => setTransfForm(f => ({ ...f, destino_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{contasBancarias.filter(c => c.ativa && c.id !== transfForm.origem_id).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Centro de Custo *</Label>
              <Select value={transfForm.centro_custo_id} onValueChange={v => setTransfForm(f => ({ ...f, centro_custo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{centrosCusto.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valor *</Label><Input type="number" step="0.01" value={transfForm.valor} onChange={e => setTransfForm(f => ({ ...f, valor: e.target.value }))} /></div>
            <div><Label>Data</Label><Input type="date" value={transfForm.data} onChange={e => setTransfForm(f => ({ ...f, data: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTransfOpen(false)}>Cancelar</Button>
            <Button onClick={handleTransf} disabled={saving}>{saving ? "Processando..." : "Transferir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
