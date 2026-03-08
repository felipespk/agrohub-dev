export interface Produtor {
  id: string;
  tipoDocumento: "CPF" | "CNPJ";
  documento: string;
  nome: string;
  fazenda: string;
  enderecoFazenda: string;
  cidade: string;
  estado: string;
  inscricaoEstadual: string;
  telefone: string;
}

export interface TipoGrao {
  id: string;
  nome: string;
  umidadePadrao: number;
}

export interface Comprador {
  id: string;
  nome: string;
  contato: string;
}

export interface Recebimento {
  id: string;
  data: string;
  placaCaminhao: string;
  produtorId: string;
  produtorNome: string;
  tipoGraoId: string;
  tipoGraoNome: string;
  pesoBruto: number;
  umidadeInicial: number;
  umidadeFinalAlvo: number;
  impureza: number;
  descontoUmidadePercent: number;
  descontoUmidadeKg: number;
  descontoImpurezaKg: number;
  pesoLiquido: number;
  createdAt: string;
}

export type CategoriaSaida = 'Venda' | 'Transferência' | 'Devolução' | 'Outros';

export interface Saida {
  id: string;
  data: string;
  placaCaminhao: string;
  compradorId: string;
  compradorNome: string;
  classificacao: string;
  kgsExpedidos: number;
  categoria: CategoriaSaida;
  createdAt: string;
}

export interface Armazenamento {
  id: string;
  periodo: string;
  toneladasArmazenadas: number;
  quantidadeSacos: number;
  valorUnitario: number;
  total: number;
  status: 'pago' | 'pendente';
}

export interface QuebraTecnica {
  id: string;
  data: string;
  kgAjuste: number;
  justificativa: string;
}
