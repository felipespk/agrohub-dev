/** Remove tudo que não for dígito */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) dinamicamente */
export function maskDocumento(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 11) {
    // CPF
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Formata telefone: (00) 0000-0000 ou (00) 00000-0000 */
export function maskTelefone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

/** Formata placa: ABC-1D23 (max 7 alfanuméricos + hífen). Força maiúscula. */
export function maskPlaca(value: string): string {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (clean.length <= 3) return clean;
  return clean.slice(0, 3) + "-" + clean.slice(3);
}

/** Formata classificação de grão: 71/61 (insere barra no meio) */
export function maskClassificacao(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}

/** Formata número com separador de milhares pt-BR (ex: 15.000) */
export function maskKg(value: string): string {
  const clean = value.replace(/[^\d]/g, "");
  if (!clean) return "";
  return Number(clean).toLocaleString("pt-BR");
}

/** Remove formatação de milhares e retorna string numérica pura */
export function unmaskKg(value: string): string {
  return value.replace(/\./g, "");
}
