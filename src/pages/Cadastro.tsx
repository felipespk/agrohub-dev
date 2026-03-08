import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData, Produtor, TipoGrao, Comprador } from "@/contexts/AppContext";
import { UserPlus, Wheat, ShoppingCart, Plus, Trash2, Edit2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CadastroPage() {
  const ctx = useAppData();
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2"><UserPlus className="h-6 w-6 text-primary" /><h1 className="page-title">Cadastro</h1></div>
        <p className="page-subtitle">Gerencie produtores, tipos de grão e compradores</p>
      </div>
      <Tabs defaultValue="produtores" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="produtores">Produtores</TabsTrigger>
          <TabsTrigger value="graos">Tipos de Grão</TabsTrigger>
          <TabsTrigger value="compradores">Compradores</TabsTrigger>
        </TabsList>
        <TabsContent value="produtores"><ProdutoresTab ctx={ctx} /></TabsContent>
        <TabsContent value="graos"><TiposGraoTab ctx={ctx} /></TabsContent>
        <TabsContent value="compradores"><CompradoresTab ctx={ctx} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProdutoresTab({ ctx }: { ctx: ReturnType<typeof useAppData> }) {
  const { produtores, addProdutor, updateProdutor, deleteProdutor } = ctx;
  const [tipoDocumento, setTipoDocumento] = useState("CPF");
  const [documento, setDocumento] = useState("");
  const [nome, setNome] = useState("");
  const [fazenda, setFazenda] = useState("");
  const [enderecoFazenda, setEnderecoFazenda] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [telefone, setTelefone] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const clearForm = () => {
    setTipoDocumento("CPF"); setDocumento(""); setNome(""); setFazenda("");
    setEnderecoFazenda(""); setCidade(""); setEstado(""); setInscricaoEstadual(""); setTelefone("");
    setEditingId(null);
  };

  const handleEdit = (p: Produtor) => {
    setTipoDocumento(p.tipo_documento); setDocumento(p.documento); setNome(p.nome);
    setFazenda(p.fazenda); setEnderecoFazenda(p.endereco_fazenda); setCidade(p.cidade);
    setEstado(p.estado); setInscricaoEstadual(p.inscricao_estadual); setTelefone(p.telefone);
    setEditingId(p.id); setOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !documento.trim()) { toast.error("Nome e Documento são obrigatórios."); return; }
    const data = {
      tipo_documento: tipoDocumento, documento: documento.trim(), nome: nome.trim(),
      fazenda: fazenda.trim(), endereco_fazenda: enderecoFazenda.trim(), cidade: cidade.trim(),
      estado: estado.trim(), inscricao_estadual: inscricaoEstadual.trim(), telefone: telefone.trim(),
    };
    if (editingId) {
      const ok = await updateProdutor(editingId, data);
      if (ok) { toast.success("Produtor atualizado!"); clearForm(); setOpen(false); }
    } else {
      const row = await addProdutor(data);
      if (row) { toast.success("Produtor cadastrado!"); setOpen(false); }
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteProdutor(id);
    if (ok) toast.success("Produtor removido.");
  };

  return (
    <div className="form-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Produtores</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) clearForm(); }}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Produtor</Button></DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>{editingId ? "Editar Produtor" : "Novo Produtor"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de Documento *</Label>
                <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="CPF">CPF</SelectItem><SelectItem value="CNPJ">CNPJ</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Documento *</Label><Input value={documento} onChange={e => setDocumento(e.target.value)} placeholder={tipoDocumento === "CPF" ? "000.000.000-00" : "00.000.000/0001-00"} /></div>
              <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" /></div>
              <div className="space-y-2"><Label>Fazenda</Label><Input value={fazenda} onChange={e => setFazenda(e.target.value)} placeholder="Nome da propriedade" /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Endereço da Fazenda</Label><Input value={enderecoFazenda} onChange={e => setEnderecoFazenda(e.target.value)} placeholder="Estrada, Km, etc." /></div>
              <div className="space-y-2"><Label>Cidade</Label><Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" /></div>
              <div className="space-y-2"><Label>Estado (UF)</Label><Input value={estado} onChange={e => setEstado(e.target.value)} placeholder="RS" maxLength={2} className="uppercase" /></div>
              <div className="space-y-2"><Label>Inscrição Estadual</Label><Input value={inscricaoEstadual} onChange={e => setInscricaoEstadual(e.target.value)} placeholder="000/0000000" /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button onClick={handleSave} className={`flex-1 gap-2 ${editingId ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
                <Save className="h-4 w-4" /> {editingId ? "Atualizar Registro" : "Salvar"}
              </Button>
              {editingId && <Button variant="outline" onClick={() => { clearForm(); setOpen(false); }} className="gap-2"><X className="h-4 w-4" /> Cancelar</Button>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Documento</TableHead><TableHead>Fazenda</TableHead><TableHead>Cidade/UF</TableHead><TableHead>Telefone</TableHead><TableHead className="w-24">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {produtores.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="font-mono text-sm">{p.tipo_documento}: {p.documento}</TableCell>
                <TableCell>{p.fazenda}</TableCell>
                <TableCell>{p.cidade}{p.estado ? `/${p.estado}` : ""}</TableCell>
                <TableCell>{p.telefone}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} className="text-amber-600 hover:text-amber-700"><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TiposGraoTab({ ctx }: { ctx: ReturnType<typeof useAppData> }) {
  const { tiposGrao, addTipoGrao, updateTipoGrao, deleteTipoGrao } = ctx;
  const [nome, setNome] = useState("");
  const [umidade, setUmidade] = useState("12");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const clearForm = () => { setNome(""); setUmidade("12"); setEditingId(null); };

  const handleEdit = (t: TipoGrao) => {
    setNome(t.nome); setUmidade(String(t.umidade_padrao)); setEditingId(t.id); setOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (editingId) {
      const ok = await updateTipoGrao(editingId, { nome: nome.trim(), umidade_padrao: parseFloat(umidade) || 12 });
      if (ok) { toast.success("Tipo de grão atualizado!"); clearForm(); setOpen(false); }
    } else {
      const row = await addTipoGrao({ nome: nome.trim(), umidade_padrao: parseFloat(umidade) || 12 });
      if (row) { toast.success("Tipo de grão cadastrado!"); setOpen(false); }
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteTipoGrao(id);
    if (ok) toast.success("Tipo de grão removido.");
  };

  return (
    <div className="form-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2"><Wheat className="h-5 w-5 text-primary" /> Tipos de Grão</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) clearForm(); }}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Tipo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Editar Tipo de Grão" : "Novo Tipo de Grão"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome do Grão *</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Arroz Longo Fino" /></div>
              <div className="space-y-2"><Label>Umidade Padrão (%)</Label><Input type="number" value={umidade} onChange={e => setUmidade(e.target.value)} /></div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className={`flex-1 gap-2 ${editingId ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
                  <Save className="h-4 w-4" /> {editingId ? "Atualizar Registro" : "Salvar"}
                </Button>
                {editingId && <Button variant="outline" onClick={() => { clearForm(); setOpen(false); }} className="gap-2"><X className="h-4 w-4" /> Cancelar</Button>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Nome do Grão</TableHead><TableHead>Umidade Padrão</TableHead><TableHead className="w-24">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {tiposGrao.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell>{t.umidade_padrao}%</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(t)} className="text-amber-600 hover:text-amber-700"><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CompradoresTab({ ctx }: { ctx: ReturnType<typeof useAppData> }) {
  const { compradores, addComprador, updateComprador, deleteComprador } = ctx;
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const clearForm = () => { setNome(""); setContato(""); setEditingId(null); };

  const handleEdit = (c: Comprador) => {
    setNome(c.nome); setContato(c.contato || ""); setEditingId(c.id); setOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (editingId) {
      const ok = await updateComprador(editingId, { nome: nome.trim(), contato: contato.trim() });
      if (ok) { toast.success("Comprador atualizado!"); clearForm(); setOpen(false); }
    } else {
      const row = await addComprador({ nome: nome.trim(), contato: contato.trim() });
      if (row) { toast.success("Comprador cadastrado!"); setOpen(false); }
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteComprador(id);
    if (ok) toast.success("Comprador removido.");
  };

  return (
    <div className="form-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Compradores</h2>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) clearForm(); }}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Comprador</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Editar Comprador" : "Novo Comprador"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do comprador" /></div>
              <div className="space-y-2"><Label>Contato</Label><Input value={contato} onChange={e => setContato(e.target.value)} placeholder="(00) 00000-0000" /></div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className={`flex-1 gap-2 ${editingId ? "bg-amber-600 hover:bg-amber-700" : ""}`}>
                  <Save className="h-4 w-4" /> {editingId ? "Atualizar Registro" : "Salvar"}
                </Button>
                {editingId && <Button variant="outline" onClick={() => { clearForm(); setOpen(false); }} className="gap-2"><X className="h-4 w-4" /> Cancelar</Button>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Contato</TableHead><TableHead className="w-24">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {compradores.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.contato}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} className="text-amber-600 hover:text-amber-700"><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
