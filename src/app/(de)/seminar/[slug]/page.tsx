import { notFound } from "next/navigation";
import { Seminarseite, metaFuer } from "@/components/seiten";
import { modulplan } from "@/i18n/daten";
import { texte } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return modulplan.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/seminar/[slug]">) {
  const { slug } = await params;
  const m = modulplan.find((x) => x.slug === slug);
  if (!m) return {};
  const s = texte.de.seminare[m.slug];
  return metaFuer("de", `/seminar/${m.slug}`, s.titel, s.text[0]);
}

export default async function Page({ params }: PageProps<"/seminar/[slug]">) {
  const { slug } = await params;
  const m = modulplan.find((x) => x.slug === slug);
  if (!m) notFound();
  return <Seminarseite l="de" slug={m.slug} />;
}
