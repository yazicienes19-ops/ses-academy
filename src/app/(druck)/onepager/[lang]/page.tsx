import Image from "next/image";
import { notFound } from "next/navigation";
import { eintraege } from "@/components/seiten";
import { gaeste } from "@/i18n/daten";
import { istSprache, sprachen, texte } from "@/i18n";

export const dynamicParams = false;
export function generateStaticParams() {
  return sprachen.map((lang) => ({ lang }));
}

const auswahl = ["Humza Yousaf", "Prof. Dr. Mathias Rohe", "Hubertus Heil", "Farid Hafez, Ph.D.", "Dr. Mustafa Cerić", "Mehmet Daimagüler"];

export default async function OnePager({ params }: PageProps<"/onepager/[lang]">) {
  const { lang } = await params;
  if (!istSprache(lang)) notFound();
  const t = texte[lang];
  const p = t.presse;
  return (
    <div lang={lang} className="mx-auto flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-paper text-ink [print-color-adjust:exact]">
      <header className="flex items-center justify-between bg-paper px-[14mm] pt-[11mm]">
        <Image src="/brand/ses-logo.png" alt="SES Academy" width={900} height={446} className="h-[20mm] w-auto" unoptimized />
        <Image src="/brand/islamrat.png" alt="Islamrat" width={900} height={218} className="h-[8mm] w-auto" unoptimized />
      </header>
      <section className="px-[14mm] pt-[7mm]">
        <p className="font-display text-[34pt] leading-[0.95] font-extrabold">
          {t.hero.zeilen[0]} {t.hero.zeilen[1]} <span className="marker">{t.hero.zeilen[2]}</span>
        </p>
        <p className="font-serif mt-[3mm] text-[13pt] italic">{t.hero.claim}</p>
        <div className="mt-[4mm] space-y-[1.5mm] text-[9.5pt] leading-snug text-ink-soft">
          {p.kurz.map((k) => (
            <p key={k}>{k}</p>
          ))}
        </div>
      </section>
      <section className="mt-[5mm] grid grid-cols-3 gap-[2mm] px-[14mm]">
        {["/fotos/yousaf.jpg", "/fotos/juni-hafez-keynote.jpg", "/fotos/sept-workshop-a.jpg"].map((src) => (
          <div key={src} className="relative h-[34mm] overflow-hidden rounded-[3mm]">
            <Image src={src} alt="" fill className="object-cover" unoptimized />
          </div>
        ))}
      </section>
      <section className="mt-[5mm] grid grid-cols-[1.1fr_1fr] gap-[6mm] px-[14mm]">
        <div>
          <p className="font-display text-[12pt] font-extrabold">{p.faktenTitel}</p>
          <dl className="mt-[2mm] divide-y divide-line border-y border-line text-[8.5pt]">
            {p.fakten.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[24mm_1fr] gap-[2mm] py-[1.4mm]">
                <dt className="font-semibold text-sage">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="font-display mt-[4mm] text-[12pt] font-extrabold">{p.gaesteTitel}</p>
          <p className="mt-[1.5mm] text-[8.5pt] leading-snug">
            {gaeste
              .filter((g, i, a) => auswahl.includes(g.name) && a.findIndex((x) => x.name === g.name) === i)
              .map((g) => g.name + (g.rolle ? ` (${g.rolle[lang] ?? g.rolle.de})` : ""))
              .join(" · ")}
          </p>
        </div>
        <div>
          <p className="font-display text-[12pt] font-extrabold">{t.programm.titel}</p>
          <ol className="mt-[2mm] space-y-[1.6mm] text-[8.5pt]">
            {eintraege(lang).map((m, i) => (
              <li key={m.slug} className="grid grid-cols-[7mm_1fr]">
                <span className="font-display font-bold text-sage">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-semibold">{m.titel}</span>
                  <br />
                  <span className="text-ink-soft">{m.datum}</span>
                </span>
              </li>
            ))}
            <li className="grid grid-cols-[7mm_1fr]">
              <span className="font-display font-bold text-sage">+</span>
              <span className="text-ink-soft">{t.programm.weitereTitel}</span>
            </li>
          </ol>
        </div>
      </section>
      <footer className="mt-auto grid grid-cols-2 items-end gap-[8mm] bg-forest px-[14mm] py-[6mm] text-paper">
        <div>
          <p className="text-[8pt] text-signal">{p.kontaktTitel}</p>
          <p className="font-display text-[14pt] font-extrabold">Murat Gümüş</p>
          <p className="text-[8.5pt] text-paper/80">{p.kontaktRolle}</p>
          <p className="mt-[1.5mm] text-[9pt]">ses@islamrat.de · +49 221 942 240-210</p>
        </div>
        <div className="text-right text-[8.5pt] leading-snug">
          <p className="font-display text-[13pt] font-bold text-signal">ses.islamrat.de</p>
          <p className="text-paper/70">{t.footer.traeger}</p>
        </div>
      </footer>
    </div>
  );
}
