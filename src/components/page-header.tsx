"use client";
import { LogOut } from "lucide-react";
import { useRifa } from "./rifa-provider";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  const { state } = useRifa();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="flex h-14 items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          <p className="truncate text-xs text-muted-foreground">{state.raffle?.name ?? "Sin rifa activa"}</p>
        </div>
        <span className="text-xs text-muted-foreground">Hola, {state.me.name}</span>
        <button onClick={logout} aria-label="Cerrar sesión" className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted">
          <LogOut className="size-4" />
        </button>
      </div>
      {children}
    </header>
  );
}
