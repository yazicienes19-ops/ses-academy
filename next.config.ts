import type { NextConfig } from "next";

// Kein statischer Export mehr: Bewerbung, Ticket-Seiten und der Team-Bereich brauchen einen Server.
// Die Inhaltsseiten werden weiterhin beim Build vorgerendert.
const nextConfig: NextConfig = {
  trailingSlash: true, // wie bisher bei WordPress: /en/, /seminar/…/
  images: { unoptimized: true }, // Fotos sind in public/fotos bereits web-optimiert
  // Eigene 404-Seite auch für Adressen ohne passende Route (mehrere Root-Layouts, siehe app/global-not-found.tsx)
  experimental: { globalNotFound: true },
};

export default nextConfig;
