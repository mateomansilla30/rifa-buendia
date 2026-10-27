// Formatos argentinos, compartidos entre servidor y cliente.
const TZ = "America/Buenos_Aires";

export const pad = (n: number, max: number) => String(n).padStart(String(max).length, "0");

export const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

/** ISO (o yyyy-mm-dd) → dd/mm/aaaa */
export function date(iso: string | null | undefined) {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
