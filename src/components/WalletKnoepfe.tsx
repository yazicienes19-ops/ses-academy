import { googleWalletAktiv } from "@/lib/google-wallet";
import { portalTexte, sprachOder } from "@/lib/portal-texte";
import { walletAktiv } from "@/lib/wallet";

/**
 * „Zu Apple Wallet hinzufügen“ und „In Google Wallet speichern“ für ein Ticket. Jeder Knopf erscheint nur, wenn die
 * Zugangsdaten dafür eingetragen sind. token = link_token oder checkin_token (wie die Ticket-Seite).
 */
export function WalletKnoepfe({ token, sprache, className = "mt-4" }: { token: string; sprache: string | null | undefined; className?: string }) {
  const apple = walletAktiv();
  const google = googleWalletAktiv();
  if (!apple && !google) return null;
  const t = portalTexte[sprachOder(sprache)];
  const knopf = "inline-flex items-center gap-3 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm";
  return (
    <p className={`${className} flex flex-wrap justify-center gap-3`}>
      {apple && (
        <a href={`/ticket/${token}/wallet/`} className={knopf}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
            <rect x="2" y="4" width="20" height="16" rx="3" fill="#fff" />
            <rect x="2" y="7" width="20" height="3" fill="#3f6e57" />
            <rect x="2" y="10" width="20" height="3" fill="#2fa37a" />
            <rect x="2" y="13" width="20" height="3" fill="#e0a526" />
            <path d="M2 15h6a4 4 0 0 0 8 0h6v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="#d9d4c7" />
          </svg>
          {t.walletHinzufuegen}
        </a>
      )}
      {google && (
        <a href={`/ticket/${token}/google-wallet/`} className={knopf}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
            <rect x="3" y="4" width="18" height="6" rx="3" fill="#4285f4" />
            <rect x="3" y="8" width="18" height="6" rx="3" fill="#34a853" />
            <rect x="3" y="12" width="18" height="6" rx="3" fill="#fbbc04" />
            <rect x="3" y="15" width="18" height="5" rx="2.5" fill="#ea4335" />
          </svg>
          {t.googleWalletHinzufuegen}
        </a>
      )}
    </p>
  );
}
