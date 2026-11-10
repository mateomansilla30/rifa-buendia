export type Role = "admin" | "seller";

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  active: number;
  has_pin?: number;
}

export interface Raffle {
  id: number;
  name: string;
  prize: string;
  price: number;
  draw_date: string | null; // yyyy-mm-dd
  alias: string;
  min_number: number;
  max_number: number;
  photo: string | null;
  active: number;
  promo_qty: number; // 0 = sin promo. Ej: 3 números por promo_price
  promo_price: number;
}

export interface Sale {
  id: number;
  raffle_id: number;
  number: number;
  buyer_name: string;
  contact: string;
  paid: number;
  promo: number; // 1 = se vendió dentro de un pack de promo
  seller_id: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  id: number;
  raffle_id: number;
  number: number | null;
  user_name: string | null;
  action: string;
  detail: string;
  created_at: string;
}
