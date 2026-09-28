import { notFound } from "next/navigation";
import { Beitragsseite, metaFuer } from "@/components/seiten";
import { beitraege } from "@/i18n/stimmen";

export const dynamicParams = false;

export function generateStaticParams() {
  // Statischer Export verlangt mindestens einen Pfad; ohne Beiträge entsteht nur eine 404-Seite.
  return beitraege.length ? beitraege.map((b) => ({ slug: b.slug })) : [{ slug: "leer" }];
}

export async function generateMetadata({ params }: PageProps<"/stimmen/[slug]">) {
  const { slug } = await params;
  const b = beitraege.find((x) => x.slug === slug);
  return b ? metaFuer("de", `/stimmen/${b.slug}`, b.titel, b.teaser) : {};
}

export default async function Page({ params }: PageProps<"/stimmen/[slug]">) {
  const { slug } = await params;
  if (!beitraege.some((b) => b.slug === slug)) notFound();
  return <Beitragsseite l="de" slug={slug} />;
}
