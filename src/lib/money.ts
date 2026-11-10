// Dinheiro sempre em centavos (inteiro).

/** "1.299,90" | "1299,90" | "1.299" | "59" -> centavos. null se não der. */
export function parseBRL(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(s)) return null;
  let intPart = s;
  let decPart = "00";
  const comma = s.lastIndexOf(",");
  if (comma >= 0) {
    intPart = s.slice(0, comma);
    decPart = s.slice(comma + 1);
    if (decPart.length === 1) decPart += "0";
    if (decPart.length !== 2) return null;
  } else if (/\.\d{2}$/.test(s) && !/\.\d{3}/.test(s)) {
    // "199.90" (formato US em alguns sites)
    const dot = s.lastIndexOf(".");
    intPart = s.slice(0, dot);
    decPart = s.slice(dot + 1);
  }
  intPart = intPart.replace(/\./g, "");
  if (!/^\d+$/.test(intPart)) return null;
  const cents = Number(intPart) * 100 + Number(decPart);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Normaliza para busca: minúsculas, sem acento, espaços simples. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
