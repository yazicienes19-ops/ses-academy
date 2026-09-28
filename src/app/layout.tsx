import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-bricolage", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin", "latin-ext"], variable: "--font-newsreader", style: ["normal", "italic"], display: "swap" });

const beschreibung =
  "Die SES Academy ist ein Bildungs- und Empowerment-Programm für rund 150 junge Musliminnen und Muslime zwischen 18 und 30 Jahren aus Deutschland, Frankreich und Österreich – getragen vom Islamrat für die Bundesrepublik Deutschland.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ses-academy.de"),
  title: {
    default: "SES Academy – Politische Bildung für junge Muslim:innen in Europa",
    template: "%s | SES Academy",
  },
  description: beschreibung,
  openGraph: {
    title: "SES Academy",
    description: beschreibung,
    type: "website",
    locale: "de_DE",
    siteName: "SES Academy",
    images: [{ url: "/fotos/og.jpg", width: 1200, height: 630, alt: "SES Academy" }],
  },
  icons: { icon: [{ url: "/favicon.png", type: "image/png" }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.variable} ${bricolage.variable} ${newsreader.variable} antialiased`}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
