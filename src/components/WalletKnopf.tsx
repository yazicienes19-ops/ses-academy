/** „Zu Apple Wallet hinzufügen“: schwarzer Knopf im Stil des Apple-Wallet-Badges. Lädt die .pkpass-Datei. */
export function WalletKnopf({ href, text }: { href: string; text: string }) {
  return (
    <p className="mt-4 text-center">
      <a
        href={href}
        className="inline-flex items-center gap-3 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
          <rect x="2" y="4" width="20" height="16" rx="3" fill="#fff" />
          <rect x="2" y="7" width="20" height="3" fill="#3f6e57" />
          <rect x="2" y="10" width="20" height="3" fill="#2fa37a" />
          <rect x="2" y="13" width="20" height="3" fill="#e0a526" />
          <path d="M2 15h6a4 4 0 0 0 8 0h6v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="#d9d4c7" />
        </svg>
        {text}
      </a>
    </p>
  );
}
