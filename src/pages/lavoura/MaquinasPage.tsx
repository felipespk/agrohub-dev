import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Cog, Wrench } from "lucide-react";
import { toast } from "sonner";

const tipoBadgeMaq: Record<string, string> = {
  trator: "bg-green-100 text-green-800", colheitadeira: "bg-blue-100 text-blue-800",
  pulverizador: "bg-red-100 text-red-800", plantadeira: "bg-orange-100 text-orange-800",
  outro: "bg-gray-100 text-gray-800",
};

export default function MaquinasPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [openManut, setOpenManut] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [manutencoes, setManutencoes] = useState<any[]>([]);
  const [manutMaqId, setManutMaqId] = useState("");
  const [form, setForm] = useState({ nome: "", tipo: "trator", modelo: "", ano: "", placa_chassi: "", valor_aquisicao: "", custo_hora: "" });
  const [manutForm, setManutForm] = useState({ data: new Date().toISOString().split("T")[0], tipo: "preventiva", descricao: "", custo: "", proxima_manutencao: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("maquinas" as any).select("*").eq("user_id", effectiveUserId).order("nome");
    setMaquinas((data as any[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  const loadManutencoes = async (maqId: string) => {
    const { data } = await supabase.from("manutencoes" as any).select("*").eq("maquina_id", maqId).eq("user_id", user!.id).order("data", { ascending: false });
    setManutencoes((data as any[]) || []);
  };

  const save = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user || !form.nome.trim()) return;
    const payload: any = { nome: form.nome.trim(), tipo: form.tipo, modelo: form.modelo || null, ano: form.ano ? parseInt(form.ano) : null, placa_chassi: form.placa_chassi || null, valor_aquisicao: form.valor_aquisicao ? parseFloat(form.valor_aquisicao) : null, custo_hora: parseFloat(form.custo_hora) || 0, user_id: user.id };
    if (editItem) {
      await supabase.from("maquinas" as any).update(payload).eq("id", editItem.id);
      toast.success("Máquina atualizada!");
    } else {
      await supabase.from("maquinas" as any).insert(payload);
      toast.success("Máquina cadastrada!");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    await supabase.from("maquinas" as any).delete().eq("id", id);
    toast.success("Máquina removida."); load();
  };

  const saveManut = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user || !manutMaqId || !manutForm.descricao.trim()) return;
    await supabase.from("manutencoes" as any).insert({ maquina_id: manutMaqId, data: manutForm.data, tipo: manutForm.tipo, descricao: manutForm.descricao.trim(), custo: parseFloat(manutForm.custo) || 0, proxima_manutencao: manutForm.proxima_manutencao || null, user_id: user.id } as any);
    // Financial integration
    if (manutForm.custo && parseFloat(manutForm.custo) > 0) {
      try {
        const maq = maquinas.find(m => m.id === manutMaqId);
        const { data: cc } = await supabase.from("centros_custo").select("id").eq("user_id", effectiveUserId).ilike("nome", "%lavoura%").limit(1);
        if (cc && cc.length > 0) {
          await supabase.from("contas_pr").insert({ tipo: "pagar", descricao: `Manutenção: ${maq?.nome || "Máquina"}`, valor_total: parseFloat(manutForm.custo), centro_custo_id: cc[0].id, data_vencimento: manutForm.data, status: "aberto", user_id: user.id } as any);
        }
      } catch {}
    }
    toast.success("Manutenção registrada!"); setOpenManut(false); loadManutencoes(manutMaqId);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Máquinas e Equipamentos</h1>
        <Button onClick={() => { setEditItem(null); setForm({ nome: "", tipo: "trator", modelo: "", ano: "", placa_chassi: "", valor_aquisicao: "", custo_hora: "" }); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Máquina</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {maquinas.map((m: any) => {
          const isExpanded = expanded === m.id;
          const nextManut = manutencoes.find((mt: any) => mt.maquina_id === m.id && mt.proxima_manutencao);
          return (
            <Card key={m.id} className={`border-[#E5E7EB] transition-shadow ${isExpanded ? "col-span-full" : "hover:shadow-md cursor-pointer"}`}
              onClick={() => { if (!isExpanded) { setExpanded(m.id); setManutMaqId(m.id); loadManutencoes(m.id); } }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{m.nome}</h3>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tipoBadgeMaq[m.tipo] || tipoBadgeMaq.outro}`}>{m.tipo}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditItem(m); setForm({ nome: m.nome, tipo: m.tipo, modelo: m.modelo || "", ano: m.ano ? String(m.ano) : "", placa_chassi: m.placa_chassi || "", valor_aquisicao: m.valor_aquisicao ? String(m.valor_aquisicao) : "", custo_hora: String(m.custo_hora || 0) }); setOpen(true); }}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); remove(m.id); }}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{m.modelo} {m.ano ? `(${m.ano})` : ""}</p>
                <p className="text-sm font-medium mt-1">R$ {Number(m.custo_hora).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/h</p>

                {isExpanded && (
                  <div className="mt-4 border-t pt-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">Manutenções</h4>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setManutForm({ data: new Date().toISOString().split("T")[0], tipo: "preventiva", descricao: "", custo: "", proxima_manutencao: "" }); setOpenManut(true); }} className="gap-1"><Wrench className="h-3.5 w-3.5" /> Registrar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>Fechar</Button>
                      </div>
                    </div>
                    <Table>
                      <TableHeader><TableRow className="bg-[#F9FAFB]">
                        <TableHead className="text-[11px] uppercase">Data</TableHead>
                        <TableHead className="text-[11px] uppercase">Tipo</TableHead>
                        <TableHead className="text-[11px] uppercase">Descrição</TableHead>
                        <TableHead className="text-[11px] uppercase">Custo</TableHead>
                        <TableHead className="text-[11px] uppercase">Próx. Manutenção</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {manutencoes.map((mt: any) => (
                          <TableRow key={mt.id}>
                            <TableCell>{new Date(mt.data).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${mt.tipo === "preventiva" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>{mt.tipo}</span></TableCell>
                            <TableCell>{mt.descricao}</TableCell>
                            <TableCell>R$ {Number(mt.custo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className={mt.proxima_manutencao && mt.proxima_manutencao < today ? "text-red-600 font-medium" : ""}>{mt.proxima_manutencao ? new Date(mt.proxima_manutencao + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                          </TableRow>
                        ))}
                        {manutencoes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">Nenhuma manutenção registrada.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {maquinas.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhuma máquina cadastrada.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Editar Máquina" : "Nova Máquina"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["trator", "colheitadeira", "pulverizador", "plantadeira", "outro"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Modelo</Label><Input value={form.modelo} onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Ano</Label><Input type="number" value={form.ano} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Placa/Chassi</Label><Input value={form.placa_chassi} onChange={e => setForm(p => ({ ...p, placa_chassi: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor de Aquisição (R$)</Label><Input type="number" value={form.valor_aquisicao} onChange={e => setForm(p => ({ ...p, valor_aquisicao: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Custo por Hora (R$) *</Label><Input type="number" value={form.custo_hora} onChange={e => setForm(p => ({ ...p, custo_hora: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!form.nome.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openManut} onOpenChange={setOpenManut}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={manutForm.data} onChange={e => setManutForm(p => ({ ...p, data: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Tipo</Label>
                <Select value={manutForm.tipo} onValueChange={v => setManutForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="preventiva">Preventiva</SelectItem><SelectItem value="corretiva">Corretiva</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descrição *</Label><Input value={manutForm.descricao} onChange={e => setManutForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Custo (R$)</Label><Input type="number" value={manutForm.custo} onChange={e => setManutForm(p => ({ ...p, custo: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Próxima Manutenção</Label><Input type="date" value={manutForm.proxima_manutencao} onChange={e => setManutForm(p => ({ ...p, proxima_manutencao: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenManut(false)}>Cancelar</Button><Button onClick={saveManut} disabled={!manutForm.descricao.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
