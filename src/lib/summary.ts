import type { Raffle, Sale, User } from "./types";

export function computeSummary(raffle: Raffle, sales: Sale[], users: Pick<User, "id" | "name">[]) {
  const total = raffle.max_number - raffle.min_number + 1;
  const sold = sales.length;
  const paid = sales.filter((s) => s.paid).length;
  const reserved = sold - paid;
  const name = new Map(users.map((u) => [u.id, u.name]));

  const bySellerMap = new Map<number | null, { id: number | null; name: string; sold: number; paid: number; collected: number }>();
  for (const s of sales) {
    const row = bySellerMap.get(s.seller_id) ?? { id: s.seller_id, name: name.get(s.seller_id!) ?? "Sin vendedor", sold: 0, paid: 0, collected: 0 };
    row.sold++;
    if (s.paid) {
      row.paid++;
      row.collected += raffle.price;
    }
    bySellerMap.set(s.seller_id, row);
  }

  return {
    total,
    sold,
    paid,
    reserved,
    free: total - sold,
    collected: paid * raffle.price,
    pending: reserved * raffle.price,
    ifAllSoldPaid: sold * raffle.price,
    ifAllNumbersSold: total * raffle.price,
    bySeller: [...bySellerMap.values()].sort((a, b) => b.sold - a.sold),
    unpaid: sales.filter((s) => !s.paid).sort((a, b) => a.buyer_name.localeCompare(b.buyer_name, "es") || a.number - b.number),
  };
}
