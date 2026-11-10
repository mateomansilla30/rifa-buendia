import { money } from "./format";
import type { Raffle, Sale, User } from "./types";

type Prices = Pick<Raffle, "price" | "promo_qty" | "promo_price">;
const hasPromo = (r: Prices) => r.promo_qty > 1 && r.promo_price > 0;

/** De n números comprados juntos, cuántos entran en promo (solo packs completos). */
export const promoCount = (r: Prices, n: number) => (hasPromo(r) ? n - (n % r.promo_qty) : 0);

/** Lo que vale un número vendido. Si después sacan la promo, vuelve al precio normal. */
export const priceOf = (r: Prices, s: Pick<Sale, "promo">) => (s.promo && hasPromo(r) ? r.promo_price / r.promo_qty : r.price);

/** Total de comprar n números juntos. */
export const batchTotal = (r: Prices, n: number) => {
  const p = promoCount(r, n);
  return (p / (r.promo_qty || 1)) * r.promo_price + (n - p) * r.price;
};

/** "3 × $10.000" o "" si no hay promo. */
export const promoLabel = (r: Prices) => (hasPromo(r) ? `${r.promo_qty} × ${money(r.promo_price)}` : "");

export function computeSummary(raffle: Raffle, sales: Sale[], users: Pick<User, "id" | "name">[]) {
  const total = raffle.max_number - raffle.min_number + 1;
  const sold = sales.length;
  const paid = sales.filter((s) => s.paid).length;
  const reserved = sold - paid;
  const sum = (list: Sale[]) => list.reduce((t, s) => t + priceOf(raffle, s), 0);
  const name = new Map(users.map((u) => [u.id, u.name]));

  const bySellerMap = new Map<number | null, { id: number | null; name: string; sold: number; paid: number; collected: number }>();
  for (const s of sales) {
    const row = bySellerMap.get(s.seller_id) ?? { id: s.seller_id, name: name.get(s.seller_id!) ?? "Sin vendedor", sold: 0, paid: 0, collected: 0 };
    row.sold++;
    if (s.paid) {
      row.paid++;
      row.collected += priceOf(raffle, s);
    }
    bySellerMap.set(s.seller_id, row);
  }

  return {
    total,
    sold,
    paid,
    reserved,
    free: total - sold,
    collected: sum(sales.filter((s) => s.paid)),
    pending: sum(sales.filter((s) => !s.paid)),
    ifAllSoldPaid: sum(sales),
    ifAllNumbersSold: total * raffle.price,
    bySeller: [...bySellerMap.values()].sort((a, b) => b.sold - a.sold),
    unpaid: sales.filter((s) => !s.paid).sort((a, b) => a.buyer_name.localeCompare(b.buyer_name, "es") || a.number - b.number),
  };
}
