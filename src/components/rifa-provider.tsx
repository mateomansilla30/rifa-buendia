"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Raffle, Sale, User } from "@/lib/types";

export interface RifaState {
  me: User;
  raffle: Raffle | null;
  users: User[];
  sales: Sale[];
}

const Ctx = createContext<{ state: RifaState; refresh: () => Promise<void> } | null>(null);

/** fetch JSON; tira Error con el mensaje del servidor (en castellano) si falla. */
export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  }).catch(() => null);
  if (!res) throw new Error("Sin conexión. Revisá internet y probá de nuevo.");
  if (res.status === 401) window.location.assign("/login");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Algo salió mal"), data);
  return data as T;
}

const POLL_MS = 5000;

export function RifaProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RifaState | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await api<RifaState>("/api/state", { cache: "no-store" }));
    } catch {
      /* sin conexión: seguimos mostrando lo último */
    }
  }, []);

  // ponytail: polling cada 5 s (solo con la pestaña visible); SSE si algún día son muchos vendedores.
  useEffect(() => {
    refresh(); // primera carga; si no hay sesión, api() manda a /login
    const tick = () => document.visibilityState === "visible" && refresh();
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  if (!state)
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <div className="size-10 animate-spin rounded-full border-4 border-accent border-t-primary" />
      </div>
    );
  return <Ctx.Provider value={{ state, refresh }}>{children}</Ctx.Provider>;
}

export function useRifa() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRifa fuera de RifaProvider");
  return ctx;
}
