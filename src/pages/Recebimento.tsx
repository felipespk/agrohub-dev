import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppContext";
import { Recebimento } from "@/types";
import { ArrowDownToLine, Calculator, Save } from "lucide-react";
import { toast } from "sonner";

export default function RecebimentoPage() {
  const { produtores, tiposGrao, recebimentos, setRecebimentos } = useAppData();

  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [placa, setPlaca] = useState("");
  const [produtorId, setProdutorId] = useState("");
  const [tipoGraoId, setTipoGraoId] = useState("");
  const [pesoBruto, setPesoBruto] = useState("");
  const [umidadeInicial, setUmidadeInicial] = useState("");
  const [impureza, setImpureza] = useState("");
  const umidadeFinalAlvo = 12;

  const calculos = useMemo(() => {
    const peso = parseFloat(pesoBruto) || 0;
    const umidade = parseFloat(umidadeInicial) || 0;
    const imp = parseFloat(impureza) || 0;
    const descontoUmidadePercent = umidade > 12 ? (umidade - 12) * 1.3 : 0;
    const descontoUmidadeKg = peso * (descontoUmidadePercent / 100);
    const descontoImpurezaKg = peso * (imp / 100);
    const pesoLiquido = Math.max(0, peso - descontoUmidadeKg - descontoImpurezaKg);
    return { descontoUmidadePercent, descontoUmidadeKg, descontoImpurezaKg, pesoLiquido };
  }, [pesoBruto, umidadeInicial, impureza]);

  const handleSalvar = () => {
    if (!placa || !produtorId || !tipoGraoId || !pesoBruto || !umidadeInicial) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const produtor = produtores.find((p) => p.id === produtorId);
    const tipoGrao = tiposGrao.find((t) => t.id === tipoGraoId);
    const novo: Recebimento = {
      id: crypto.randomUUID(), data, placaCaminhao: placa.toUpperCase(),
      produtorId, produtorNome: produtor?.nome || "", tipoGraoId, tipoGraoNome: tipoGrao?.nome || "",
      pesoBruto: parseFloat(pesoBruto), umidadeInicial: parseFloat(umidadeInicial), umidadeFinalAlvo,
      impureza: parseFloat(impureza) || 0, ...calculos, createdAt: new Date().toISOString(),
    };
    setRecebimentos((prev) => [novo, ...prev]);
    toast.success(`Entrada salva! Peso líquido: ${calculos.pesoLiquido.toFixed(0)} Kg`);
    setPlaca(""); setProdutorId(""); setTipoGraoId(""); setPesoBruto(""); setUmidadeInicial(""); setImpureza("");
  };

  const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="h-6 w-6 text-primary" />
          <h1 className="page-title">Recebimento de Arroz</h1>
        </div>
        <p className="page-subtitle">Registre a entrada de grãos com cálculos automáticos de secagem</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 form-section space-y-5">
          <h2 className="font-display font-semibold text-lg text-foreground">Nova Entrada</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="placa">Placa do Caminhão *</Label>
              <Input id="placa" placeholder="ABC-1234" value={placa} onChange={(e) => setPlaca(e.target.value)} className="uppercase" />
            </div>
            <div className="space-y-2">
              <Label>Produtor *</Label>
              <Select value={produtorId} onValueChange={setProdutorId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {[...produtores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Grão *</Label>
              <Select value={tipoGraoId} onValueChange={setTipoGraoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {[...tiposGrao].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pesoBruto">Peso Bruto (Kg) *</Label>
              <Input id="pesoBruto" type="number" placeholder="30000" value={pesoBruto} onChange={(e) => setPesoBruto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="umidade">Umidade Inicial (%) *</Label>
              <Input id="umidade" type="number" step="0.1" placeholder="18" value={umidadeInicial} onChange={(e) => setUmidadeInicial(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impureza">Impureza (%)</Label>
              <Input id="impureza" type="number" step="0.1" placeholder="2" value={impureza} onChange={(e) => setImpureza(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Umidade Final Alvo</Label>
              <Input value="12%" disabled className="bg-muted" />
            </div>
          </div>
          <Button onClick={handleSalvar} className="w-full sm:w-auto gap-2">
            <Save className="h-4 w-4" /> Salvar Entrada
          </Button>
        </div>

        <div className="results-section space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-lg text-foreground">Resultados</h2>
          </div>
          <p className="text-xs text-muted-foreground">Cálculos em tempo real conforme preenchimento</p>
          <div className="space-y-3">
            <ResultCard label="Desconto de Umidade" value={`${fmt(calculos.descontoUmidadePercent)}%`} />
            <ResultCard label="Kg Descontados (Umidade)" value={`${fmt(calculos.descontoUmidadeKg)} Kg`} />
            <ResultCard label="Kg Descontados (Impureza)" value={`${fmt(calculos.descontoImpurezaKg)} Kg`} />
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
              <p className="text-xs text-muted-foreground">Peso Líquido / Seco</p>
              <p className="text-2xl font-display font-bold text-primary">{fmt(calculos.pesoLiquido)} Kg</p>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Últimos Recebimentos</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Produtor</TableHead>
                <TableHead>Grão</TableHead>
                <TableHead className="text-right">Peso Bruto</TableHead>
                <TableHead className="text-right">Umidade</TableHead>
                <TableHead className="text-right">Desc. Umid.</TableHead>
                <TableHead className="text-right">Peso Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recebimentos.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono">{r.placaCaminhao}</TableCell>
                  <TableCell>{r.produtorNome}</TableCell>
                  <TableCell>{r.tipoGraoNome}</TableCell>
                  <TableCell className="text-right">{r.pesoBruto.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{r.umidadeInicial}%</TableCell>
                  <TableCell className="text-right">{fmt(r.descontoUmidadePercent)}%</TableCell>
                  <TableCell className="text-right font-semibold">{r.pesoLiquido.toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
