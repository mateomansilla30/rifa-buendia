import { NextResponse } from "next/server";
import { HttpError } from "./auth";
import { SaleError } from "./sales";

/** Envuelve un handler y convierte errores conocidos en JSON con su status. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response | unknown>) {
  return async (...args: A) => {
    try {
      const res = await fn(...args);
      return res instanceof Response ? res : NextResponse.json(res ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof SaleError) return NextResponse.json({ error: e.message, taken: e.taken }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "Error inesperado, probá de nuevo" }, { status: 500 });
    }
  };
}
