import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireUser("admin");
  const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Buenos_Aires" });
  return new Response(new Uint8Array(getDb().serialize()), {
    headers: {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Disposition": `attachment; filename="rifa-backup-${stamp}.db"`,
    },
  });
});
