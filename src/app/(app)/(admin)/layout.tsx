"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRifa } from "@/components/rifa-provider";

// Sorteo y Ajustes: solo admin. Esto es solo para la navegación; las APIs validan el rol por su cuenta.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { state } = useRifa();
  const router = useRouter();
  const isAdmin = state.me.role === "admin";
  useEffect(() => {
    if (!isAdmin) router.replace("/");
  }, [isAdmin, router]);
  return isAdmin ? children : null;
}
