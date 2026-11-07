import { RechtlicheLinks } from "@/components/RechtlicheLinks";
import { rechtlicheTexte } from "@/lib/rechtliches";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { bereichTexte, loginSprache } from "@/lib/bereich-texte";
import { LoginFormular } from "./LoginFormular";

export const metadata: Metadata = { title: "Anmelden | SES Academy" };

/** Login für „Mein Bereich“ auf Deutsch oder Türkisch (?sprache=tr bzw. Browsersprache, umschaltbar). */
export default async function Login({ searchParams }: PageProps<"/mein-bereich/login">) {
  const { fehler, sprache } = await searchParams;
  const l = loginSprache(sprache, (await headers()).get("accept-language"));
  const t = bereichTexte[l];
  return (
    <main lang={l} className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <img src="/brand/ses-logo.png" alt="SES Academy" className="h-10 w-auto" />
        <Link href={`/mein-bereich/login/?sprache=${l === "tr" ? "de" : "tr"}`} hrefLang={l === "tr" ? "de" : "tr"} lang={l === "tr" ? "de" : "tr"} className="rounded-full px-3 py-1.5 text-sm font-semibold text-ink-soft ring-1 ring-line hover:bg-paper-deep">{t.andereSprache}</Link>
      </div>
      <h1 className="font-display mt-10 text-4xl leading-none font-extrabold">{t.loginTitel}</h1>
      <p className="mt-3 text-ink-soft">{t.loginIntro}</p>
      {fehler && <p role="alert" className="mt-6 rounded-2xl bg-rot-hell p-4 text-sm font-semibold text-rot">{t.loginLinkAbgelaufen}</p>}
      <div className="karte mt-8"><LoginFormular key={l} l={l} /></div>
      <RechtlicheLinks {...rechtlicheTexte(l)} className="mt-10 justify-center text-ink-soft" />
    </main>
  );
}
