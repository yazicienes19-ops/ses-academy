import { Presseseite, metaFuer } from "@/components/seiten";
import { texte } from "@/i18n";

export const metadata = metaFuer("de", "/presse", texte.de.presse.nav, texte.de.presse.meta);

export default function Page() {
  return <Presseseite l="de" />;
}
