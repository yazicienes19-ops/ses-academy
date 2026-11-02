// Zimmerplan: Zimmerwünsche verstehen und Personen auf Zimmer verteilen.
//
// Regeln für den Vorschlag, in dieser Reihenfolge:
//   1. Zimmer nie gemischt (nur Frauen oder nur Männer).
//   2. Von Hand Zugeteiltes bleibt, wo es ist.
//   3. Gegenseitige Wünsche zuerst zusammen; einseitige auch, solange die gewünschte Person sich niemand anderen wünscht.
//   4. Alle anderen durchmischen: möglichst niemand, mit dem man schon im Zimmer war, verschiedene Regionen.
//      Nächte spielen keine Rolle: jedes Zimmer wird einmal für den ganzen Aufenthalt gebucht.
// Alles ist deterministisch: gleiche Angaben ergeben denselben Vorschlag (wichtig, weil „Übernehmen“ neu rechnet).

import { faltName, finde, type Person as NamensPerson } from "@/lib/import/namen";

// ── Wünsche verstehen ──────────────────────────────────────────────────────────

/** Antworten, die keinen Wunsch bedeuten. */
const keinWunsch = /^(yok|hay[ıi]r|farketmez|fark etmez|farketmiyor|egal|keine?r?|kein wunsch|nein|no|none|x|-+|\.+)$/i;
/** Einzelzimmer-Wunsch in den üblichen Schreibweisen. */
const einzel = /\b(tek (kisilik )?oda|tek kisilik|einzelzimmer|single|alleine?)\b/;

/** „Tala Y., Ayşe und Zeynep (Köln)“ → ["Tala Y.", "Ayşe", "Zeynep"] */
export function wunschTeile(text: string): string[] {
  return text
    .replace(/\(.*?\)/g, " ")
    .split(/\s*(?:,|;|\/|&|\+|\n|\bve\b|\bund\b|\band\b|\bile\b|\bveya\b|\boder\b)\s*/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !keinWunsch.test(t) && !einzel.test(faltName(t)));
}

export function wuenschtEinzelzimmer(text: string) {
  return einzel.test(faltName(text));
}

export type Teil = {
  text: string;                      // wie eingegeben
  schluessel: string;                // vereinfacht, für Korrekturen (room_wish_overrides.token)
  ziel: NamensPerson | null;
  art: "sicher" | "aehnlich" | "korrigiert" | "ignoriert" | "mehrdeutig" | "unbekannt";
  kandidaten?: NamensPerson[];
};

export type Korrektur = { participant_id: string; token: string; wished_id: string | null };

/** Die Namensteile eines Wunsches den Angemeldeten zuordnen; Korrekturen des Teams haben Vorrang. */
export function wunschAufloesen(person: { id: string; room_wish: string }, angemeldete: NamensPerson[], korrekturen: Korrektur[]): Teil[] {
  const andere = angemeldete.filter((p) => p.id !== person.id);
  return wunschTeile(person.room_wish).map((text) => {
    const schluessel = faltName(text).slice(0, 100) || text.slice(0, 100);
    const k = korrekturen.find((x) => x.participant_id === person.id && x.token === schluessel);
    if (k) {
      const ziel = k.wished_id ? angemeldete.find((p) => p.id === k.wished_id) ?? null : null;
      return { text, schluessel, ziel, art: ziel ? "korrigiert" : "ignoriert" };
    }
    const t = finde(text, andere);
    if (t.art === "sicher") return { text, schluessel, ziel: t.person, art: "sicher" };
    if (t.art === "vorschlag") return { text, schluessel, ziel: t.person, art: "aehnlich" };
    if (t.art === "mehrdeutig") return { text, schluessel, ziel: null, art: "mehrdeutig", kandidaten: t.kandidaten };
    return { text, schluessel, ziel: null, art: "unbekannt" };
  });
}

// ── Vorschlag ──────────────────────────────────────────────────────────────────

export type PlanPerson = {
  id: string; name: string; gender: string | null; region: string | null; nights: string[];
  zimmerId: string | null; quelle: string | null;        // aktuelle Zuteilung in diesem Hotel
  wuensche: string[];                                     // aufgelöste Wunsch-Personen (ids)
  einzelzimmer: boolean;
};
export type PlanZimmer = { id: string; label: string; capacity: number };
export type Grund = "fest" | "wunsch_gegenseitig" | "wunsch" | "gemischt" | "einzelzimmer";
export type Belegung = { id: string; grund: Grund };
export type Hinweis = { personId: string; text: string };
export type Ergebnis = {
  zimmer: (PlanZimmer & { belegung: Belegung[] })[];
  ohneZimmer: string[];
  hinweise: Hinweis[];
  wiederholungen: { zimmerId: string; a: string; b: string }[];   // schon einmal zusammen im Zimmer
};

/** Kleine, stabile Mischfunktion statt Zufall: gleiche ids ergeben dieselbe Reihenfolge. */
function streuwert(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Personen auf Zimmer verteilen. verlauf = Paare, die schon in einem anderen Modul im selben Zimmer waren
 * (als Schlüssel „a|b“ in beiden Richtungen).
 */
export function planen(personen: PlanPerson[], zimmerListe: PlanZimmer[], verlauf: Set<string>): Ergebnis {
  const byId = new Map(personen.map((p) => [p.id, p]));
  const name = (id: string) => byId.get(id)?.name ?? "?";
  const hinweise: Hinweis[] = [];
  const zimmer = [...zimmerListe].sort((a, b) => a.label.localeCompare(b.label, "de", { numeric: true }))
    .map((z) => ({ ...z, belegung: [] as Belegung[], gender: null as string | null }));
  const zimmerVon = new Map<string, (typeof zimmer)[number]>();
  const frei = (z: (typeof zimmer)[number]) => z.capacity - z.belegung.length;
  const legeAb = (z: (typeof zimmer)[number], id: string, grund: Grund) => {
    z.belegung.push({ id, grund });
    z.gender ??= byId.get(id)?.gender ?? null;
    zimmerVon.set(id, z);
  };

  // Wer braucht ein Zimmer? Nur wer mindestens eine Nacht bleibt.
  const brauchen = personen.filter((p) => p.nights.length > 0).sort((a, b) => a.id.localeCompare(b.id));
  const brauchtSet = new Set(brauchen.map((p) => p.id));

  // 2. Handzuteilungen bleiben
  for (const p of brauchen) {
    const z = p.quelle === "manual" && p.zimmerId ? zimmer.find((x) => x.id === p.zimmerId) : undefined;
    if (z) legeAb(z, p.id, "fest");
  }

  // 3. Wünsche prüfen: gleiches Geschlecht, Person bleibt auch über Nacht, Gegenseitigkeit
  const kanten: { a: string; b: string; gegenseitig: boolean }[] = [];
  for (const p of brauchen) {
    for (const w of new Set(p.wuensche)) {
      const q = byId.get(w);
      if (!q) continue;
      if (!brauchtSet.has(w)) { hinweise.push({ personId: p.id, text: `wünscht sich ${q.name}, die/der aber keine Übernachtung angegeben hat` }); continue; }
      if (p.gender && q.gender && p.gender !== q.gender) { hinweise.push({ personId: p.id, text: `wünscht sich ${q.name} (anderes Geschlecht, nicht eingeplant)` }); continue; }
      const gegenseitig = q.wuensche.includes(p.id);
      if (gegenseitig && p.id > w) continue;   // gegenseitige Paare nur einmal
      if (!gegenseitig && q.wuensche.some((x) => x !== p.id && brauchtSet.has(x))) {
        hinweise.push({ personId: p.id, text: `wünscht sich ${q.name}, die/der sich aber jemand anderen wünscht` });
        continue;
      }
      kanten.push({ a: p.id, b: w, gegenseitig });
    }
  }

  // Wunschgruppen bilden (Union-Find); feste Personen ziehen ihre Gruppe in ihr Zimmer
  const eltern = new Map<string, string>();
  const wurzel = (x: string): string => { const e = eltern.get(x) ?? x; if (e === x) return x; const r = wurzel(e); eltern.set(x, r); return r; };
  for (const k of kanten) eltern.set(wurzel(k.a), wurzel(k.b));
  const gruppen = new Map<string, string[]>();
  for (const p of brauchen) if (kanten.some((k) => k.a === p.id || k.b === p.id)) gruppen.set(wurzel(p.id), [...(gruppen.get(wurzel(p.id)) ?? []), p.id]);
  const gegenseitigVon = new Set(kanten.filter((k) => k.gegenseitig).flatMap((k) => [k.a, k.b]));
  const grundVon = (id: string): Grund => (gegenseitigVon.has(id) ? "wunsch_gegenseitig" : "wunsch");

  const groessteZimmer = Math.max(0, ...zimmer.map((z) => z.capacity));
  const zuGross: string[][] = [];
  const gruppenListe: string[][] = [];
  for (const g of gruppen.values()) {
    if (g.length <= groessteZimmer) { gruppenListe.push(g); continue; }
    // zu groß für jedes Zimmer: nur gegenseitige Paare zusammenhalten, Rest einzeln
    hinweise.push({ personId: g[0], text: `Wunschgruppe mit ${g.length} Personen (${g.map(name).join(", ")}) passt in kein Zimmer` });
    zuGross.push(g);
  }
  for (const g of zuGross) {
    const paare = kanten.filter((k) => k.gegenseitig && g.includes(k.a));
    const vergeben = new Set<string>();
    for (const k of paare) if (!vergeben.has(k.a) && !vergeben.has(k.b)) { gruppenListe.push([k.a, k.b]); vergeben.add(k.a).add(k.b); }
  }

  const konflikte = (ids: string[], z: (typeof zimmer)[number]) =>
    z.belegung.reduce((s, b) => s + ids.filter((i) => verlauf.has(`${i}|${b.id}`)).length, 0);
  const passtGeschlecht = (gender: string | null, z: (typeof zimmer)[number]) =>
    z.belegung.length === 0 || (z.gender ?? null) === (gender ?? null);

  // Gruppen: größte zuerst, ins engste passende Zimmer (bei festen Mitgliedern in deren Zimmer)
  gruppenListe.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  for (const g of gruppenListe) {
    const offen = g.filter((id) => !zimmerVon.has(id));
    if (offen.length === 0) continue;
    const gender = byId.get(g[0])!.gender;
    const anker = g.map((id) => zimmerVon.get(id)).find(Boolean);
    if (anker && frei(anker) >= offen.length) { offen.forEach((id) => legeAb(anker, id, grundVon(id))); continue; }
    const kandidaten = zimmer.filter((z) => frei(z) >= offen.length && passtGeschlecht(gender, z))
      .sort((a, b) => konflikte(offen, a) - konflikte(offen, b) || (frei(a) - offen.length) - (frei(b) - offen.length)
        || b.belegung.length - a.belegung.length);
    if (kandidaten[0]) offen.forEach((id) => legeAb(kandidaten[0], id, grundVon(id)));
    else hinweise.push({ personId: g[0], text: `kein Zimmer frei für ${offen.map(name).join(", ")} zusammen` });
  }

  // Einzelzimmer-Wünsche: nur wenn es ein freies Einzelzimmer gibt
  for (const p of brauchen.filter((x) => x.einzelzimmer && !zimmerVon.has(x.id))) {
    const z = zimmer.find((x) => x.capacity === 1 && x.belegung.length === 0);
    if (z) legeAb(z, p.id, "einzelzimmer");
    else hinweise.push({ personId: p.id, text: "wünscht sich ein Einzelzimmer, es ist aber keins frei" });
  }

  // 4. Alle übrigen durchmischen (Nächte zählen nicht, ein Zimmer ist für den ganzen Aufenthalt gebucht),
  //    stabil gestreut (sonst landen Nachbarn aus der Liste zusammen)
  const rest = brauchen.filter((p) => !zimmerVon.has(p.id))
    .sort((a, b) => streuwert(a.id) - streuwert(b.id));
  const ohneZimmer: string[] = [];
  for (const p of rest) {
    if (!p.gender) hinweise.push({ personId: p.id, text: "Geschlecht fehlt, bitte von Hand einteilen oder eintragen" });
    const punkte = (z: (typeof zimmer)[number]) =>
      100 * konflikte([p.id], z)
      + 10 * z.belegung.filter((b) => p.region && byId.get(b.id)!.region === p.region).length;
    const teilweise = zimmer.filter((z) => z.belegung.length > 0 && frei(z) > 0 && passtGeschlecht(p.gender, z) && p.gender)
      .sort((a, b) => punkte(a) - punkte(b) || frei(a) - frei(b));
    const leer = zimmer.filter((z) => z.belegung.length === 0 && z.capacity > 1).sort((a, b) => b.capacity - a.capacity)[0]
      ?? zimmer.find((z) => z.belegung.length === 0);
    // Lieber ein neues Zimmer öffnen als Leute zusammenlegen, die schon einmal zusammen waren
    const ziel = teilweise[0] && (punkte(teilweise[0]) < 100 || !leer) ? teilweise[0] : leer;
    if (ziel) legeAb(ziel, p.id, "gemischt");
    else ohneZimmer.push(p.id);
  }
  for (const id of ohneZimmer) hinweise.push({ personId: id, text: "hat kein Bett mehr: weitere Zimmer anlegen" });

  const wiederholungen = zimmer.flatMap((z) => z.belegung.flatMap((a, i) => z.belegung.slice(i + 1)
    .filter((b) => verlauf.has(`${a.id}|${b.id}`)).map((b) => ({ zimmerId: z.id, a: a.id, b: b.id }))));

  return { zimmer: zimmer.map((z) => ({ id: z.id, label: z.label, capacity: z.capacity, belegung: z.belegung })), ohneZimmer, hinweise, wiederholungen };
}
