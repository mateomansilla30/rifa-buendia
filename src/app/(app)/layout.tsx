import { AppNav } from "@/components/app-nav";
import { RifaProvider } from "@/components/rifa-provider";

// Sin acceso a la base acá: los datos llegan por /api/state, así este front puede vivir separado del backend.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RifaProvider>
      <div className="mx-auto min-h-dvh max-w-3xl pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</div>
      <AppNav />
    </RifaProvider>
  );
}
