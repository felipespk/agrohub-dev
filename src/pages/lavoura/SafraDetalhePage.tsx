import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SafraDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const navigate = useNavigate();
  const [safra, setSafra] = useState<any>(null);
  const [vinculados, setVinculados] = useState<any[]>([]);
  const [talhoes, setTalhoes] = useState<any[]>([]);
  const [culturas, setCulturas] = useState<any[]>([]);
  const [variedades, setVariedades] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ talhao_id: "", cultura_id: "", variedade_id: "", data_plantio_prevista: "", data_colheita_prevista: "", meta_produtividade: "" });

  const load = async () => {
    if (!user || !id) return;
    const { data: s } = await supabase.from("safras" as any).select("*").eq("id", id).single();
    setSafra(s);
    const { data: st } = await supabase.from("safra_talhoes" as any).select("*, talhoes:talhao_id(nome, area_hectares), culturas:cultura_id(nome), variedades_cultura:variedade_id(nome)").eq("safra_id", id).eq("user_id", effectiveUserId);
    setVinculados((st as any[]) || []);
    const { data: t } = await supabase.from("talhoes" as any).select("id, nome").eq("user_id", effectiveUserId).eq("ativo", true);
    setTalhoes((t as any[]) || []);
    const { data: c } = await supabase.from("culturas" as any).select("id, nome").eq("user_id", effectiveUserId);
    setCulturas((c as any[]) || []);
  };
  useEffect(() => { load(); }, [user, id]);

  const loadVariedades = async (culturaId: string) => {
    const { data } = await supabase.from("variedades_cultura" as any).select("id, nome").eq("cultura_id", culturaId).eq("user_id", user!.id);
    setVariedades((data as any[]) || []);
  };

  const vincular = async () => {
    if (!user || !id || !form.talhao_id || !form.cultura_id) return;
    const { error } = await supabase.from("safra_talhoes" as any).insert({
      safra_id: id, talhao_id: form.talhao_id, cultura_id: form.cultura_id,
      variedade_id: form.variedade_id || null, data_plantio_prevista: form.data_plantio_prevista || null,
      data_colheita_prevista: form.data_colheita_prevista || null, meta_produtividade: form.meta_produtividade ? parseFloat(form.meta_produtividade) : null,
      user_id: user.id,
    } as any);
    if (error) { toast.error(error.message.includes("unique") ? "Talhão já vinculado a esta safra." : "Erro ao vincular."); return; }
    toast.success("Talhão vinculado!"); setOpen(false); load();
  };

  const desvincular = async (stId: string) => {
    await supabase.from("safra_talhoes" as any).delete().eq("id", stId);
    toast.success("Talhão desvinculado."); load();
  };

  const usedTalhaoIds = vinculados.map((v: any) => v.talhao_id);
  const availableTalhoes = talhoes.filter(t => !usedTalhaoIds.includes(t.id));

  const statusBadge: Record<string, string> = { planejamento: "bg-yellow-100 text-yellow-800", andamento: "bg-green-100 text-green-800", finalizada: "bg-gray-200 text-gray-700" };

  if (!safra) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/lavoura/safras")}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold text-foreground">{safra.nome}</h1>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[safra.status] || ""}`}>
          {safra.status === "andamento" ? "Em andamento" : safra.status === "finalizada" ? "Finalizada" : "Planejamento"}
        </span>
      </div>

      <Card className="border-[#E5E7EB]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Talhões desta Safra</CardTitle>
          <Button size="sm" onClick={() => { setForm({ talhao_id: "", cultura_id: "", variedade_id: "", data_plantio_prevista: "", data_colheita_prevista: "", meta_produtividade: "" }); setVariedades([]); setOpen(true); }} className="gap-2" disabled={availableTalhoes.length === 0}><Plus className="h-4 w-4" /> Vincular Talhão</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[11px] uppercase">Talhão</TableHead>
                <TableHead className="text-[11px] uppercase">Cultura</TableHead>
                <TableHead className="text-[11px] uppercase">Variedade</TableHead>
                <TableHead className="text-[11px] uppercase">Plantio Previsto</TableHead>
                <TableHead className="text-[11px] uppercase">Colheita Prevista</TableHead>
                <TableHead className="text-[11px] uppercase">Meta (sacas/ha)</TableHead>
                <TableHead className="text-[11px] uppercase">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vinculados.map((v: any) => (
                <TableRow key={v.id} className="hover:bg-[#F8FAFC]">
                  <TableCell className="font-medium">{v.talhoes?.nome}</TableCell>
                  <TableCell>{v.culturas?.nome}</TableCell>
                  <TableCell>{v.variedades_cultura?.nome || "—"}</TableCell>
                  <TableCell>{v.data_plantio_prevista ? new Date(v.data_plantio_prevista + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>{v.data_colheita_prevista ? new Date(v.data_colheita_prevista + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>{v.meta_produtividade ? Number(v.meta_produtividade).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => desvincular(v.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {vinculados.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum talhão vinculado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular Talhão</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Talhão *</Label>
              <Select value={form.talhao_id} onValueChange={v => setForm(p => ({ ...p, talhao_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{availableTalhoes.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cultura *</Label>
              <Select value={form.cultura_id} onValueChange={v => { setForm(p => ({ ...p, cultura_id: v, variedade_id: "" })); loadVariedades(v); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{culturas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {variedades.length > 0 && (
              <div className="space-y-2"><Label>Variedade</Label>
                <Select value={form.variedade_id} onValueChange={v => setForm(p => ({ ...p, variedade_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{variedades.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Plantio Previsto</Label><Input type="date" value={form.data_plantio_prevista} onChange={e => setForm(p => ({ ...p, data_plantio_prevista: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Colheita Prevista</Label><Input type="date" value={form.data_colheita_prevista} onChange={e => setForm(p => ({ ...p, data_colheita_prevista: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Meta de Produtividade (sacas/ha)</Label><Input type="number" value={form.meta_produtividade} onChange={e => setForm(p => ({ ...p, meta_produtividade: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={vincular} disabled={!form.talhao_id || !form.cultura_id}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
