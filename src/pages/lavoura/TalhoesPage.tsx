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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Map, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";


const soloColors: Record<string, string> = {
  argiloso: "bg-amber-700 text-white", arenoso: "bg-yellow-200 text-yellow-800",
  misto: "bg-gray-200 text-gray-700", outro: "bg-gray-100 text-gray-600",
};

export default function TalhoesPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [talhoes, setTalhoes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ nome: "", area_hectares: "", tipo_solo: "argiloso", observacoes: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("talhoes" as any).select("*").eq("user_id", effectiveUserId).order("nome");
    setTalhoes((data as any[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  const openNew = () => { setEditItem(null); setForm({ nome: "", area_hectares: "", tipo_solo: "argiloso", observacoes: "" }); setOpen(true); };
  const openEdit = (t: any) => { setEditItem(t); setForm({ nome: t.nome, area_hectares: String(t.area_hectares), tipo_solo: t.tipo_solo || "argiloso", observacoes: t.observacoes || "" }); setOpen(true); };

  const save = async () => {
    if (!user || !form.nome.trim() || !form.area_hectares) return;
    const payload = { nome: form.nome.trim(), area_hectares: parseFloat(form.area_hectares), tipo_solo: form.tipo_solo, observacoes: form.observacoes, user_id: user.id };
    if (editItem) {
      await supabase.from("talhoes" as any).update(payload as any).eq("id", editItem.id);
      toast.success("Talhão atualizado!");
    } else {
      await supabase.from("talhoes" as any).insert(payload as any);
      toast.success("Talhão cadastrado!");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    await supabase.from("talhoes" as any).delete().eq("id", id);
    toast.success("Talhão removido."); load();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Talhões</h1>
          <p className="text-sm text-muted-foreground">{talhoes.length} talhões cadastrados</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Talhão</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {talhoes.map((t: any) => (
          <Card key={t.id} className="border-[#E5E7EB] hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-foreground">{t.nome}</h3>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{Number(t.area_hectares).toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ha</p>
              <div className="flex gap-2">
                {t.tipo_solo && <span className={`text-xs px-2 py-0.5 rounded-full ${soloColors[t.tipo_solo] || soloColors.outro}`}>{t.tipo_solo}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.ativo !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{t.ativo !== false ? "Ativo" : "Inativo"}</span>
              </div>
              {t.observacoes && t.observacoes !== "Dado de exemplo" && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.observacoes}</p>}
            </CardContent>
          </Card>
        ))}
        {talhoes.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhum talhão cadastrado. Clique em "Novo Talhão" para começar.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Editar Talhão" : "Novo Talhão"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Talhão A1" /></div>
            <div className="space-y-2"><Label>Área em Hectares *</Label><Input type="number" value={form.area_hectares} onChange={e => setForm(p => ({ ...p, area_hectares: e.target.value }))} placeholder="Ex: 125.5" /></div>
            <div className="space-y-2"><Label>Tipo de Solo</Label>
              <Select value={form.tipo_solo} onValueChange={v => setForm(p => ({ ...p, tipo_solo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="argiloso">Argiloso</SelectItem>
                  <SelectItem value="arenoso">Arenoso</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!form.nome.trim() || !form.area_hectares}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
