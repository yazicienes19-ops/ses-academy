import { notFound } from "next/navigation";
import { Presseseite, metaFuer } from "@/components/seiten";
import { istSprache, texte } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/presse">) {
  const { lang } = await params;
  return istSprache(lang) ? metaFuer(lang, "/presse", texte[lang].presse.nav, texte[lang].presse.meta) : {};
}

export default async function Page({ params }: PageProps<"/[lang]/presse">) {
  const { lang } = await params;
  if (!istSprache(lang)) notFound();
  return <Presseseite l={lang} />;
}
