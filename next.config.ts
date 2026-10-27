import type { NextConfig } from "next";

// Con BACKEND_URL (ej. en Vercel) este deploy es solo front: todo /api/* se reenvía al VPS,
// así el navegador ve un solo dominio y la cookie de sesión funciona sin CORS.
const backend = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  async rewrites() {
    return backend ? { beforeFiles: [{ source: "/api/:path*", destination: `${backend}/api/:path*` }], afterFiles: [], fallback: [] } : [];
  },
};

export default nextConfig;
