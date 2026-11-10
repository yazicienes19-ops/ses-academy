import { notFound, redirect } from "next/navigation";
import { istToken } from "@/lib/codes";
import { googleWalletAktiv, googleWalletLink } from "@/lib/google-wallet";
import { ladeTicket } from "@/lib/teilnahme";

/** Google-Wallet-Ticket: aktualisiert das Ticket bei Google und leitet auf „In Google Wallet speichern“ weiter. */
export async function GET(_request: Request, { params }: RouteContext<"/ticket/[token]/google-wallet">) {
  if (!googleWalletAktiv()) notFound();
  const { token } = await params;
  if (!istToken(token)) notFound();
  const daten = await ladeTicket({ token: token.toLowerCase() });
  if (!daten) notFound();
  let ziel: string | null = null;
  try {
    ziel = await googleWalletLink(daten);
  } catch (fehler) {
    console.error("Google Wallet", fehler);
    return new Response("Google Wallet ist gerade nicht erreichbar. Bitte später erneut versuchen.", { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  if (!ziel) notFound();
  redirect(ziel);
}
