import type { NextConfig } from "next";

// Kein statischer Export mehr: Bewerbung, Ticket-Seiten und der Team-Bereich brauchen einen Server.
// Die Inhaltsseiten werden weiterhin beim Build vorgerendert.
const nextConfig: NextConfig = {
  trailingSlash: true, // wie bisher bei WordPress: /en/, /seminar/…/
  images: { unoptimized: true }, // Fotos sind in public/fotos bereits web-optimiert
};

export default nextConfig;
