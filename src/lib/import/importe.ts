import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { kriterien, type KriteriumFeld } from "@/lib/bewertung";
import { texte } from "@/i18n";
import { modulplan } from "@/i18n/daten";
import { excelDatum, klein, kopfzeile, leseTabelle, text, type Zeile } from "./excel";
import { faltName, finde, landAusText, regionName, type Person, type Treffer } from "./namen";

type Db = SupabaseClient<Database>;

export type ImportArt = "teilnehmerliste" | "hausaufgaben" | "bewertungsbogen" | "emails";

export type Optionen = {
  anwenden: boolean;
  /** Ähnliche Namen (Tippfehler, nur Vorname, abgeschnitten) automatisch zuordnen. */
  vorschlaegeUebernehmen: boolean;
  /** Personen, die noch nicht im System sind, neu anlegen. */
  fehlendeAnlegen: boolean;
  /** Vorhandene E-Mail-Adressen durch die aus der Datei ersetzen. */
  ueberschreiben: boolean;
  hausaufgabeNr: number;
};

export type Hinweis = { stufe: "ok" | "info" | "warnung"; text: string };
export type Bericht = { titel: string; zahlen: [string, number][]; hinweise: Hinweis[]; angewendet: boolean };

class Protokoll {
  zahlen = new Map<string, number>();
  hinweise: Hinweis[] = [];
  zaehle(k: string, n = 1) { this.zahlen.set(k, (this.zahlen.get(k) ?? 0) + n); }
  info(t: string) { this.hinweise.push({ stufe: "info", text: t }); }
  warn(t: string) { this.hinweise.push({ stufe: "warnung", text: t }); }
}

function pruefe<T>(res: { error: { message: string } | null; data?: unknown }, was: string): T {
  if (res.error) throw new Error(`${was}: ${res.error.message}`);
  return res.data as T;
}

/** „Ahmet İlhan Kaplan“ → Vorname „Ahmet İlhan“, Nachname „Kaplan“ */
function teileName(name: string) {
  const t = name.trim().split(/\s+/);
  return t.length > 1 ? { first_name: t.slice(0, -1).join(" "), last_name: t[t.length - 1] } : { first_name: t[0] ?? name, last_name: "" };
}

/** Ordnet einen Namen zu und protokolliert Unklarheiten. Gibt die Person oder null zurück. */
function zuordnen(name: string, personen: Person[], o: Optionen, p: Protokoll, kontext: string): Person | null {
  const t: Treffer = finde(name, personen);
  if (t.art === "sicher") return t.person;
  if (t.art === "vorschlag") {
    if (o.vorschlaegeUebernehmen) {
      p.info(`${kontext}: „${name}“ → „${t.person.name}“ zugeordnet (${t.grund}).`);
      return t.person;
    }
    p.warn(`${kontext}: „${name}“ ist vermutlich „${t.person.name}“ (${t.grund}) – zum Übernehmen „Ähnliche Namen zuordnen“ anhaken.`);
    p.zaehle("Unklare Namen");
    return null;
  }
  if (t.art === "mehrdeutig") {
    p.warn(`${kontext}: „${name}“ passt auf mehrere Personen (${t.kandidaten.map((k) => k.name).join(", ")}) – bitte von Hand zuordnen.`);
    p.zaehle("Unklare Namen");
    return null;
  }
  return null;
}

type P = { id: string; name: string; email: string | null; region_id: number | null; country: string | null; branch: string | null; mentor_id: string | null };

async function lade(sb: Db) {
  const [personen, regionen, mentoren, jahrgang] = await Promise.all([
    sb.from("participants").select("id,first_name,last_name,email,region_id,country,branch,mentor_id").in("affiliation_status", ["academy_student", "alumni", "guest", "member"]),
    sb.from("regions").select("id,name,country"),
    sb.from("mentors").select("id,name"),
    sb.from("cohorts").select("id,name").eq("is_current", true).maybeSingle(),
  ]);
  if (!jahrgang.data) throw new Error("Es gibt keinen aktuellen Jahrgang. Bitte zuerst in Supabase einen Jahrgang mit is_current = true anlegen.");
  return {
    personen: pruefe<{ id: string; first_name: string; last_name: string; email: string | null; region_id: number | null; country: string | null; branch: string | null; mentor_id: string | null }[]>(personen, "Teilnehmende laden").map(
      (x): P => ({ id: x.id, name: `${x.first_name} ${x.last_name}`.trim(), email: x.email, region_id: x.region_id, country: x.country, branch: x.branch, mentor_id: x.mentor_id }),
    ),
    regionen: pruefe<{ id: number; name: string; country: string }[]>(regionen, "Regionen laden"),
    mentoren: pruefe<{ id: string; name: string }[]>(mentoren, "Verantwortliche laden"),
    jahrgang: jahrgang.data,
  };
}
type Daten = Awaited<ReturnType<typeof lade>>;

async function personAnlegen(sb: Db, d: Daten, name: string, werte: Partial<Database["public"]["Tables"]["participants"]["Insert"]>, o: Optionen): Promise<P> {
  if (!o.anwenden) {
    const tmp: P = { id: `neu-${d.personen.length}`, name, email: null, region_id: null, country: null, branch: null, mentor_id: null };
    d.personen.push(tmp);
    return tmp;
  }
  const neu = pruefe<{ id: string }>(
    await sb.from("participants").insert({ ...teileName(name), affiliation_status: "academy_student", cohort_id: d.jahrgang.id, ...werte }).select("id").single(),
    `„${name}“ anlegen`,
  );
  const p: P = { id: neu.id, name, email: null, region_id: werte.region_id ?? null, country: werte.country ?? null, branch: werte.branch ?? null, mentor_id: werte.mentor_id ?? null };
  d.personen.push(p);
  return p;
}

async function hausaufgabeId(sb: Db, d: Daten, nr: number, o: Optionen, p: Protokoll, cache: Map<number, string>) {
  if (cache.has(nr)) return cache.get(nr)!;
  const { data } = await sb.from("assignments").select("id").eq("cohort_id", d.jahrgang.id).eq("number", nr).maybeSingle();
  let id = data?.id;
  if (!id) {
    p.info(`Hausaufgabe ${nr} wird neu angelegt.`);
    id = o.anwenden
      ? pruefe<{ id: string }>(await sb.from("assignments").insert({ cohort_id: d.jahrgang.id, number: nr, title: `Hausaufgabe ${nr}` }).select("id").single(), "Hausaufgabe anlegen").id
      : `neu-${nr}`;
  }
  cache.set(nr, id);
  return id;
}

// ── Module der Website (Modul 1 = Auftakt, 2 = Verfassungen, …) ───────────────

const berlin = (datum: string, uhr: string) => {
  const probe = new Date(`${datum}T${uhr}:00Z`);
  const versatz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "longOffset" }).formatToParts(probe).find((t) => t.type === "timeZoneName")?.value.replace("GMT", "") || "+00:00";
  return new Date(`${datum}T${uhr}:00${versatz}`).toISOString();
};

/** Holt das Modul Nr. n des Jahrgangs samt Tagen; legt es bei Bedarf nach dem Modulplan der Website an. */
async function modul(sb: Db, d: Daten, nr: number, o: Optionen, p: Protokoll) {
  const plan = modulplan[nr - 1];
  if (!plan) throw new Error(`Modul ${nr} steht nicht im Modulplan der Website (src/i18n/daten.ts).`);
  const { data } = await sb.from("modules").select("id,title,module_days(id,starts_at)").eq("slug", plan.slug).maybeSingle();
  if (data) return { id: data.id, titel: data.title, tage: data.module_days.map((t) => ({ id: t.id, beginn: t.starts_at })) };

  const titel = texte.de.seminare[plan.slug].titel;
  p.info(`Modul ${nr} („${titel}“) wird mit den Daten der Website angelegt.`);
  if (!o.anwenden) return { id: `neu-${nr}`, titel, tage: [] };
  const m = pruefe<{ id: string }>(
    await sb.from("modules").insert({ slug: plan.slug, title: titel, kind: plan.art, location: plan.ort, status: "published", cohort_id: d.jahrgang.id }).select("id").single(),
    "Modul anlegen",
  );
  const tage: { module_id: string; day: string; starts_at: string; ends_at: string }[] = [];
  for (let t = new Date(`${plan.von}T12:00:00Z`); t <= new Date(`${plan.bis}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + 1)) {
    const tag = t.toISOString().slice(0, 10);
    tage.push({ module_id: m.id, day: tag, starts_at: berlin(tag, "10:00"), ends_at: berlin(tag, "18:00") });
  }
  const neu = pruefe<{ id: string; starts_at: string }[]>(await sb.from("module_days").insert(tage).select("id,starts_at"), "Modultage anlegen");
  return { id: m.id, titel, tage: neu.map((x) => ({ id: x.id, beginn: x.starts_at })) };
}

// ── 1. Teilnehmerliste (Bölge, İsim Soyisim, KGT/GT, Modul 1…n, Sorumlu Kişi) ──

async function teilnehmerliste(sb: Db, zeilen: Zeile[], o: Optionen, p: Protokoll) {
  const kopf = kopfzeile(zeilen, [(z) => z.includes("isim") || z === "name", (z) => z.includes("bölge")]);
  if (!kopf) throw new Error("Kopfzeile nicht gefunden – erwartet werden Spalten wie „İsim Soyisim“ und „Bölge“.");
  const k = kopf.zellen;
  const col = {
    name: k.findIndex((z) => z.includes("isim") || z === "name"),
    region: k.findIndex((z) => z.includes("bölge")),
    org: k.findIndex((z) => z.includes("kgt") || z === "gt"),
    sorumlu: k.findIndex((z) => z.includes("sorumlu") || z.includes("verantwort")),
  };
  const modulSpalten = k.map((z, i) => ({ i, nr: Number(z.match(/modul\s*(\d+)/)?.[1]) })).filter((m) => m.nr > 0);

  const d = await lade(sb);
  const bestand: Person[] = [...d.personen];
  const regionNamen = d.regionen.map((r) => r.name);

  const mentorId = new Map(d.mentoren.map((t) => [faltName(t.name), t.id]));
  for (const z of zeilen.slice(kopf.index + 1)) {
    const s = col.sorumlu >= 0 ? text(z[col.sorumlu]) : "";
    if (s && !mentorId.has(faltName(s))) {
      p.zaehle("Neue Verantwortliche");
      mentorId.set(faltName(s), o.anwenden ? pruefe<{ id: string }>(await sb.from("mentors").insert({ name: s }).select("id").single(), "Verantwortliche anlegen").id : `neu-${s}`);
    }
  }
  const moduleNachNr = new Map<number, Awaited<ReturnType<typeof modul>>>();
  for (const m of modulSpalten) moduleNachNr.set(m.nr, await modul(sb, d, m.nr, o, p));

  const anmeldungen: { personId: string; modulNr: number; da: boolean }[] = [];
  for (const [zi, z] of zeilen.slice(kopf.index + 1).entries()) {
    const name = text(z[col.name]);
    if (!name) continue;
    const zeilenNr = kopf.index + 2 + zi;
    p.zaehle("Zeilen gelesen");

    const region = col.region >= 0 ? regionName(z[col.region], regionNamen) : null;
    if (col.region >= 0 && text(z[col.region]) && !region) p.warn(`Zeile ${zeilenNr} (${name}): Region „${text(z[col.region])}“ unbekannt – bitte von Hand setzen.`);
    const r = d.regionen.find((x) => x.name === region);
    const orgRoh = col.org >= 0 ? text(z[col.org]).toUpperCase() : "";
    const branch = orgRoh === "GT" || orgRoh === "KGT" ? orgRoh : null;
    if (orgRoh && !branch) p.warn(`Zeile ${zeilenNr} (${name}): GT/KGT „${orgRoh}“ nicht eindeutig – bitte von Hand setzen.`);
    const s = col.sorumlu >= 0 ? text(z[col.sorumlu]) : "";
    const werte = {
      ...(r ? { region_id: r.id, country: r.country } : {}),
      ...(branch ? { branch } : {}),
      ...(s ? { mentor_id: mentorId.get(faltName(s)) } : {}),
    };

    // Nur mit dem Bestand vor dem Import abgleichen: Zeilen derselben Liste sind immer verschiedene Personen.
    let person = zuordnen(name, bestand, o, p, `Zeile ${zeilenNr}`);
    if (!person) {
      if (finde(name, bestand).art !== "keiner") continue;
      person = await personAnlegen(sb, d, name, werte, o);
      p.zaehle("Neue Teilnehmende");
    } else {
      p.zaehle("Bereits vorhanden, aktualisiert");
      if (o.anwenden) pruefe(await sb.from("participants").update({ ...werte, affiliation_status: "academy_student", cohort_id: d.jahrgang.id }).eq("id", person.id), `„${name}“ aktualisieren`);
    }

    for (const m of modulSpalten) {
      const w = text(z[m.i]);
      const da = w === "+" ? true : w === "-" || w === "–" ? false : null;
      if (da === null) {
        if (w) p.warn(`Zeile ${zeilenNr} (${name}): Modul ${m.nr} hat den Wert „${w}“ statt +/– – übersprungen.`);
        continue;
      }
      anmeldungen.push({ personId: person.id, modulNr: m.nr, da });
      p.zaehle(da ? "Anwesend (Modul)" : "Nicht da (Modul)");
    }
  }

  if (!o.anwenden) return;
  // Anmeldungen für die importierten Module, Anwesenheit für alle Tage eines besuchten Moduls
  const regs = anmeldungen.map((a) => ({ module_id: moduleNachNr.get(a.modulNr)!.id, participant_id: a.personId, status: "confirmed" as const, source: "staff" as const }));
  const gespeichert: { id: string; module_id: string; participant_id: string }[] = [];
  for (let i = 0; i < regs.length; i += 500)
    gespeichert.push(...pruefe<typeof gespeichert>(await sb.from("registrations").upsert(regs.slice(i, i + 500), { onConflict: "module_id,participant_id" }).select("id,module_id,participant_id"), "Anmeldungen speichern"));
  const regId = new Map(gespeichert.map((g) => [`${g.module_id}|${g.participant_id}`, g.id]));
  const anwesenheit = anmeldungen
    .filter((a) => a.da)
    .flatMap((a) => {
      const m = moduleNachNr.get(a.modulNr)!;
      return m.tage.map((t) => ({ registration_id: regId.get(`${m.id}|${a.personId}`)!, module_day_id: t.id, checked_in_at: t.beginn, method: "manual" as const }));
    });
  for (let i = 0; i < anwesenheit.length; i += 500)
    pruefe(await sb.from("attendances").upsert(anwesenheit.slice(i, i + 500), { onConflict: "registration_id,module_day_id", ignoreDuplicates: true }), "Anwesenheit speichern");

  // Für kommende Module des Jahrgangs anmelden, damit der QR-Code am Einlass gilt
  const { data: kommende } = await sb.from("modules").select("id, module_days!inner(ends_at)").eq("cohort_id", d.jahrgang.id).eq("status", "published").is("cancelled_at", null).gt("module_days.ends_at", new Date().toISOString());
  const personen = [...new Set(anmeldungen.map((a) => a.personId))];
  const zukunft = [...new Set((kommende ?? []).map((m) => m.id))].flatMap((mid) => personen.map((pid) => ({ module_id: mid, participant_id: pid, status: "confirmed" as const, source: "cohort" as const })));
  for (let i = 0; i < zukunft.length; i += 500)
    pruefe(await sb.from("registrations").upsert(zukunft.slice(i, i + 500), { onConflict: "module_id,participant_id", ignoreDuplicates: true }), "Anmeldung kommende Module");
  if (zukunft.length) p.info(`Alle Personen der Liste sind für die ${new Set(zukunft.map((z) => z.module_id)).size} kommenden Module des Jahrgangs angemeldet.`);
}

// ── 2. Hausaufgabenliste (Name, Bölge, Ülke, Ödev 1…n mit ✓) ─────────────────

async function hausaufgaben(sb: Db, zeilen: Zeile[], o: Optionen, p: Protokoll) {
  const kopf = kopfzeile(zeilen, [(z) => z === "name" || z.includes("isim"), (z) => z.includes("ödev") || z.includes("hausaufgabe")]);
  if (!kopf) throw new Error("Kopfzeile nicht gefunden – erwartet werden Spalten „Name“ und „Ödev 1“ …");
  const k = kopf.zellen;
  const col = { name: k.findIndex((z) => z === "name" || z.includes("isim")), region: k.findIndex((z) => z.includes("bölge")), land: k.findIndex((z) => z.includes("ülke") || z.includes("land")) };
  const aufgaben = k.map((z, i) => ({ i, nr: Number(z.match(/(?:ödev|hausaufgabe)\s*(\d+)/)?.[1]) })).filter((a) => a.nr > 0);

  const d = await lade(sb);
  const regionNamen = d.regionen.map((r) => r.name);
  const cache = new Map<number, string>();
  const { data: vorhanden } = await sb.from("submission_participants").select("participant_id, submissions(assignment_id)");
  const hatAbgabe = new Set((vorhanden ?? []).map((a) => `${(a.submissions as { assignment_id: string } | null)?.assignment_id}|${a.participant_id}`));

  for (const [zi, z] of zeilen.slice(kopf.index + 1).entries()) {
    const name = text(z[col.name]);
    if (!name) continue;
    const zeilenNr = kopf.index + 2 + zi;
    p.zaehle("Zeilen gelesen");
    let person = zuordnen(name, d.personen, o, p, `Zeile ${zeilenNr}`);
    const region = col.region >= 0 ? d.regionen.find((r) => r.name === regionName(z[col.region], regionNamen)) : undefined;
    const land = col.land >= 0 ? landAusText[faltName(text(z[col.land]))] : undefined;
    if (!person) {
      if (finde(name, d.personen).art !== "keiner") continue;
      if (!o.fehlendeAnlegen) {
        p.warn(`Zeile ${zeilenNr}: „${name}“ ist nicht in der Teilnehmerliste – übersprungen (oder „Fehlende Personen anlegen“ anhaken).`);
        p.zaehle("Nicht gefunden");
        continue;
      }
      person = await personAnlegen(sb, d, name, { ...(region ? { region_id: region.id } : {}), ...(land || region ? { country: land ?? region!.country } : {}) }, o);
      p.zaehle("Neue Teilnehmende");
    } else {
      const full = d.personen.find((x) => x.id === person!.id)!;
      const update: { country?: string; region_id?: number } = {};
      if (!full.country && (land || region)) update.country = land ?? region!.country;
      if (!full.region_id && region) update.region_id = region.id;
      if (Object.keys(update).length) {
        p.zaehle("Land/Region ergänzt");
        if (o.anwenden) pruefe(await sb.from("participants").update(update).eq("id", person.id), `„${name}“ ergänzen`);
      }
    }

    for (const a of aufgaben) {
      if (!text(z[a.i])) continue;
      const hid = await hausaufgabeId(sb, d, a.nr, o, p, cache);
      if (hatAbgabe.has(`${hid}|${person.id}`)) { p.zaehle(`Hausaufgabe ${a.nr}: schon erfasst`); continue; }
      hatAbgabe.add(`${hid}|${person.id}`);
      p.zaehle(`Hausaufgabe ${a.nr}: abgegeben`);
      if (o.anwenden) {
        const ab = pruefe<{ id: string }>(await sb.from("submissions").insert({ assignment_id: hid, label: person.name, source: "list", note: "Aus Hausaufgabenliste übernommen" }).select("id").single(), "Abgabe anlegen");
        pruefe(await sb.from("submission_participants").insert({ submission_id: ab.id, participant_id: person.id }), "Abgabe zuordnen");
      }
    }
  }
}

// ── 3. Bewertungsbogen Rhetorik-Videos (Blatt „Alle Videos“) ─────────────────

const kriteriumSpalte: Record<KriteriumFeld, (z: string) => boolean> = {
  content: (z) => z === "inhalt",
  structure: (z) => z.startsWith("aufbau"),
  body_language: (z) => z.startsWith("körpersprache"),
  facial_expression: (z) => z.startsWith("mimik"),
  voice: (z) => z.startsWith("stimme"),
  language: (z) => z.startsWith("ausdruck"),
  presence: (z) => z.startsWith("auftreten"),
  impact: (z) => z.startsWith("publikumswirkung"),
  overall: (z) => z === "gesamteindruck",
};

type Abgabe = { id: string; file_name: string | null; source: string; submission_participants: { participant_id: string }[] };

async function bewertungsbogen(sb: Db, blaetter: { name: string; zeilen: Zeile[] }[], o: Optionen, p: Protokoll) {
  let zeilen: Zeile[] = [];
  let kopf: ReturnType<typeof kopfzeile> = null;
  for (const b of blaetter) {
    kopf = kopfzeile(b.zeilen, [(z) => z.includes("name"), (z) => z === "inhalt"]);
    if (kopf) { zeilen = b.zeilen; break; }
  }
  if (!kopf) throw new Error("Blatt mit den Spalten „Name(n) / Video“ und „Inhalt“ nicht gefunden.");
  const k = kopf.zellen;
  const idx = (f: (z: string) => boolean) => k.findIndex(f);
  const col = {
    name: idx((z) => z.includes("name")),
    gut: idx((z) => z.startsWith("besonders gut")),
    besser: idx((z) => z.startsWith("verbesserung")),
    tipp: idx((z) => z.startsWith("tipp")),
    datum: idx((z) => z === "datum"),
    von: idx((z) => z.startsWith("bewertet von")),
    datei: idx((z) => z.startsWith("dateiname")),
    hinweis: idx((z) => z.startsWith("hinweis")),
  };
  const kCol = Object.fromEntries(kriterien.map((kr) => [kr.feld, idx(kriteriumSpalte[kr.feld])])) as Record<KriteriumFeld, number>;

  const d = await lade(sb);
  const hid = await hausaufgabeId(sb, d, o.hausaufgabeNr, o, p, new Map());
  const { data: alt } = await sb.from("submissions").select("id,file_name,source,submission_participants(participant_id)").eq("assignment_id", hid);
  const abgaben = (alt ?? []) as Abgabe[];

  for (const [zi, z] of zeilen.slice(kopf.index + 1).entries()) {
    const bezeichnung = text(z[col.name]);
    if (!bezeichnung) continue;
    p.zaehle("Videos gelesen");
    const datei = (col.datei >= 0 && text(z[col.datei])) || bezeichnung;
    const kontext = `Video ${zi + 1} („${bezeichnung}“)`;

    const namen = bezeichnung.split(/;|\s-\s|,|\s&\s/).map((n) => n.replace(/…|\.\.\./g, "").trim()).filter(Boolean);
    const ids: string[] = [];
    for (const n of namen) {
      const person = zuordnen(n, d.personen, o, p, kontext);
      if (person) ids.push(person.id);
      else if (finde(n, d.personen).art === "keiner") { p.warn(`${kontext}: „${n}“ nicht gefunden – unter Hausaufgaben von Hand zuordnen.`); p.zaehle("Nicht zugeordnete Namen"); }
    }
    if (bezeichnung.includes("…")) p.info(`${kontext}: Name abgeschnitten – bitte prüfen, ob alle Personen zugeordnet sind.`);

    const punkte = Object.fromEntries(
      kriterien.map((kr) => {
        const v = kCol[kr.feld] >= 0 ? Number(z[kCol[kr.feld]]) : NaN;
        return [kr.feld, Number.isInteger(v) && v >= 1 && v <= 5 ? v : null];
      }),
    ) as Record<KriteriumFeld, number | null>;
    const bewertet = Object.values(punkte).some((v) => v != null);
    const feedback = { strengths: text(z[col.gut]) || null, improvements: text(z[col.besser]) || null, tip: text(z[col.tipp]) || null };
    const bewerter = col.von >= 0 ? text(z[col.von]) || null : null;
    p.zaehle(bewertet ? "Videos mit Bewertung" : "Videos noch ohne Bewertung");
    if (ids.length > 1) p.zaehle("Gruppenvideos");

    if (!o.anwenden) continue;
    let ab = abgaben.find((a) => a.file_name === datei);
    if (!ab) {
      const neu = pruefe<{ id: string }>(
        await sb.from("submissions").insert({ assignment_id: hid, label: bezeichnung, file_name: datei, source: "review_sheet", note: col.hinweis >= 0 ? text(z[col.hinweis]) || null : null }).select("id").single(),
        "Abgabe anlegen",
      );
      ab = { id: neu.id, file_name: datei, source: "review_sheet", submission_participants: [] };
      abgaben.push(ab);
      p.zaehle("Abgaben neu");
    }
    const fehlend = ids.filter((id) => !ab!.submission_participants.some((x) => x.participant_id === id));
    if (fehlend.length) {
      pruefe(await sb.from("submission_participants").insert(fehlend.map((participant_id) => ({ submission_id: ab!.id, participant_id }))), "Personen zuordnen");
      ab.submission_participants.push(...fehlend.map((participant_id) => ({ participant_id })));
      // „Abgegeben“-Markierung aus der Hausaufgabenliste durch das echte Video ersetzen
      const platzhalter = abgaben.filter((a) => a.source === "list" && a.submission_participants.length === 1 && fehlend.includes(a.submission_participants[0].participant_id));
      if (platzhalter.length) pruefe(await sb.from("submissions").delete().in("id", platzhalter.map((x) => x.id)), "Platzhalter entfernen");
      platzhalter.forEach((x) => abgaben.splice(abgaben.indexOf(x), 1));
    }
    if (bewertet || feedback.strengths || feedback.improvements || feedback.tip) {
      const q = sb.from("reviews").select("id").eq("submission_id", ab.id).is("reviewer_id", null);
      const { data: vorh } = await (bewerter ? q.eq("reviewer_name", bewerter) : q.is("reviewer_name", null)).maybeSingle();
      const werte = { submission_id: ab.id, reviewer_name: bewerter, reviewed_on: col.datum >= 0 ? excelDatum(z[col.datum]) : null, ...punkte, ...feedback };
      if (vorh) pruefe(await sb.from("reviews").update(werte).eq("id", vorh.id), "Bewertung aktualisieren");
      else pruefe(await sb.from("reviews").insert(werte), "Bewertung speichern");
    }
  }
}

// ── 4. E-Mail-Adressen (z. B. Export der Google-Formular-Antworten) ──────────

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function emails(sb: Db, blaetter: { name: string; zeilen: Zeile[] }[], o: Optionen, p: Protokoll) {
  let gefunden: { zeilen: Zeile[]; kopf: number; mail: number; namen: number[]; tel: number } | null = null;
  for (const b of blaetter) {
    for (let i = 0; i < Math.min(15, b.zeilen.length) && !gefunden; i++) {
      const k = b.zeilen[i].map(klein);
      const rest = b.zeilen.slice(i + 1, i + 40);
      const mail = k.findIndex((_, c) => rest.filter((r) => MAIL.test(text(r[c]))).length >= Math.max(1, rest.filter((r) => text(r[c])).length * 0.6));
      if (mail < 0) continue;
      const voll = k.findIndex((z) => /ad[ıi]? ?soyad|isim soyisim|isim|vollständiger name|name, vorname|^name$|ad soyad/.test(z));
      const vor = k.findIndex((z) => /^(ad[ıi]?|vorname|first name|prénom)$/.test(z));
      const nach = k.findIndex((z) => /^(soyad[ıi]?|nachname|last name|nom)$/.test(z));
      const namen = voll >= 0 ? [voll] : vor >= 0 && nach >= 0 ? [vor, nach] : [];
      if (!namen.length) continue;
      gefunden = { zeilen: b.zeilen, kopf: i, mail, namen, tel: k.findIndex((z) => /telefon|tel\.?$|handy|phone|gsm|cep/.test(z)) };
    }
    if (gefunden) break;
  }
  if (!gefunden) throw new Error("Keine Spalte mit E-Mail-Adressen und Namen gefunden. Die Datei braucht eine Kopfzeile mit z. B. „Ad Soyad“ bzw. „Vorname“/„Nachname“ und eine Spalte mit E-Mails.");

  const d = await lade(sb);
  const { data: alle } = await sb.from("participants").select("id,first_name,last_name,email").not("email", "is", null);
  const vergeben = new Map((alle ?? []).map((x) => [x.email!, { id: x.id, name: `${x.first_name} ${x.last_name}`.trim() }]));
  for (const [zi, z] of gefunden.zeilen.slice(gefunden.kopf + 1).entries()) {
    const name = gefunden.namen.map((c) => text(z[c])).join(" ").trim();
    const mail = text(z[gefunden.mail]).toLowerCase();
    if (!name && !mail) continue;
    const zeilenNr = gefunden.kopf + 2 + zi;
    p.zaehle("Zeilen gelesen");
    if (!MAIL.test(mail)) { p.warn(`Zeile ${zeilenNr} (${name}): „${mail || "leer"}“ ist keine gültige E-Mail-Adresse.`); p.zaehle("Ungültige E-Mail"); continue; }
    let person = zuordnen(name, d.personen, o, p, `Zeile ${zeilenNr}`);
    if (!person) {
      if (finde(name, d.personen).art !== "keiner") continue;
      if (!o.fehlendeAnlegen) { p.warn(`Zeile ${zeilenNr}: „${name}“ (${mail}) ist nicht in der Teilnehmerliste.`); p.zaehle("Nicht gefunden"); continue; }
      person = await personAnlegen(sb, d, name, {}, o);
      p.zaehle("Neue Teilnehmende");
    }
    const full = d.personen.find((x) => x.id === person!.id)!;
    const andere = vergeben.get(mail);
    if (andere && andere.id !== full.id) { p.warn(`Zeile ${zeilenNr}: ${mail} gehört schon zu „${andere.name}“ – nicht für „${full.name}“ übernommen.`); p.zaehle("Konflikte"); continue; }
    if (full.email === mail) { p.zaehle("Schon eingetragen"); continue; }
    if (full.email && !o.ueberschreiben) { p.warn(`„${full.name}“ hat schon ${full.email}; in der Datei steht ${mail} – zum Ersetzen „Vorhandene überschreiben“ anhaken.`); p.zaehle("Abweichend, nicht geändert"); continue; }
    p.zaehle(full.email ? "E-Mail ersetzt" : "E-Mail ergänzt");
    const tel = gefunden.tel >= 0 ? text(z[gefunden.tel]) || undefined : undefined;
    if (o.anwenden) pruefe(await sb.from("participants").update({ email: mail, ...(tel ? { phone: tel } : {}) }).eq("id", full.id), `E-Mail für „${full.name}“`);
    if (full.email) vergeben.delete(full.email);
    full.email = mail;
    vergeben.set(mail, { id: full.id, name: full.name });
  }
  const ohne = d.personen.filter((x) => !x.email).length;
  if (ohne) p.info(`${ohne} Personen haben danach noch keine E-Mail-Adresse.`);
}

// ── Einstieg ──────────────────────────────────────────────────────────────────

const titel: Record<ImportArt, string> = {
  teilnehmerliste: "Teilnehmerliste",
  hausaufgaben: "Hausaufgabenliste",
  bewertungsbogen: "Bewertungsbogen Rhetorik",
  emails: "E-Mail-Adressen",
};

/** Liest die Datei und gleicht sie ab. Nur mit `anwenden` wird geschrieben. Aufrufer prüft vorher die Rolle. */
export async function importiere(sb: Db, art: ImportArt, datei: File, o: Optionen): Promise<Bericht> {
  const blaetter = await leseTabelle(datei);
  const p = new Protokoll();
  const erstes = blaetter.find((b) => b.zeilen.length > 1)?.zeilen ?? [];
  if (art === "teilnehmerliste") await teilnehmerliste(sb, erstes, o, p);
  else if (art === "hausaufgaben") await hausaufgaben(sb, erstes, o, p);
  else if (art === "bewertungsbogen") await bewertungsbogen(sb, blaetter, o, p);
  else await emails(sb, blaetter, o, p);
  return { titel: titel[art], zahlen: [...p.zahlen.entries()], hinweise: p.hinweise, angewendet: o.anwenden };
}
