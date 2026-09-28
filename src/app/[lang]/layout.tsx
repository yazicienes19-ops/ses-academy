import { notFound } from "next/navigation";
import { Rahmen } from "@/components/Rahmen";
import { istSprache } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return (["tr", "en", "fr", "nl"] as const).map((lang) => ({ lang }));
}

export default async function SprachLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!istSprache(lang) || lang === "de") notFound();
  return <Rahmen l={lang}>{children}</Rahmen>;
}
