/** Decimal helpers using string amounts (document-friendly, no float money). */

export function money(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export function addMoney(...values: string[]): string {
  const sum = values.reduce((acc, v) => acc + Number(v || 0), 0);
  return money(sum);
}

export function subMoney(a: string, b: string): string {
  return money(Number(a) - Number(b));
}

export function cmpMoney(a: string, b: string): number {
  return Number(a) - Number(b);
}

export function formatPeso(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(n);
}
