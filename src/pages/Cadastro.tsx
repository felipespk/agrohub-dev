import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { produtoresMock, tiposGraoMock, compradoresMock } from "@/data/mock-data";
import { Produtor, TipoGrao, Comprador } from "@/types";
import { UserPlus, Wheat, ShoppingCart, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CadastroPage() {
  const [produtores, setProdutores] = useState<Produtor[]>(produtoresMock);
  const [tiposGrao, setTiposGrao] = useState<TipoGrao[]>(tiposGraoMock);
  const [compradores, setCompradores] = useState<Comprador[]>(compradoresMock);

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
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [contato, setContato] = useState("");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    setProdutores(prev => [...prev, { id: crypto.randomUUID(), nome: nome.trim(), cpfCnpj: cpfCnpj.trim(), contato: contato.trim() }]);
    toast.success("Produtor cadastrado!");
    setNome(""); setCpfCnpj(""); setContato(""); setOpen(false);
  };

  const handleDelete = (id: string) => {
    setProdutores(prev => prev.filter(p => p.id !== id));
    toast.success("Produtor removido.");
  };

  return (
    <div className="form-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" /> Produtores
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Produtor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Produtor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do produtor" /></div>
              <div className="space-y-2"><Label>CPF/CNPJ</Label><Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" /></div>
              <div className="space-y-2"><Label>Contato</Label><Input value={contato} onChange={e => setContato(e.target.value)} placeholder="(00) 00000-0000" /></div>
              <Button onClick={handleAdd} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF/CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtores.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell className="font-mono text-sm">{p.cpfCnpj}</TableCell>
                <TableCell>{p.contato}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
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
    toast.success("Tipo de grão cadastrado!");
    setNome(""); setUmidade("12"); setOpen(false);
  };

  const handleDelete = (id: string) => {
    setTiposGrao(prev => prev.filter(t => t.id !== id));
    toast.success("Tipo de grão removido.");
  };

  return (
    <div className="form-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
          <Wheat className="h-5 w-5 text-primary" /> Tipos de Grão
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Tipo</Button>
          </DialogTrigger>
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
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Grão</TableHead>
              <TableHead>Umidade Padrão</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiposGrao.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell>{t.umidadePadrao}%</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
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
    toast.success("Comprador cadastrado!");
    setNome(""); setContato(""); setOpen(false);
  };

  const handleDelete = (id: string) => {
    setCompradores(prev => prev.filter(c => c.id !== id));
    toast.success("Comprador removido.");
  };

  return (
    <div className="form-section space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg text-foreground flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" /> Compradores
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Novo Comprador</Button>
          </DialogTrigger>
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
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {compradores.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.contato}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
