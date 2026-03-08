import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/contexts/AppContext";
import { Produtor, TipoGrao, Comprador } from "@/types";
import { UserPlus, Wheat, ShoppingCart, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CadastroPage() {
  const { produtores, setProdutores, tiposGrao, setTiposGrao, compradores, setCompradores } = useAppData();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-primary" />
          <h1 className="page-title">Cadastro</h1>
        </div>
        <p className="page-subtitle">Gerencie produtores, tipos de grão e compradores</p>
      </div>

      <Tabs defaultValue="produtores" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="produtores">Produtores</TabsTrigger>
          <TabsTrigger value="graos">Tipos de Grão</TabsTrigger>
          <TabsTrigger value="compradores">Compradores</TabsTrigger>
        </TabsList>

        <TabsContent value="produtores">
          <ProdutoresTab produtores={produtores} setProdutores={setProdutores} />
        </TabsContent>
        <TabsContent value="graos">
          <TiposGraoTab tiposGrao={tiposGrao} setTiposGrao={setTiposGrao} />
        </TabsContent>
        <TabsContent value="compradores">
          <CompradoresTab compradores={compradores} setCompradores={setCompradores} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProdutoresTab({ produtores, setProdutores }: { produtores: Produtor[]; setProdutores: React.Dispatch<React.SetStateAction<Produtor[]>> }) {
  const [tipoDocumento, setTipoDocumento] = useState<"CPF" | "CNPJ">("CPF");
  const [documento, setDocumento] = useState("");
  const [nome, setNome] = useState("");
  const [fazenda, setFazenda] = useState("");
  const [enderecoFazenda, setEnderecoFazenda] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [telefone, setTelefone] = useState("");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!nome.trim() || !documento.trim()) { toast.error("Nome e Documento são obrigatórios."); return; }
    setProdutores(prev => [...prev, {
      id: crypto.randomUUID(), tipoDocumento, documento: documento.trim(), nome: nome.trim(),
      fazenda: fazenda.trim(), enderecoFazenda: enderecoFazenda.trim(), cidade: cidade.trim(),
      estado: estado.trim(), inscricaoEstadual: inscricaoEstadual.trim(), telefone: telefone.trim(),
    }]);
    toast.success("Produtor cadastrado!");
    setTipoDocumento("CPF"); setDocumento(""); setNome(""); setFazenda("");
    setEnderecoFazenda(""); setCidade(""); setEstado(""); setInscricaoEstadual(""); setTelefone("");
    setOpen(false);
  };

  const handleDelete = (id: string) => { setProdutores(prev => prev.filter(p => p.id !== id)); toast.success("Produtor removido."); };

  return (
    <div className="form-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" /> Produtores
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Produtor</Button></DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>Novo Produtor</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de Documento *</Label>
                <Select value={tipoDocumento} onValueChange={(v: "CPF" | "CNPJ") => setTipoDocumento(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="CPF">CPF</SelectItem><SelectItem value="CNPJ">CNPJ</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Documento *</Label><Input value={documento} onChange={e => setDocumento(e.target.value)} placeholder={tipoDocumento === "CPF" ? "000.000.000-00" : "00.000.000/0001-00"} /></div>
              <div className="space-y-2"><Label>Nome do Produtor *</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" /></div>
              <div className="space-y-2"><Label>Fazenda</Label><Input value={fazenda} onChange={e => setFazenda(e.target.value)} placeholder="Nome da propriedade" /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Endereço da Fazenda</Label><Input value={enderecoFazenda} onChange={e => setEnderecoFazenda(e.target.value)} placeholder="Estrada, Km, etc." /></div>
              <div className="space-y-2"><Label>Cidade</Label><Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" /></div>
              <div className="space-y-2"><Label>Estado (UF)</Label><Input value={estado} onChange={e => setEstado(e.target.value)} placeholder="RS" maxLength={2} className="uppercase" /></div>
              <div className="space-y-2"><Label>Inscrição Estadual</Label><Input value={inscricaoEstadual} onChange={e => setInscricaoEstadual(e.target.value)} placeholder="000/0000000" /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" /></div>
            </div>
            <Button onClick={handleAdd} className="w-full mt-2">Salvar</Button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Documento</TableHead><TableHead>Fazenda</TableHead><TableHead>Cidade/UF</TableHead><TableHead>Telefone</TableHead><TableHead className="w-20">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {[...produtores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="font-mono text-sm">{p.tipoDocumento}: {p.documento}</TableCell>
                <TableCell>{p.fazenda}</TableCell>
                <TableCell>{p.cidade}{p.estado ? `/${p.estado}` : ""}</TableCell>
                <TableCell>{p.telefone}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TiposGraoTab({ tiposGrao, setTiposGrao }: { tiposGrao: TipoGrao[]; setTiposGrao: React.Dispatch<React.SetStateAction<TipoGrao[]>> }) {
  const [nome, setNome] = useState("");
  const [umidade, setUmidade] = useState("12");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    setTiposGrao(prev => [...prev, { id: crypto.randomUUID(), nome: nome.trim(), umidadePadrao: parseFloat(umidade) || 12 }]);
    toast.success("Tipo de grão cadastrado!"); setNome(""); setUmidade("12"); setOpen(false);
  };
  const handleDelete = (id: string) => { setTiposGrao(prev => prev.filter(t => t.id !== id)); toast.success("Tipo de grão removido."); };

  return (
    <div className="form-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2"><Wheat className="h-5 w-5 text-primary" /> Tipos de Grão</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Tipo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Tipo de Grão</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome do Grão *</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Arroz Longo Fino" /></div>
              <div className="space-y-2"><Label>Umidade Padrão (%)</Label><Input type="number" value={umidade} onChange={e => setUmidade(e.target.value)} /></div>
              <Button onClick={handleAdd} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Nome do Grão</TableHead><TableHead>Umidade Padrão</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {[...tiposGrao].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell>{t.umidadePadrao}%</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CompradoresTab({ compradores, setCompradores }: { compradores: Comprador[]; setCompradores: React.Dispatch<React.SetStateAction<Comprador[]>> }) {
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    setCompradores(prev => [...prev, { id: crypto.randomUUID(), nome: nome.trim(), contato: contato.trim() }]);
    toast.success("Comprador cadastrado!"); setNome(""); setContato(""); setOpen(false);
  };
  const handleDelete = (id: string) => { setCompradores(prev => prev.filter(c => c.id !== id)); toast.success("Comprador removido."); };

  return (
    <div className="form-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Compradores</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Comprador</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Comprador</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do comprador" /></div>
              <div className="space-y-2"><Label>Contato</Label><Input value={contato} onChange={e => setContato(e.target.value)} placeholder="(00) 00000-0000" /></div>
              <Button onClick={handleAdd} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Contato</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {compradores.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.contato}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
