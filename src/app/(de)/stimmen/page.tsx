import { Stimmenseite, metaFuer } from "@/components/seiten";
import { texte } from "@/i18n";

export const metadata = metaFuer("de", "/stimmen", texte.de.stimmen.nav, texte.de.stimmen.meta);

export default function Page() {
  return <Stimmenseite l="de" />;
}
