import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Saida } from "@/types";
import { ArrowRightLeft, Save } from "lucide-react";
import { toast } from "sonner";

const finalidades = ["Transferência", "Devolução", "Consumo Interno", "Amostra", "Outros"];

export default function SaidaGeralPage() {
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [placa, setPlaca] = useState("");
  const [classificacao, setClassificacao] = useState("");
  const [kgsExpedidos, setKgsExpedidos] = useState("");
  const [finalidade, setFinalidade] = useState("");

  const handleSalvar = () => {
    if (!placa || !kgsExpedidos || !finalidade) {
      toast.error("Preencha Placa, Kgs e Finalidade.");
      return;
    }
    const nova: Saida = {
      id: crypto.randomUUID(),
      data,
      placaCaminhao: placa.toUpperCase(),
      compradorId: "",
      compradorNome: finalidade,
      classificacao,
      kgsExpedidos: parseFloat(kgsExpedidos),
      tipo: "geral",
      createdAt: new Date().toISOString(),
    };
    setSaidas(prev => [nova, ...prev]);
    toast.success(`Saída geral registrada! ${parseFloat(kgsExpedidos).toLocaleString("pt-BR")} Kg.`);
    setPlaca(""); setClassificacao(""); setKgsExpedidos(""); setFinalidade("");
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-6 w-6 text-primary" />
          <h1 className="page-title">Saída Geral</h1>
        </div>
        <p className="page-subtitle">Transferências, devoluções e outras saídas</p>
      </div>

      <div className="form-section space-y-5">
        <h2 className="font-display font-semibold text-lg text-foreground">Nova Saída Geral</h2>
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
            <Label>Finalidade *</Label>
            <Select value={finalidade} onValueChange={setFinalidade}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {finalidades.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
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
            <Input type="number" placeholder="10000" value={kgsExpedidos} onChange={e => setKgsExpedidos(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSalvar} className="gap-2">
          <Save className="h-4 w-4" /> Salvar Saída
        </Button>
      </div>

      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Saídas Gerais Registradas</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Finalidade</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead className="text-right">Kgs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saidas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma saída geral registrada.</TableCell></TableRow>
              ) : saidas.map(s => (
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
