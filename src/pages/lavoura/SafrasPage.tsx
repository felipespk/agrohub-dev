import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Calendar, Plus } from "lucide-react";
import { toast } from "sonner";

const statusBadge: Record<string, string> = {
  planejamento: "bg-yellow-100 text-yellow-800", andamento: "bg-green-100 text-green-800", finalizada: "bg-gray-200 text-gray-700",
};

export default function SafrasPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const navigate = useNavigate();
  const [safras, setSafras] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({ nome: `Safra ${currentYear}/${currentYear + 1}`, data_inicio: "", data_fim: "", status: "planejamento" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("safras" as any).select("*").eq("user_id", effectiveUserId).order("created_at", { ascending: false });
    const safrasList = (data as any[]) || [];
    // Load talhão counts
    for (const s of safrasList) {
      const { count } = await supabase.from("safra_talhoes" as any).select("*, talhoes:talhao_id(area_hectares)", { count: "exact" }).eq("safra_id", s.id).eq("user_id", effectiveUserId);
      s._talhoes = count || 0;
    }
    setSafras(safrasList);
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user || !form.nome.trim()) return;
    await supabase.from("safras" as any).insert({ nome: form.nome.trim(), data_inicio: form.data_inicio || null, data_fim: form.data_fim || null, status: form.status, user_id: user.id } as any);
    toast.success("Safra criada!"); setOpen(false); load();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Safras</h1>
        <Button onClick={() => { setForm({ nome: `Safra ${currentYear}/${currentYear + 1}`, data_inicio: "", data_fim: "", status: "planejamento" }); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Safra</Button>
      </div>

      <div className="space-y-4">
        {safras.map((s: any) => (
          <Card key={s.id} className="border-[#E5E7EB] hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/lavoura/safras/${s.id}`)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <h3 className="text-xl font-semibold text-foreground">{s.nome}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[s.status] || statusBadge.planejamento}`}>
                    {s.status === "andamento" ? "Em andamento" : s.status === "finalizada" ? "Finalizada" : "Planejamento"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{s._talhoes || 0} talhões</span>
                  {s.data_inicio && <span>{new Date(s.data_inicio + "T12:00:00").toLocaleDateString("pt-BR")} — {s.data_fim ? new Date(s.data_fim + "T12:00:00").toLocaleDateString("pt-BR") : "..."}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {safras.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma safra cadastrada.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Safra</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Início</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Data Fim</Label><Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejamento">Planejamento</SelectItem>
                  <SelectItem value="andamento">Em andamento</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!form.nome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
