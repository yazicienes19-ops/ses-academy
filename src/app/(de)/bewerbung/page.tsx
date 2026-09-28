import { Bewerbungsseite, metaFuer } from "@/components/seiten";
import { texte } from "@/i18n";

export const metadata = metaFuer("de", "/bewerbung", texte.de.bewerbungSeite.nav, texte.de.bewerbungSeite.meta);

export default function Page() {
  return <Bewerbungsseite l="de" />;
}
