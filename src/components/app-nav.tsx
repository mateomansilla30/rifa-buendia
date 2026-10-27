"use client";
// Barra inferior estilo "Bottom Menu" (21st.dev), pensada para el pulgar.
import { ChartPie, Dices, Grid3x3, ImageIcon, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRifa } from "./rifa-provider";

export function AppNav() {
  const path = usePathname();
  const isAdmin = useRifa().state.me.role === "admin";
  const items = [
    { href: "/", label: "Tablero", icon: Grid3x3 },
    { href: "/imagen", label: "Imagen", icon: ImageIcon },
    { href: "/resumen", label: "Resumen", icon: ChartPie },
    ...(isAdmin
      ? [
          { href: "/sorteo", label: "Sorteo", icon: Dices },
          { href: "/admin", label: "Ajustes", icon: Settings },
        ]
      : []),
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <ul className="mx-auto flex max-w-3xl">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
                  active && "text-primary",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent")}>
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
