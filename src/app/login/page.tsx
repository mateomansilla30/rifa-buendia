"use client";
// Basado en "Login Form" de prebuiltui (21st.dev): campos con ícono y pill, adaptado al tema.
import { KeyRound, User } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    }).catch(() => null);
    if (res?.ok) return window.location.assign("/");
    setError(res ? (await res.json()).error : "Sin conexión. Probá de nuevo.");
    setLoading(false);
  }

  const field = "flex h-12 w-full items-center gap-3 overflow-hidden rounded-full border border-input bg-background pl-5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-accent/60 px-6">
      <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col items-center rounded-2xl border bg-background p-8 shadow-xl shadow-black/5">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary font-heading text-2xl font-extrabold text-primary-foreground">Nº</div>
        <h1 className="text-3xl font-semibold">Entrar</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Rifa a beneficio de Buendía</p>

        <label className={`${field} mt-8`}>
          <User className="size-4 text-muted-foreground" aria-hidden />
          <input name="username" placeholder="Usuario" autoComplete="username" autoCapitalize="none" required className="h-full w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/80" />
        </label>
        <label className={`${field} mt-4`}>
          <KeyRound className="size-4 text-muted-foreground" aria-hidden />
          <input name="password" type="password" placeholder="Contraseña o PIN" autoComplete="current-password" required className="h-full w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/80" />
        </label>

        {error && <p role="alert" className="mt-4 w-full text-center text-sm font-medium text-destructive">{error}</p>}

        <button type="submit" disabled={loading} className="mt-6 h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
