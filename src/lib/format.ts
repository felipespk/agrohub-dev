export function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null || isNaN(valor)) return "R$ 0,00";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: string | null | undefined): string {
  if (!data) return "-";
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
}
