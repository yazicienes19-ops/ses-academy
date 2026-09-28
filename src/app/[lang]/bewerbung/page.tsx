import { notFound } from "next/navigation";
import { Bewerbungsseite, metaFuer } from "@/components/seiten";
import { istSprache, texte } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/bewerbung">) {
  const { lang } = await params;
  if (!istSprache(lang)) return {};
  const b = texte[lang].bewerbungSeite;
  return metaFuer(lang, "/bewerbung", b.nav, b.meta);
}

export default async function Page({ params }: PageProps<"/[lang]/bewerbung">) {
  const { lang } = await params;
  if (!istSprache(lang)) notFound();
  return <Bewerbungsseite l={lang} />;
}
