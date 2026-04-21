export const BRAZIL_TIMEZONE = "America/Sao_Paulo";
export const BRAZIL_LOCALE = "pt-BR";

export function getBrazilDateInputValue(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat(BRAZIL_LOCALE, {
    timeZone: BRAZIL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!day || !month || !year) {
    throw new Error("Não foi possível formatar a data no fuso do Brasil.");
  }

  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD date string into a local Date (noon) to avoid timezone shift.
 * Using T12:00:00 ensures the date won't roll back to the previous day in any timezone.
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

/**
 * Format a YYYY-MM-DD string to dd/mm/yyyy in pt-BR without timezone issues.
 */
export function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
