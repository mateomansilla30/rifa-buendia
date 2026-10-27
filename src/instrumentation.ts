// Al arrancar el servidor: abre la base, corre migraciones y crea el admin. Si algo falla, que se vea enseguida.
// En el deploy solo-front (BACKEND_URL definido) no hay base: la tiene el VPS.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.BACKEND_URL) {
    const { getDb } = await import("./lib/db");
    getDb();
  }
}
