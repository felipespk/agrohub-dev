import { useState, useEffect, useCallback } from "react";
import { criarLancamentoReceita, buscarCentroCusto } from "@/lib/financeiro-integration";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

const TIPO_BADGE: Record<string, string> = {
  compra: "bg-blue-100 text-blue-700", venda: "bg-green-100 text-green-700",
  nascimento: "bg-cyan-100 text-cyan-700", morte: "bg-red-100 text-red-700",
  transferencia: "bg-gray-100 text-gray-700",
};
const TIPO_LABEL: Record<string, string> = {
  compra: "Compra", venda: "Venda", nascimento: "Nascimento", morte: "Morte", transferencia: "Transferência",
};

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function MovimentacoesPage() {
  const { user } = useAuth();
  const [movs, setMovs] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [pastos, setPastos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [fTipo, setFTipo] = useState("__all__");
  const [form, setForm] = useState<any>({
    tipo: "compra", animal_id: "", data: new Date().toISOString().split("T")[0],
    quantidade: "1", peso_kg: "", valor_unitario: "", valor_total: "",
    causa_morte: "", pasto_destino_id: "", observacao: "",
    // nascimento
    sexo_bezerro: "macho", brinco_bezerro: "",
  });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [m, a, p] = await Promise.all([
      supabase.from("movimentacoes_gado" as any).select("*, animal:animais!animal_id(brinco, nome)").eq("user_id", user.id).order("data", { ascending: false }),
      supabase.from("animais" as any).select("id, brinco, nome, sexo, pasto_id, peso_atual").eq("user_id", user.id).eq("status", "ativo").order("brinco"),
      supabase.from("pastos" as any).select("id, nome").eq("user_id", user.id).order("nome"),
    ]);
    setMovs((m.data as any) || []);
    setAnimais((a.data as any) || []);
    setPastos((p.data as any) || []);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = movs.filter(m => {
    if (fTipo !== "__all__" && m.tipo !== fTipo) return false;
    if (busca && !(m.animal?.brinco || "").toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const resumo = {
    compras: movs.filter(m => m.tipo === "compra"),
    vendas: movs.filter(m => m.tipo === "venda"),
    mortes: movs.filter(m => m.tipo === "morte"),
  };

  const handleSave = async () => {
    if (!user) return;

    if (form.tipo === "compra") {
      const { error } = await supabase.from("movimentacoes_gado" as any).insert({
        tipo: "compra", animal_id: form.animal_id || null, data: form.data,
        quantidade: parseInt(form.quantidade) || 1, peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
        valor_unitario: form.valor_unitario ? parseFloat(form.valor_unitario) : null,
        valor_total: form.valor_total ? parseFloat(form.valor_total) : null,
        user_id: user.id, observacao: form.observacao || null,
      } as any);
      if (error) { toast.error(error.message); return; }
      // Try to create contas_pr
      try {
        const { data: cc } = await supabase.from("centros_custo").select("id").eq("user_id", user.id).ilike("nome", "%pecuária%").limit(1);
        if (cc && cc.length > 0) {
          await supabase.from("contas_pr").insert({
            tipo: "pagar", descricao: `Compra de gado`, data_vencimento: form.data,
            valor_total: form.valor_total ? parseFloat(form.valor_total) : 0,
            centro_custo_id: cc[0].id, user_id: user.id, status: "aberto",
          } as any);
        }
      } catch { /* silently skip */ }
    } else if (form.tipo === "venda") {
      if (!form.animal_id) { toast.error("Selecione o animal."); return; }
      await supabase.from("movimentacoes_gado" as any).insert({
        tipo: "venda", animal_id: form.animal_id, data: form.data,
        quantidade: 1, peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
        valor_unitario: form.valor_unitario ? parseFloat(form.valor_unitario) : null,
        valor_total: form.valor_total ? parseFloat(form.valor_total) : null,
        user_id: user.id, observacao: form.observacao || null,
      } as any);
      await supabase.from("animais" as any).update({ status: "vendido" } as any).eq("id", form.animal_id);
      try {
        const { data: cc } = await supabase.from("centros_custo").select("id").eq("user_id", user.id).ilike("nome", "%pecuária%").limit(1);
        if (cc && cc.length > 0) {
          await supabase.from("contas_pr").insert({
            tipo: "receber", descricao: `Venda de gado`, data_vencimento: form.data,
            valor_total: form.valor_total ? parseFloat(form.valor_total) : 0,
            centro_custo_id: cc[0].id, user_id: user.id, status: "aberto",
          } as any);
        }
      } catch { /* silently skip */ }
    } else if (form.tipo === "nascimento") {
      const mae = animais.find(a => a.id === form.animal_id);
      // Create bezerro
      const { data: newAnimal } = await supabase.from("animais" as any).insert({
        brinco: form.brinco_bezerro || `BEZ-${Date.now().toString(36)}`,
        sexo: form.sexo_bezerro, categoria: form.sexo_bezerro === "macho" ? "bezerro" : "bezerra",
        origem: "nascido", data_nascimento: form.data, data_entrada: form.data,
        mae_brinco: mae?.brinco || null, pasto_id: mae?.pasto_id || null,
        peso_atual: form.peso_kg ? parseFloat(form.peso_kg) : null,
        user_id: user.id, status: "ativo",
      } as any).select("id").single();

      await supabase.from("movimentacoes_gado" as any).insert({
        tipo: "nascimento", animal_id: (newAnimal as any)?.id || null, data: form.data,
        quantidade: 1, peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
        user_id: user.id, observacao: form.observacao || null,
      } as any);

      if (form.peso_kg && (newAnimal as any)?.id) {
        await supabase.from("pesagens" as any).insert({
          animal_id: (newAnimal as any).id, data: form.data, peso_kg: parseFloat(form.peso_kg), user_id: user.id,
        } as any);
      }
    } else if (form.tipo === "morte") {
      if (!form.animal_id) { toast.error("Selecione o animal."); return; }
      await supabase.from("movimentacoes_gado" as any).insert({
        tipo: "morte", animal_id: form.animal_id, data: form.data,
        causa_morte: form.causa_morte || null, user_id: user.id, observacao: form.observacao || null,
      } as any);
      await supabase.from("animais" as any).update({ status: "morto" } as any).eq("id", form.animal_id);
    } else if (form.tipo === "transferencia") {
      if (!form.animal_id || !form.pasto_destino_id) { toast.error("Selecione animal e pasto destino."); return; }
      const animal = animais.find(a => a.id === form.animal_id);
      await supabase.from("movimentacoes_gado" as any).insert({
        tipo: "transferencia", animal_id: form.animal_id, data: form.data,
        pasto_origem_id: animal?.pasto_id || null, pasto_destino_id: form.pasto_destino_id,
        user_id: user.id, observacao: form.observacao || null,
      } as any);
      await supabase.from("animais" as any).update({ pasto_id: form.pasto_destino_id } as any).eq("id", form.animal_id);
    }

    toast.success("Movimentação registrada!");
    setOpen(false); fetchAll();
  };

  const femeas = animais.filter(a => a.sexo === "femea");

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Movimentações</h1>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Movimentação</Button>
      </div>

      {/* Mini cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#E5E7EB]"><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase text-muted-foreground font-semibold">Compras</p>
          <p className="text-lg font-bold text-blue-600">{resumo.compras.length} cab. • {fmt(resumo.compras.reduce((s, m) => s + (Number(m.valor_total) || 0), 0))}</p>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase text-muted-foreground font-semibold">Vendas</p>
          <p className="text-lg font-bold text-green-600">{resumo.vendas.length} cab. • {fmt(resumo.vendas.reduce((s, m) => s + (Number(m.valor_total) || 0), 0))}</p>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="pt-4 pb-3">
          <p className="text-[11px] uppercase text-muted-foreground font-semibold">Mortes</p>
          <p className="text-lg font-bold text-red-600">{resumo.mortes.length}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por brinco..." className="pl-9" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={fTipo} onValueChange={setFTipo}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {Object.entries(TIPO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-[#E5E7EB]"><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Data</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Animal</th>
            <th className="px-4 py-3">Qtd</th><th className="px-4 py-3">Peso KG</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Obs</th>
          </tr></thead>
          <tbody>
            {filtered.map((m: any) => (
              <tr key={m.id} className="border-b hover:bg-[#F8FAFC]">
                <td className="px-4 py-2">{new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_BADGE[m.tipo] || ""}`}>{TIPO_LABEL[m.tipo]}</span></td>
                <td className="px-4 py-2 font-mono">{m.animal?.brinco || "—"}</td>
                <td className="px-4 py-2">{m.quantidade}</td>
                <td className="px-4 py-2">{m.peso_kg ? Number(m.peso_kg).toFixed(1) : "—"}</td>
                <td className="px-4 py-2">{m.valor_total ? fmt(Number(m.valor_total)) : "—"}</td>
                <td className="px-4 py-2 max-w-[150px] truncate">{m.observacao || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhuma movimentação</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TIPO_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>

            {(form.tipo === "compra" || form.tipo === "venda" || form.tipo === "morte" || form.tipo === "transferencia") && (
              <div className="space-y-2"><Label>Animal</Label>
                <Select value={form.animal_id || "__none__"} onValueChange={v => setForm({ ...form, animal_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{animais.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco} — {a.nome || ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {form.tipo === "nascimento" && (
              <>
                <div className="space-y-2"><Label>Mãe</Label>
                  <Select value={form.animal_id || "__none__"} onValueChange={v => setForm({ ...form, animal_id: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{femeas.map(a => <SelectItem key={a.id} value={a.id}>{a.brinco} — {a.nome || ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Sexo do Bezerro</Label>
                  <Select value={form.sexo_bezerro} onValueChange={v => setForm({ ...form, sexo_bezerro: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="macho">Macho</SelectItem><SelectItem value="femea">Fêmea</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Brinco do Bezerro</Label><Input value={form.brinco_bezerro} onChange={e => setForm({ ...form, brinco_bezerro: e.target.value })} /></div>
              </>
            )}

            {(form.tipo === "compra" || form.tipo === "venda" || form.tipo === "nascimento") && (
              <div className="space-y-2"><Label>Peso KG</Label><Input type="number" value={form.peso_kg} onChange={e => setForm({ ...form, peso_kg: e.target.value })} /></div>
            )}

            {(form.tipo === "compra" || form.tipo === "venda") && (
              <>
                <div className="space-y-2"><Label>Valor por Cabeça (R$)</Label><Input type="number" value={form.valor_unitario} onChange={e => {
                  const vu = e.target.value;
                  setForm({ ...form, valor_unitario: vu, valor_total: vu ? (parseFloat(vu) * (parseInt(form.quantidade) || 1)).toString() : "" });
                }} /></div>
                <div className="space-y-2"><Label>Valor Total (R$)</Label><Input type="number" value={form.valor_total} onChange={e => setForm({ ...form, valor_total: e.target.value })} /></div>
              </>
            )}

            {form.tipo === "morte" && (
              <div className="space-y-2"><Label>Causa da Morte</Label><Input value={form.causa_morte} onChange={e => setForm({ ...form, causa_morte: e.target.value })} placeholder="Doença, Acidente..." /></div>
            )}

            {form.tipo === "transferencia" && (
              <div className="space-y-2"><Label>Pasto Destino</Label>
                <Select value={form.pasto_destino_id || "__none__"} onValueChange={v => setForm({ ...form, pasto_destino_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
