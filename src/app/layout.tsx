import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://ses-academy.de"),
  title: {
    default: "SES Academy – Politische Bildung für junge Muslime in Europa",
    template: "%s | SES Academy",
  },
  description: "Die SES Academy (Sosyal ve Siyasal Eğitim Semineri) ist ein zweijähriges Bildungs- und Empowerment-Programm für rund 150 junge Musliminnen und Muslime im Alter von 18 bis 30 Jahren aus Deutschland, Frankreich und Österreich.",
  keywords: ["SES Academy", "politische Bildung", "Muslime", "Europa", "Islamrat", "IGMG", "Bildungsprogramm"],
  openGraph: {
    title: "SES Academy – Politische Bildung für junge Muslime in Europa",
    description: "Zwei Jahre Bildung. Zehn Module. Eine Gemeinschaft.",
    type: "website",
    locale: "de_DE",
    siteName: "SES Academy",
    images: [{ url: "/logos/ses-academy.png", width: 555, height: 178, alt: "SES Academy Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SES Academy – Politische Bildung für junge Muslime in Europa",
    description: "Zwei Jahre Bildung. Zehn Module. Eine Gemeinschaft.",
    images: ["/logos/ses-academy.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png" }],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
