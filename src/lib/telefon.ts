/**
 * Telefonnummer in die internationale Form ohne Trennzeichen bringen.
 * „+49 (0)170 …“ und „+49 0170 …“ werden zu „+49170…“, „0049…“ zu „+49…“; nationale Nummern (0…) bleiben.
 */
export function waehlbar(nummer: string): string {
  return nummer
    .replace(/\(0\)/g, "")
    .replace(/[^\d+]/g, "")
    .replace(/^00/, "+")
    .replace(/^\+(49|90|43|41)0/, "+$1");
}

export function telLink(nummer: string) {
  return `tel:${waehlbar(nummer)}`;
}

/** WhatsApp braucht die internationale Form; nationale Nummern (0…) bekommen keinen Knopf. */
export function whatsappLink(nummer: string) {
  const n = waehlbar(nummer);
  return n.startsWith("+") ? `https://wa.me/${n.slice(1)}` : null;
}
