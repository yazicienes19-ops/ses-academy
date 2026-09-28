import type { NextConfig } from "next";

// Statischer Export: `npm run build` erzeugt den Ordner `out/` mit reinen HTML/CSS/JS-Dateien,
// die sich auf jeden Webserver hochladen lassen (auch dort, wo heute WordPress läuft).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // wie bisher bei WordPress: /en/, /seminar/…/
  images: { unoptimized: true }, // Fotos sind in public/fotos bereits web-optimiert
};

export default nextConfig;
