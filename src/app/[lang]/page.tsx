import { notFound } from "next/navigation";
import { Startseite, metaFuer } from "@/components/seiten";
import { istSprache } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  return istSprache(lang) ? metaFuer(lang) : {};
}

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!istSprache(lang)) notFound();
  return <Startseite l={lang} />;
}
