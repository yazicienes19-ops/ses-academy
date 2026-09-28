import { notFound } from "next/navigation";
import { Seminarseite, metaFuer } from "@/components/seiten";
import { modulplan } from "@/i18n/daten";
import { istSprache, texte } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return modulplan.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/seminar/[slug]">) {
  const { lang, slug } = await params;
  const m = modulplan.find((x) => x.slug === slug);
  if (!m || !istSprache(lang)) return {};
  const s = texte[lang].seminare[m.slug];
  return metaFuer(lang, `/seminar/${m.slug}`, s.titel, s.text[0]);
}

export default async function Page({ params }: PageProps<"/[lang]/seminar/[slug]">) {
  const { lang, slug } = await params;
  const m = modulplan.find((x) => x.slug === slug);
  if (!m || !istSprache(lang)) notFound();
  return <Seminarseite l={lang} slug={m.slug} />;
}
