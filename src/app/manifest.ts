import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rifa Buendía",
    short_name: "Rifa",
    description: "Cargá ventas y generá la imagen de números libres",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#fa7d00",
    lang: "es-AR",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
