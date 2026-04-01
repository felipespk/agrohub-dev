import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ColheitasPage() {
  const { user } = useAuth();
  const [colheitas, setColheitas] = useState<any[]>([]);
  const [safras, setSafras] = useState<any[]>([]);
  const [safraTalhoes, setSafraTalhoes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ safra_id: "", safra_talhao_id: "", data: new Date().toISOString().split("T")[0], quantidade: "", umidade_percentual: "", destino: "silo", observacao: "" });
  const [areaTalhao, setAreaTalhao] = useState(0);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("colheitas" as any).select("*, safra_talhoes:safra_talhao_id(talhoes:talhao_id(nome, area_hectares), culturas:cultura_id(nome, unidade_colheita), safras:safra_id(nome))").eq("user_id", user.id).order("data", { ascending: false });
    setColheitas((data as any[]) || []);
    const { data: s } = await supabase.from("safras" as any).select("id, nome").eq("user_id", user.id);
    setSafras((s as any[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  const loadST = async (safraId: string) => {
    const { data } = await supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome, area_hectares), culturas:cultura_id(nome)").eq("safra_id", safraId).eq("user_id", user!.id);
    setSafraTalhoes((data as any[]) || []);
  };

  const save = async () => {
    if (!user || !form.safra_talhao_id || !form.quantidade) return;
    const qty = parseFloat(form.quantidade);
    const prod = areaTalhao > 0 ? qty / areaTalhao : 0;
    await supabase.from("colheitas" as any).insert({ safra_talhao_id: form.safra_talhao_id, data: form.data, quantidade: qty, umidade_percentual: form.umidade_percentual ? parseFloat(form.umidade_percentual) : null, produtividade_calculada: prod, destino: form.destino, observacao: form.observacao || null, user_id: user.id } as any);
    toast.success(`Colheita registrada! Produtividade: ${prod.toFixed(1)} sacas/ha`); setOpen(false); load();
  };

  const remove = async (id: string) => { await supabase.from("colheitas" as any).delete().eq("id", id); toast.success("Removida."); load(); };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Colheita</h1>
        <Button onClick={() => { setForm({ safra_id: "", safra_talhao_id: "", data: new Date().toISOString().split("T")[0], quantidade: "", umidade_percentual: "", destino: "silo", observacao: "" }); setSafraTalhoes([]); setAreaTalhao(0); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Registrar Colheita</Button>
      </div>

      <Table>
        <TableHeader><TableRow className="bg-[#F9FAFB]">
          <TableHead className="text-[11px] uppercase">Data</TableHead>
          <TableHead className="text-[11px] uppercase">Safra</TableHead>
          <TableHead className="text-[11px] uppercase">Talhão</TableHead>
          <TableHead className="text-[11px] uppercase">Cultura</TableHead>
          <TableHead className="text-[11px] uppercase">Quantidade</TableHead>
          <TableHead className="text-[11px] uppercase">Umidade %</TableHead>
          <TableHead className="text-[11px] uppercase">Produtividade</TableHead>
          <TableHead className="text-[11px] uppercase">Destino</TableHead>
          <TableHead className="text-[11px] uppercase">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {colheitas.map((c: any) => (
            <TableRow key={c.id} className="hover:bg-[#F8FAFC]">
              <TableCell>{new Date(c.data).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>{c.safra_talhoes?.safras?.nome || "—"}</TableCell>
              <TableCell>{c.safra_talhoes?.talhoes?.nome || "—"}</TableCell>
              <TableCell>{c.safra_talhoes?.culturas?.nome || "—"}</TableCell>
              <TableCell>{Number(c.quantidade).toLocaleString("pt-BR")}</TableCell>
              <TableCell>{c.umidade_percentual ? `${Number(c.umidade_percentual).toFixed(1)}%` : "—"}</TableCell>
              <TableCell className="font-medium">{c.produtividade_calculada ? `${Number(c.produtividade_calculada).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ${c.safra_talhoes?.culturas?.unidade_colheita || "sacas/ha"}` : "—"}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${c.destino === "silo" ? "bg-green-100 text-green-800" : c.destino === "venda_direta" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>{c.destino === "venda_direta" ? "Venda Direta" : c.destino === "cooperativa" ? "Cooperativa" : "Silo"}</span></TableCell>
              <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></TableCell>
            </TableRow>
          ))}
          {colheitas.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nenhuma colheita registrada.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Colheita</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Safra *</Label>
                <Select value={form.safra_id} onValueChange={v => { setForm((p: any) => ({ ...p, safra_id: v, safra_talhao_id: "" })); loadST(v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Talhão *</Label>
                <Select value={form.safra_talhao_id} onValueChange={v => { setForm((p: any) => ({ ...p, safra_talhao_id: v })); const st = safraTalhoes.find((s: any) => s.id === v); setAreaTalhao(Number(st?.talhoes?.area_hectares) || 0); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{safraTalhoes.map((st: any) => <SelectItem key={st.id} value={st.id}>{st.talhoes?.nome} — {st.culturas?.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm((p: any) => ({ ...p, data: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantidade (sacas) *</Label><Input type="number" value={form.quantidade} onChange={e => setForm((p: any) => ({ ...p, quantidade: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Umidade (%)</Label><Input type="number" value={form.umidade_percentual} onChange={e => setForm((p: any) => ({ ...p, umidade_percentual: e.target.value }))} /></div>
            </div>
            {form.quantidade && areaTalhao > 0 && <p className="text-sm bg-muted p-2 rounded">Produtividade: <strong>{(parseFloat(form.quantidade) / areaTalhao).toFixed(1)} sacas/ha</strong></p>}
            <div className="space-y-2"><Label>Destino</Label>
              <Select value={form.destino} onValueChange={v => setForm((p: any) => ({ ...p, destino: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="silo">Silo</SelectItem><SelectItem value="venda_direta">Venda Direta</SelectItem><SelectItem value="cooperativa">Cooperativa</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm((p: any) => ({ ...p, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!form.safra_talhao_id || !form.quantidade}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
