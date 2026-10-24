import type { Metadata } from "next";
import Link from "next/link";
import { portalTexte, sprachOder } from "@/lib/portal-texte";
import { TicketAnfordern } from "./TicketAnfordern";

export const metadata: Metadata = { title: "Ticket | SES Academy", robots: { index: false, follow: false } };

export default async function TicketVerloren({ searchParams }: PageProps<"/ticket">) {
  const { sprache } = await searchParams;
  const l = sprachOder(typeof sprache === "string" ? sprache : undefined);
  const t = portalTexte[l];
  return (
    <main lang={l} className="mx-auto max-w-lg px-4 py-10">
      <Link href="/"><img src="/brand/ses-logo.png" alt="SES Academy" className="h-10 w-auto" /></Link>
      <h1 className="mt-8 font-display text-4xl font-bold">{t.verlorenTitel}</h1>
      <p className="mt-3 text-ink-soft">{t.verlorenText}</p>
      <TicketAnfordern l={l} />
    </main>
  );
}
