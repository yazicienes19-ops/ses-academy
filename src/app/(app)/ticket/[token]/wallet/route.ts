import { notFound } from "next/navigation";
import { istToken } from "@/lib/codes";
import { ladeTicket } from "@/lib/teilnahme";
import { erzeugeWalletPass, walletAktiv } from "@/lib/wallet";

/**
 * Apple-Wallet-Pass zum Ticket. Funktioniert mit dem Mail-Link (link_token) und dem QR-Token, so wie die Ticket-Seite.
 * Der Pass enthält nur, was die Ticket-Seite ohnehin zeigt, und keinen Abmelde-Link.
 */
export async function GET(_request: Request, { params }: RouteContext<"/ticket/[token]/wallet">) {
  if (!walletAktiv()) notFound();
  const { token } = await params;
  if (!istToken(token)) notFound();
  const daten = await ladeTicket({ token: token.toLowerCase() });
  if (!daten) notFound();
  const pass = await erzeugeWalletPass(daten);
  if (!pass) notFound();
  return new Response(new Uint8Array(pass), {
    headers: {
      "content-type": "application/vnd.apple.pkpass",
      "content-disposition": 'attachment; filename="ses-ticket.pkpass"',
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
