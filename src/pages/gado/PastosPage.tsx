import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function PastosPage() {
  const { user } = useAuth();
  const [pastos, setPastos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [openPasto, setOpenPasto] = useState(false);
  const [openLote, setOpenLote] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formPasto, setFormPasto] = useState({ nome: "", area_hectares: "", capacidade_cabecas: "" });
  const [formLote, setFormLote] = useState({ nome: "", pasto_id: "" });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [p, l, a] = await Promise.all([
      supabase.from("pastos" as any).select("*").eq("user_id", user.id).order("nome"),
      supabase.from("lotes" as any).select("*").eq("user_id", user.id).order("nome"),
      supabase.from("animais" as any).select("id, brinco, nome, categoria, peso_atual, pasto_id, lote_id").eq("user_id", user.id).eq("status", "ativo"),
    ]);
    setPastos((p.data as any) || []);
    setLotes((l.data as any) || []);
    setAnimais((a.data as any) || []);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSavePasto = async () => {
    if (!user || !formPasto.nome.trim()) return;
    await supabase.from("pastos" as any).insert({
      nome: formPasto.nome.trim(), area_hectares: formPasto.area_hectares ? parseFloat(formPasto.area_hectares) : null,
      capacidade_cabecas: formPasto.capacidade_cabecas ? parseInt(formPasto.capacidade_cabecas) : null, user_id: user.id,
    } as any);
    toast.success("Pasto criado!"); setOpenPasto(false); setFormPasto({ nome: "", area_hectares: "", capacidade_cabecas: "" }); fetchAll();
  };

  const handleSaveLote = async () => {
    if (!user || !formLote.nome.trim()) return;
    await supabase.from("lotes" as any).insert({
      nome: formLote.nome.trim(), pasto_id: formLote.pasto_id || null, user_id: user.id,
    } as any);
    toast.success("Lote criado!"); setOpenLote(false); setFormLote({ nome: "", pasto_id: "" }); fetchAll();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Pastos e Lotes</h1>
        <div className="flex gap-3">
          <Button onClick={() => setOpenPasto(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo Pasto</Button>
          <Button variant="outline" onClick={() => setOpenLote(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo Lote</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pastos.map(p => {
          const animaisPasto = animais.filter(a => a.pasto_id === p.id);
          const count = animaisPasto.length;
          const cap = p.capacidade_cabecas || 0;
          const pct = cap > 0 ? (count / cap) * 100 : 0;
          const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-500";
          const isExpanded = expanded === p.id;
          const lotesPasto = lotes.filter(l => l.pasto_id === p.id);

          return (
            <Card key={p.id} className="border-[#E5E7EB] cursor-pointer" onClick={() => setExpanded(isExpanded ? null : p.id)}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />{p.nome}</div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
                {p.area_hectares && <p className="text-sm text-muted-foreground">{Number(p.area_hectares).toFixed(1)} ha</p>}
              </CardHeader>
              <CardContent className="space-y-2">
                {cap > 0 && (
                  <>
                    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-sm text-muted-foreground">{count} / {cap} cabeças</p>
                  </>
                )}
                {cap === 0 && <p className="text-sm text-muted-foreground">{count} cabeças</p>}

                {isExpanded && (
                  <div className="mt-4 space-y-3" onClick={e => e.stopPropagation()}>
                    {lotesPasto.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Lotes</p>
                        <div className="flex flex-wrap gap-2">
                          {lotesPasto.map(l => <span key={l.id} className="px-2 py-1 text-xs rounded bg-muted">{l.nome}</span>)}
                        </div>
                      </div>
                    )}
                    {animaisPasto.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Animais</p>
                        <table className="w-full text-xs">
                          <thead><tr className="text-left text-muted-foreground"><th className="pb-1">Brinco</th><th className="pb-1">Nome</th><th className="pb-1">Cat.</th><th className="pb-1">Peso</th></tr></thead>
                          <tbody>
                            {animaisPasto.slice(0, 10).map(a => (
                              <tr key={a.id} className="border-t">
                                <td className="py-1 font-mono">{a.brinco}</td>
                                <td className="py-1">{a.nome || "—"}</td>
                                <td className="py-1">{a.categoria}</td>
                                <td className="py-1">{a.peso_atual ? `${Number(a.peso_atual).toFixed(0)} kg` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {animaisPasto.length > 10 && <p className="text-xs text-muted-foreground mt-1">...e mais {animaisPasto.length - 10}</p>}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {pastos.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">Nenhum pasto cadastrado</p>}
      </div>

      <Dialog open={openPasto} onOpenChange={setOpenPasto}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Pasto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formPasto.nome} onChange={e => setFormPasto({ ...formPasto, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Área (hectares)</Label><Input type="number" value={formPasto.area_hectares} onChange={e => setFormPasto({ ...formPasto, area_hectares: e.target.value })} /></div>
            <div className="space-y-2"><Label>Capacidade (cabeças)</Label><Input type="number" value={formPasto.capacidade_cabecas} onChange={e => setFormPasto({ ...formPasto, capacidade_cabecas: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenPasto(false)}>Cancelar</Button><Button onClick={handleSavePasto}>Salvar</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={openLote} onOpenChange={setOpenLote}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formLote.nome} onChange={e => setFormLote({ ...formLote, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Pasto</Label>
              <Select value={formLote.pasto_id || "__none__"} onValueChange={v => setFormLote({ ...formLote, pasto_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenLote(false)}>Cancelar</Button><Button onClick={handleSaveLote}>Salvar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
