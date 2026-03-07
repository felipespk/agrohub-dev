import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { compradoresMock, saidasMock } from "@/data/mock-data";
import { Saida } from "@/types";
import { ArrowUpFromLine, Save } from "lucide-react";
import { toast } from "sonner";

export default function SaidaVendaPage() {
  const [saidas, setSaidas] = useState<Saida[]>(saidasMock.filter(s => s.tipo === "venda"));
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [placa, setPlaca] = useState("");
  const [compradorId, setCompradorId] = useState("");
  const [classificacao, setClassificacao] = useState("");
  const [kgsExpedidos, setKgsExpedidos] = useState("");

  const handleSalvar = () => {
    if (!placa || !compradorId || !kgsExpedidos) {
      toast.error("Preencha Placa, Comprador e Kgs Expedidos.");
      return;
    }
    const comprador = compradoresMock.find(c => c.id === compradorId);
    const nova: Saida = {
      id: crypto.randomUUID(),
      data,
      placaCaminhao: placa.toUpperCase(),
      compradorId,
      compradorNome: comprador?.nome || "",
      classificacao,
      kgsExpedidos: parseFloat(kgsExpedidos),
      tipo: "venda",
      createdAt: new Date().toISOString(),
    };
    setSaidas(prev => [nova, ...prev]);
    toast.success(`Saída registrada! ${parseFloat(kgsExpedidos).toLocaleString("pt-BR")} Kg expedidos.`);
    setPlaca(""); setCompradorId(""); setClassificacao(""); setKgsExpedidos("");
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <ArrowUpFromLine className="h-6 w-6 text-primary" />
          <h1 className="page-title">Saída (Venda)</h1>
        </div>
        <p className="page-subtitle">Registre saídas destinadas a compradores</p>
      </div>

      <div className="form-section space-y-5">
        <h2 className="font-display font-semibold text-lg text-foreground">Nova Saída de Venda</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Placa do Caminhão *</Label>
            <Input placeholder="ABC-1234" value={placa} onChange={e => setPlaca(e.target.value)} className="uppercase" />
          </div>
          <div className="space-y-2">
            <Label>Comprador *</Label>
            <Select value={compradorId} onValueChange={setCompradorId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {compradoresMock.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Classificação</Label>
            <Input placeholder="Ex: 71/61" value={classificacao} onChange={e => setClassificacao(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Kgs Expedidos *</Label>
            <Input type="number" placeholder="15000" value={kgsExpedidos} onChange={e => setKgsExpedidos(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSalvar} className="gap-2">
          <Save className="h-4 w-4" /> Salvar Saída
        </Button>
      </div>

      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Últimas Saídas (Venda)</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead className="text-right">Kgs Expedidos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saidas.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono">{s.placaCaminhao}</TableCell>
                  <TableCell>{s.compradorNome}</TableCell>
                  <TableCell>{s.classificacao}</TableCell>
                  <TableCell className="text-right font-semibold">{s.kgsExpedidos.toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
