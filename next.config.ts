import type { NextConfig } from "next";

// Kein statischer Export mehr: Bewerbung, Ticket-Seiten und der Team-Bereich brauchen einen Server.
// Die Inhaltsseiten werden weiterhin beim Build vorgerendert.
const nextConfig: NextConfig = {
  trailingSlash: true, // wie bisher bei WordPress: /en/, /seminar/…/
  images: { unoptimized: true }, // Fotos sind in public/fotos bereits web-optimiert
  // Hausaufgaben bis 100 MB (Videos): proxy.ts puffert Anfragen, Standard wären nur 10 MB
  experimental: { proxyClientMaxBodySize: "101mb" },
};

export default nextConfig;
