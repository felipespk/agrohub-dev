import { Produtor, TipoGrao, Comprador, Recebimento, Saida } from "@/types";

export const produtoresMock: Produtor[] = [
  { id: "1", nome: "João da Silva", cpfCnpj: "123.456.789-00", contato: "(51) 99999-0001" },
  { id: "2", nome: "Maria Oliveira", cpfCnpj: "987.654.321-00", contato: "(51) 99999-0002" },
  { id: "3", nome: "Fazenda Boa Vista Ltda", cpfCnpj: "12.345.678/0001-90", contato: "(51) 99999-0003" },
];

export const tiposGraoMock: TipoGrao[] = [
  { id: "1", nome: "Arroz Longo Fino", umidadePadrao: 12 },
  { id: "2", nome: "Arroz Médio", umidadePadrao: 12 },
  { id: "3", nome: "Arroz Cateto", umidadePadrao: 13 },
];

export const compradoresMock: Comprador[] = [
  { id: "1", nome: "Beneficiadora Sul", contato: "(51) 3333-0001" },
  { id: "2", nome: "Cooperativa Central", contato: "(51) 3333-0002" },
];

export const recebimentosMock: Recebimento[] = [
  {
    id: "1", data: "2026-03-01", placaCaminhao: "ABC-1234", produtorId: "1", produtorNome: "João da Silva",
    tipoGraoId: "1", tipoGraoNome: "Arroz Longo Fino", pesoBruto: 30000, umidadeInicial: 18, umidadeFinalAlvo: 12,
    impureza: 2, descontoUmidadePercent: 7.8, descontoUmidadeKg: 2340, descontoImpurezaKg: 600, pesoLiquido: 27060, createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "2", data: "2026-03-03", placaCaminhao: "XYZ-5678", produtorId: "2", produtorNome: "Maria Oliveira",
    tipoGraoId: "2", tipoGraoNome: "Arroz Médio", pesoBruto: 25000, umidadeInicial: 15, umidadeFinalAlvo: 12,
    impureza: 1.5, descontoUmidadePercent: 3.9, descontoUmidadeKg: 975, descontoImpurezaKg: 375, pesoLiquido: 23650, createdAt: "2026-03-03T14:00:00Z",
  },
];

export const saidasMock: Saida[] = [
  {
    id: "1", data: "2026-03-05", placaCaminhao: "DEF-9012", compradorId: "1", compradorNome: "Beneficiadora Sul",
    classificacao: "71/61", kgsExpedidos: 15000, tipo: "venda", createdAt: "2026-03-05T08:00:00Z",
  },
];
