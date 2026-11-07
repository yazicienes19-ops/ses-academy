// Ende-zu-Ende-Test der Wünsche aus dem Gesamttest (07.11.2026). Headless, Laptop- und Handybreite.
// Erwartet: frische DB (supabase db reset) und einen laufenden Server, z. B. `npx next dev -p 3031`.
// Aufruf aus dem Projektordner: BASIS=http://localhost:3031 node scripts/e2e-wuensche.mjs [teil …]
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

// localhost statt 127.0.0.1: der Entwicklungsserver liefert seine Skripte sonst nicht aus (allowedDevOrigins)
const BASIS = process.env.BASIS ?? "http://localhost:3031";
const MAILPIT = "http://127.0.0.1:55324/api/v1";
const teile = new Set(process.argv.slice(2));
const teil = (name) => teile.size === 0 || teile.has(name);
let fehler = 0;
const ok = (bedingung, text) => {
  console.log(`${bedingung ? "ok  " : "FEHLER"} ${text}`);
  if (!bedingung) fehler++;
};

/** SQL gegen die lokale Entwicklungsdatenbank (nie gegen den Betrieb). */
const sql = (abfrage) =>
  execFileSync("docker", ["exec", "-i", "supabase_db_ses-academy", "psql", "-U", "postgres", "-d", "postgres", "-tAq", "-c", abfrage]).toString().trim();

async function mailsAn(adresse, betreffTeil) {
  const r = await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:${adresse}`)}`).then((x) => x.json());
  const treffer = r.messages.filter((m) => !betreffTeil || m.Subject.includes(betreffTeil));
  return Promise.all(treffer.map((m) => fetch(`${MAILPIT}/message/${m.ID}`).then((x) => x.json())));
}
const mailsLeeren = () => fetch(`${MAILPIT}/messages`, { method: "DELETE" });
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
/** Auf Mails warten (Versand läuft nach der Antwort der Seite noch kurz weiter). */
async function mailsWarten(adresse, betreffTeil, anzahl = 1) {
  for (let i = 0; i < 30; i++) {
    const m = await mailsAn(adresse, betreffTeil);
    if (m.length >= anzahl) return m;
    await warte(300);
  }
  return mailsAn(adresse, betreffTeil);
}

async function teamLogin(browser, email, breite = 1280) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: breite < 600 ? 844 : 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`${BASIS}/team/login/`);
  await page.fill("#email", email);
  await page.fill("#passwort", "test1234");
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASIS}/team/`);
  return page;
}

/** Login für „Mein Bereich“ per Code aus der Mail (Mailpit). */
async function portalLogin(browser, email, breite = 390) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASIS}/mein-bereich/login/`);
  await page.fill("#email", email);
  await page.locator("form button").first().click();
  await page.locator("#code").waitFor();
  let code = null;
  for (let i = 0; i < 20 && !code; i++) {
    const mails = await mailsAn(email);
    const neueste = mails.sort((a, b) => Date.parse(b.Date) - Date.parse(a.Date))[0];
    code = neueste?.Text.match(/\b(\d{6})\b/)?.[1] ?? null;
    if (!code) await warte(500);
  }
  await page.fill("#code", code);
  await page.locator("form button").first().click();
  await page.waitForURL(/\/mein-bereich\/$/);
  return page;
}

const keinUeberlauf = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/** Datei herunterladen (Link anklicken) und als Text lesen. */
async function herunterladen(page, locator) {
  const [download] = await Promise.all([page.waitForEvent("download"), locator.click()]);
  const pfad = await download.path();
  return { name: download.suggestedFilename(), text: execFileSync("cat", [pfad]).toString() };
}

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// 1. Teilnehmende als Excel (gefiltert), Orga ohne E-Mail-Spalte
// ---------------------------------------------------------------------------
if (teil("export")) {
  const admin = await teamLogin(browser, "admin@ses.test");
  await admin.goto(`${BASIS}/team/teilnehmende/?gruppe=alle&q=amina`);
  const anzahl = await admin.locator("tbody tr").count();
  const datei = await herunterladen(admin, admin.getByRole("link", { name: "Als Excel herunterladen" }));
  const zeilen = datei.text.replace(/^﻿/, "").trim().split("\r\n");
  ok(datei.text.startsWith("﻿\"Name\""), "Excel-Datei mit BOM und Kopfzeile");
  ok(zeilen.length - 1 === anzahl && anzahl > 0, `Export enthält genau die gefilterten ${anzahl} Personen`);
  ok(zeilen[0].includes("\"E-Mail\"") && /@example\.test/.test(datei.text), "Admin: mit E-Mail-Spalte");
  ok(anzahl === 1 && zeilen[1].startsWith("\"Amina"), "Gefiltert: nur Amina");
  ok(/\.csv$/.test(datei.name) && datei.name.startsWith("Teilnehmende"), `Dateiname „${datei.name}“`);

  const orga = await teamLogin(browser, "orga@ses.test", 390);
  await orga.goto(`${BASIS}/team/teilnehmende/`);
  const orgaDatei = await herunterladen(orga, orga.getByRole("link", { name: "Als Excel herunterladen" }));
  ok(!orgaDatei.text.includes("\"E-Mail\"") && !/@example\.test/.test(orgaDatei.text), "Orga-Team: keine E-Mail-Spalte, keine Adressen");
  ok(orgaDatei.text.replace(/^﻿/, "").trim().split("\r\n").length - 1 === await orga.locator("tbody tr").count(), "Orga: Export = Liste");
  ok(await keinUeberlauf(orga), "Teilnehmende am Handy ohne seitliches Scrollen");

  const helfer = await teamLogin(browser, "helfer@ses.test");
  const r = await helfer.request.get(`${BASIS}/team/teilnehmende/export/`, { maxRedirects: 0 });
  ok(r.status() >= 300 && r.status() < 400 && !(await r.text()).includes("Name"), "Einlass-Helfer: kein Export");
  const anonym = await (await browser.newContext()).request.get(`${BASIS}/team/teilnehmende/export/`, { maxRedirects: 0 });
  ok(anonym.status() >= 300 && anonym.status() < 400, "Ohne Login: kein Export");
}

// ---------------------------------------------------------------------------
// 2. Mehrfachauswahl in Teilnehmende: Rundmail an die gefilterte Gruppe
// ---------------------------------------------------------------------------
if (teil("auswahl")) {
  await mailsLeeren();
  const admin = await teamLogin(browser, "admin@ses.test");
  await admin.goto(`${BASIS}/team/teilnehmende/?gruppe=alle`);
  const zeilen = await admin.locator("tbody tr").count();
  await admin.locator("summary", { hasText: "Rundmail an diese Auswahl" }).click();
  ok(await admin.getByText(`An die Auswahl in der Liste: ${zeilen} Personen angehakt.`).isVisible(), `Anfangs alle ${zeilen} angehakt`);
  await admin.getByLabel("Yusuf Demir für die Rundmail auswählen").uncheck();
  ok(await admin.getByText(`${zeilen - 1} Personen angehakt`).isVisible(), "Abwählen zählt mit");
  await admin.locator("th").getByRole("button", { name: "keine" }).click();
  ok(await admin.getByText("0 Personen angehakt").isVisible(), "„keine“ wählt alle ab");
  await admin.locator("th").getByRole("button", { name: "alle" }).click();
  await admin.getByLabel("Yusuf Demir für die Rundmail auswählen").uncheck();
  await admin.fill("#betreff", "TestWunsch Auswahl");
  await admin.fill("#text", "Nur für die Auswahl.");
  await admin.getByRole("button", { name: "Empfänger zählen und prüfen" }).click();
  const erwartet = zeilen - 1;
  await admin.getByText(`${erwartet} Empfänger:innen`).waitFor();
  ok(true, `Empfängerzahl ${erwartet} (ohne Yusuf)`);
  await admin.getByRole("button", { name: "Testmail an mich" }).click();
  await admin.getByText("Testmail an admin@ses.test verschickt.").waitFor();
  ok((await mailsWarten("admin@ses.test", "[Test] TestWunsch Auswahl")).length === 1, "Testmail an mich angekommen");
  await admin.getByRole("button", { name: "Zur Freigabe vorlegen" }).click();
  await admin.waitForURL(/\/team\/nachrichten\/\?hinweis=beantragt/);
  const yusuf = sql("select id from participants where email = 'yusuf@example.test'");
  ok(sql("select (payload -> 'filter' -> 'participant_ids') ? '" + yusuf + "' from approvals where summary like '%TestWunsch Auswahl%'") === "f", "Antrag enthält Yusuf nicht");
  ok(sql("select summary like '%Auswahl aus Teilnehmende: " + erwartet + " Personen (mit Gästen und Walk-ins)%' from approvals where summary like '%TestWunsch Auswahl%'") === "t", "Beschreibung nennt Auswahl und Filter");
  ok((await mailsAn("amina@example.test", "TestWunsch")).length === 0, "Vor der Freigabe geht nichts raus");

  const vorstand = await teamLogin(browser, "vorstand@ses.test");
  await vorstand.goto(`${BASIS}/team/freigaben/`);
  await vorstand.locator("li", { hasText: "TestWunsch Auswahl" }).getByRole("button", { name: "Freigeben" }).click();
  await vorstand.getByText("Freigegeben.").waitFor();
  await admin.goto(`${BASIS}/team/nachrichten/`);
  await admin.getByRole("button", { name: `Jetzt an ${erwartet} Personen senden` }).click();
  await admin.waitForURL(/gesendet-/);
  ok((await mailsWarten("amina@example.test", "TestWunsch Auswahl")).length === 1 && (await mailsAn("yusuf@example.test", "TestWunsch")).length === 0, "Versand nur an die Auswahl");

  const orga = await teamLogin(browser, "orga@ses.test");
  await orga.goto(`${BASIS}/team/teilnehmende/`);
  ok(await orga.locator("input[data-rundmail]").count() === 0 && await orga.getByText("Rundmail an diese Auswahl").count() === 0, "Orga-Team: keine Rundmail (wie bisher nur Admin/Vorstand)");
  const handy = await teamLogin(browser, "admin@ses.test", 390);
  await handy.goto(`${BASIS}/team/teilnehmende/`);
  await handy.locator("summary", { hasText: "Rundmail an diese Auswahl" }).click();
  ok(await keinUeberlauf(handy), "Rundmail in Teilnehmende am Handy ohne seitliches Scrollen");
  sql("delete from email_log where kind like 'nachricht:%'; delete from approvals where summary like '%TestWunsch%'");
}

// ---------------------------------------------------------------------------
// 3. Rundmails: Vorlage, Sprache nach Konto, Empfängerzahl, Testmail, Vier-Augen, Versand je Sprache
// ---------------------------------------------------------------------------
if (teil("rundmail")) {
  await mailsLeeren();
  sql("update participants set preferred_language = 'tr' where email = 'leila@example.test'");
  sql("delete from message_templates where name like 'TestWunsch%'");
  const admin = await teamLogin(browser, "admin@ses.test");
  await admin.goto(`${BASIS}/team/nachrichten/`);
  await admin.getByLabel("Nach Kontosprache").check();
  await admin.fill("#betreff", "TestWunsch Treffen");
  await admin.fill("#text", "Wir treffen uns am Samstag.");
  await admin.fill("#betreff_tr", "TestWunsch Buluşma");
  await admin.fill("#text_tr", "Cumartesi günü buluşuyoruz.");
  await admin.locator("summary", { hasText: "Als Vorlage speichern" }).click();
  await admin.fill("#vorlage_name", "TestWunsch Treffen");
  await admin.getByRole("button", { name: "Vorlage speichern" }).click();
  await admin.getByText("Vorlage „TestWunsch Treffen“ gespeichert.").waitFor();
  ok(sql("select subject_de || '/' || subject_tr from message_templates where name = 'TestWunsch Treffen'") === "TestWunsch Treffen/TestWunsch Buluşma", "Vorlage mit beiden Sprachen gespeichert");

  // Vorlage wieder auswählen füllt das Formular
  await admin.reload();
  await admin.selectOption("#vorlage", { label: "TestWunsch Treffen" });
  ok(await admin.inputValue("#text_tr") === "Cumartesi günü buluşuyoruz." && await admin.getByLabel("Nach Kontosprache").isChecked(), "Vorlage auswählen füllt Texte und Sprache");

  ok(await admin.getByRole("button", { name: "Zur Freigabe vorlegen" }).count() === 0, "Vorlegen erst nach dem Prüfen");
  await admin.getByRole("button", { name: "Empfänger zählen und prüfen" }).click();
  const zahl = Number(sql("select count(*) from participants where active and email is not null"));
  await admin.getByText(`${zahl} Empfänger:innen`).waitFor();
  ok(await admin.getByText(`${zahl - 1} auf Deutsch, 1 auf Türkisch`).isVisible(), `Empfängerzahl ${zahl}, davon 1 auf Türkisch`);
  await admin.getByRole("button", { name: "Testmail an mich" }).click();
  await admin.getByText("Zwei Testmails (Deutsch und Türkisch) an admin@ses.test verschickt.").waitFor();
  const tests = await mailsWarten("admin@ses.test", "[Test]", 2);
  ok(tests.some((m) => m.Subject === "[Test] TestWunsch Treffen" && m.Text.startsWith("Hallo Admin,")) &&
     tests.some((m) => m.Subject === "[Test] TestWunsch Buluşma" && m.Text.startsWith("Merhaba Admin,")), "Testmails in beiden Sprachen an mich");
  // Änderung nach dem Prüfen: neu prüfen nötig
  await admin.fill("#text", "Wir treffen uns am Samstag um 10 Uhr.");
  ok(await admin.getByText("Seit der Prüfung wurde etwas geändert").isVisible() && await admin.getByRole("button", { name: "Zur Freigabe vorlegen" }).count() === 0, "Nach Änderung erst neu prüfen");
  await admin.getByRole("button", { name: "Empfänger zählen und prüfen" }).click();
  await admin.getByRole("button", { name: "Zur Freigabe vorlegen" }).click();
  await admin.waitForURL(/hinweis=beantragt/);
  ok(sql("select count(*) from email_log where kind like 'nachricht:%'") === "0", "Vorlegen und Testmail verschicken nichts an Teilnehmende");

  const vorstand = await teamLogin(browser, "vorstand@ses.test", 390);
  await vorstand.goto(`${BASIS}/team/freigaben/`);
  const karte = vorstand.locator("li", { hasText: "TestWunsch Treffen" });
  ok(await karte.getByText(`an ${zahl} Personen`).isVisible() && await karte.getByText("nach Kontosprache: 1 auf Türkisch").isVisible(), "Freigabe zeigt Anzahl und Sprachen");
  ok(await karte.getByText("Cumartesi günü buluşuyoruz.").isVisible(), "Freigabe zeigt auch den türkischen Text");
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await vorstand.getByText("Freigegeben.").waitFor();
  ok(await keinUeberlauf(vorstand), "Freigaben am Handy ohne seitliches Scrollen");

  await admin.goto(`${BASIS}/team/nachrichten/`);
  await admin.getByRole("button", { name: `Jetzt an ${zahl} Personen senden` }).click();
  await admin.waitForURL(/gesendet-/);
  const leila = (await mailsWarten("leila@example.test", "TestWunsch"))[0];
  const amina = (await mailsWarten("amina@example.test", "TestWunsch"))[0];
  ok(leila?.Subject === "TestWunsch Buluşma" && leila.Text.startsWith("Merhaba Leila,") && leila.Text.includes("Selamlarımızla"), "Türkisches Konto bekommt den türkischen Text");
  ok(amina?.Subject === "TestWunsch Treffen" && amina.Text.includes("um 10 Uhr") && amina.Text.startsWith("Hallo Amina,"), "Deutsches Konto bekommt den deutschen Text (geänderte Fassung)");

  // Handy: Formular ohne seitliches Scrollen
  const handy = await teamLogin(browser, "admin@ses.test", 390);
  await handy.goto(`${BASIS}/team/nachrichten/`);
  await handy.getByLabel("Nach Kontosprache").check();
  ok(await keinUeberlauf(handy), "Nachrichten am Handy ohne seitliches Scrollen");

  sql("update participants set preferred_language = 'de' where email = 'leila@example.test'");
  sql("delete from message_templates where name like 'TestWunsch%'");
  sql("delete from email_log where kind like 'nachricht:%'; delete from approvals where summary like '%TestWunsch%'");
}

// ---------------------------------------------------------------------------
// 4./5. Bewerbungen: Zähler an den Reitern, Rückfrage, Mails bei Ablehnung und Warteliste (Deutsch/Türkisch)
// ---------------------------------------------------------------------------
if (teil("bewerbungen")) {
  await mailsLeeren();
  sql("delete from applications where last_name like 'TestWunsch%'");
  sql(`insert into applications (cohort_id, first_name, last_name, email, birth_year, country, city, motivation, consent_at, language) values
    ('00000000-0000-4000-8000-000000002026', 'Elif', 'TestWunschAbsage', 'elif.tw@example.test', 2003, 'Deutschland', 'Köln', 'x', now(), 'tr'),
    ('00000000-0000-4000-8000-000000002026', 'Jonas', 'TestWunschWarte', 'jonas.tw@example.test', 2003, 'Deutschland', 'Bonn', 'x', now(), 'de'),
    ('00000000-0000-4000-8000-000000002026', 'Mara', 'TestWunschStill', 'mara.tw@example.test', 2003, 'Deutschland', 'Bonn', 'x', now(), 'en'),
    ('00000000-0000-4000-8000-000000002026', 'Nils', 'TestWunschAnnahme', 'nils.tw@example.test', 2003, 'Deutschland', 'Bonn', 'x', now(), 'de')`);
  const zahl = (status) => Number(sql(`select count(*) from applications where cohort_id = '00000000-0000-4000-8000-000000002026' and status in (${status})`));
  const admin = await teamLogin(browser, "admin@ses.test");
  await admin.goto(`${BASIS}/team/bewerbungen/`);
  const reiter = admin.getByRole("navigation", { name: "Filter" });
  ok(await reiter.getByRole("link", { name: `Offen ${zahl("'eingegangen','in_pruefung'")}` }).isVisible() &&
     await reiter.getByRole("link", { name: `Angenommen ${zahl("'angenommen'")}` }).isVisible() &&
     await reiter.getByRole("link", { name: "Abgelehnt 0" }).isVisible(), "Zähler an den Reitern");

  // Ablehnen: Rückfrage, Mail auf Türkisch
  const elif = admin.locator("li", { hasText: "TestWunschAbsage" });
  await elif.getByRole("button", { name: "Ablehnen" }).click();
  ok(await elif.getByText("Mail an elif.tw@example.test senden, auf Türkisch: „SES Academy başvurun hakkında“").isVisible(), "Rückfrage nennt Adresse, Sprache und Betreff");
  await elif.getByRole("button", { name: "Abbrechen" }).click();
  ok(sql("select status from applications where last_name = 'TestWunschAbsage'") === "eingegangen", "Abbrechen ändert nichts");
  await elif.getByRole("button", { name: "Ablehnen" }).click();
  await elif.getByRole("button", { name: "Ja, ablehnen" }).click();
  await admin.getByText("Abgelehnt. Die Person hat eine Mail bekommen").waitFor();
  const absage = (await mailsWarten("elif.tw@example.test"))[0];
  ok(absage?.Subject === "SES Academy başvurun hakkında" && absage.Text.startsWith("Merhaba Elif,") && absage.Text.includes("Maalesef"), "Absage auf Türkisch");
  ok(await admin.getByRole("navigation", { name: "Filter" }).getByRole("link", { name: "Abgelehnt 1" }).isVisible(), "Zähler zählt mit");

  // Warteliste: Mail auf Deutsch
  const jonas = admin.locator("li", { hasText: "TestWunschWarte" });
  await jonas.getByRole("button", { name: "Warteliste" }).click();
  await jonas.getByRole("button", { name: "Ja, auf die Warteliste" }).click();
  await admin.getByText("Auf die Warteliste gesetzt.").waitFor();
  const warteMail = (await mailsWarten("jonas.tw@example.test"))[0];
  ok(warteMail?.Subject === "Deine Bewerbung: Warteliste" && warteMail.Text.startsWith("Hallo Jonas,"), "Warteliste-Mail auf Deutsch");

  // Ohne Mail (Häkchen weg), englische Bewerbung wäre Deutsch
  const mara = admin.locator("li", { hasText: "TestWunschStill" });
  await mara.getByRole("button", { name: "Ablehnen" }).click();
  ok(await mara.getByText("auf Deutsch: „Deine Bewerbung für die SES Academy“").isVisible(), "Andere Sprachen bekommen Deutsch");
  await mara.getByLabel(/Mail an mara/).uncheck();
  await mara.getByRole("button", { name: "Ja, ablehnen" }).click();
  await admin.getByText("Status gespeichert.").waitFor();
  await warte(500);
  ok(sql("select status from applications where last_name = 'TestWunschStill'") === "abgelehnt" && (await mailsAn("mara.tw@example.test")).length === 0, "Ohne Häkchen: abgelehnt, keine Mail");

  // Annehmen nur nach Rückfrage
  const nils = admin.locator("li", { hasText: "TestWunschAnnahme" });
  await nils.getByRole("button", { name: "Annehmen und Ticket senden" }).click();
  ok(await nils.getByText("bekommt ihr Ticket an nils.tw@example.test").isVisible(), "Rückfrage vor dem Annehmen");
  await nils.getByRole("button", { name: "Ja, annehmen" }).click();
  await admin.getByText("Angenommen. Die Person ist für alle kommenden Module angemeldet").waitFor();
  ok((await mailsWarten("nils.tw@example.test", "Ticket")).length === 1, "Nach Bestätigung angenommen, Ticket verschickt");

  // Ohne JavaScript geht nichts aus Versehen durch
  sql("update applications set status = 'eingegangen' where last_name = 'TestWunschWarte'");
  const ohneJs = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
  await ohneJs.goto(`${BASIS}/team/login/`);
  await ohneJs.fill("#email", "admin@ses.test");
  await ohneJs.fill("#passwort", "test1234");
  await ohneJs.click("button[type=submit]");
  await ohneJs.waitForURL(`${BASIS}/team/`).catch(() => {});
  if (ohneJs.url() === `${BASIS}/team/`) {
    await ohneJs.goto(`${BASIS}/team/bewerbungen/`);
    await ohneJs.locator("li", { hasText: "TestWunschWarte" }).getByRole("button", { name: "Ablehnen" }).click();
    await warte(800);
    ok(sql("select status from applications where last_name = 'TestWunschWarte'") === "eingegangen", "Ohne JavaScript: Ablehnen ohne Rückfrage ändert nichts");
  }

  const handy = await teamLogin(browser, "admin@ses.test", 390);
  await handy.goto(`${BASIS}/team/bewerbungen/`);
  await handy.locator("li", { hasText: "TestWunschWarte" }).getByRole("button", { name: "Ablehnen" }).click();
  ok(await keinUeberlauf(handy), "Bewerbungen mit offener Rückfrage am Handy ohne seitliches Scrollen");

  const nilsId = sql("select participant_id from applications where last_name = 'TestWunschAnnahme'");
  if (nilsId) sql(`delete from email_log where participant_id = '${nilsId}'; delete from applications where last_name like 'TestWunsch%'; delete from participants where id = '${nilsId}'`);
  sql("delete from applications where last_name like 'TestWunsch%'; delete from email_log where recipient like '%.tw@example.test'");
}

// ---------------------------------------------------------------------------
// 6. Rückfragen: Willkommensmail an alle, Import, Entfernen
// ---------------------------------------------------------------------------
if (teil("rueckfragen")) {
  await mailsLeeren();
  const admin = await teamLogin(browser, "admin@ses.test");

  // Willkommensmail an alle
  await admin.goto(`${BASIS}/team/teilnehmende/`);
  const offen = Number(sql("select count(*) from participants p where affiliation_status = 'academy_student' and active and email is not null and user_id is null and not exists (select 1 from email_log e where e.participant_id = p.id and e.kind = 'willkommen' and e.status = 'sent')"));
  await admin.getByRole("button", { name: "Willkommensmail senden" }).click();
  ok(await admin.getByText(`Willkommensmail jetzt an ${offen} Teilnehmende senden?`).isVisible(), `Rückfrage nennt die Zahl (${offen})`);
  await admin.getByRole("button", { name: "Abbrechen" }).click();
  await warte(500);
  ok(sql("select count(*) from email_log where kind = 'willkommen'") === "0", "Abbrechen: keine Willkommensmail");
  await admin.getByRole("button", { name: "Willkommensmail senden" }).click();
  await admin.getByRole("button", { name: `Ja, an ${offen} senden` }).click();
  await admin.getByText(`Willkommensmail an ${offen} verschickt`).waitFor();
  ok(true, "Nach Bestätigung verschickt");
  sql("delete from email_log where kind in ('willkommen', 'ticket') and triggered_by = (select id from auth.users where email = 'admin@ses.test')");

  // Import: erst Vorschau, dann Rückfrage, dann übernehmen
  const ordner = mkdtempSync(join(tmpdir(), "ses-import-"));
  const datei = join(ordner, "emails.csv");
  writeFileSync(datei, "Vorname;Nachname;E-Mail\nTina;TestWunschImport;tina.tw@example.test\n");
  await admin.goto(`${BASIS}/team/import/`);
  await admin.getByRole("radio", { name: /^E-Mail-Adressen/ }).check();
  await admin.setInputFiles("#datei", datei);
  await admin.getByLabel(/noch nicht im Portal sind, neu anlegen/).check();
  await admin.getByRole("button", { name: "Vorschau anzeigen" }).click();
  await admin.getByText("Vorschau – noch nichts gespeichert").waitFor();
  await admin.getByRole("button", { name: "Jetzt übernehmen" }).click();
  ok(await admin.getByText(/jetzt in die Datenbank übernehmen\?/).isVisible(), "Rückfrage vor dem Übernehmen mit Zahlen");
  await admin.getByRole("button", { name: "Abbrechen" }).click();
  ok(sql("select count(*) from participants where email = 'tina.tw@example.test'") === "0", "Abbrechen: nichts gespeichert");
  await admin.getByRole("button", { name: "Jetzt übernehmen" }).click();
  await admin.getByRole("button", { name: "Ja, übernehmen" }).click();
  await admin.getByText("Übernommen", { exact: true }).waitFor();
  ok(sql("select count(*) from participants where email = 'tina.tw@example.test'") === "1", "Nach Bestätigung übernommen");
  sql("delete from participants where email = 'tina.tw@example.test'");

  // Entfernen: Programmpunkt im Regieplan, Team-Zugang (nur Rückfrage, abbrechen)
  const tag = sql("select d.id from module_days d join modules m on m.id = d.module_id where m.slug = 'probe-einlass' limit 1");
  sql(`insert into program_items (module_day_id, starts_at, title) values ('${tag}', now() + interval '1 hour', 'TestWunsch Punkt')`);
  await admin.goto(`${BASIS}/team/regieplan/?tag=${tag}`);
  await admin.getByLabel(/Optionen für TestWunsch Punkt|Optionen für „TestWunsch Punkt“/).click();
  await admin.getByRole("button", { name: "Entfernen" }).click();
  ok(await admin.getByText("„TestWunsch Punkt“ aus dem Programm entfernen?").isVisible(), "Rückfrage vor dem Entfernen eines Programmpunkts");
  await admin.getByRole("button", { name: "Ja, entfernen" }).click();
  await admin.waitForURL(/hinweis=punkt-entfernt/);
  ok(sql("select count(*) from program_items where title = 'TestWunsch Punkt'") === "0", "Programmpunkt nach Bestätigung entfernt");

  await admin.goto(`${BASIS}/team/team/`);
  const zeile = admin.locator("li", { hasText: "Orga Test" });
  await zeile.getByRole("button", { name: "entfernen" }).click();
  ok(await zeile.getByText("Team-Zugang von Orga Test entfernen?").isVisible(), "Rückfrage vor dem Entfernen eines Team-Zugangs");
  await zeile.getByRole("button", { name: "Abbrechen" }).click();
  ok(sql("select count(*) from staff_members s join auth.users u on u.id = s.user_id where u.email = 'orga@ses.test'") === "1", "Abbrechen: Zugang bleibt");
}

// ---------------------------------------------------------------------------
// 7a. Logistik: mehrere Hotels je Modul, Zimmerplan und Zimmerliste je Hotel
// ---------------------------------------------------------------------------
if (teil("hotels")) {
  const demo = sql("select id from modules where slug = 'demokratie'");
  const nacht = sql(`select (min(day) - 1)::text from module_days where module_id = '${demo}'`);
  sql(`delete from hotels where module_id = '${demo}'`);
  sql(`update participants set gender = case email when 'yusuf@example.test' then 'm' else 'w' end where email in ('amina@example.test', 'leila@example.test', 'yusuf@example.test')`);
  sql(`insert into stay_requests (registration_id, nights) select r.id, array['${nacht}']::date[] from registrations r join participants p on p.id = r.participant_id
       where r.module_id = '${demo}' and p.email in ('amina@example.test', 'leila@example.test', 'yusuf@example.test') on conflict (registration_id) do update set nights = excluded.nights`);
  const orga = await teamLogin(browser, "orga@ses.test");
  await orga.goto(`${BASIS}/team/module/${demo}/hotel/`);
  await orga.fill("#name", "TestWunsch Hotel A");
  await orga.fill("#price_per_night", "80");
  await orga.getByRole("button", { name: "Hotel anlegen" }).click();
  await orga.getByText("Hotel gespeichert.").waitFor();
  await orga.fill("#labels", "101-102");
  await orga.getByRole("button", { name: "Anlegen" }).click();
  await orga.getByText("Zimmer angelegt.").waitFor();
  await orga.getByRole("link", { name: "+ Weiteres Hotel" }).click();
  await orga.getByRole("heading", { name: "Weiteres Hotel anlegen" }).waitFor();
  await orga.fill("#name", "TestWunsch Pension B");
  await orga.fill("#price_per_night", "50");
  await orga.getByRole("button", { name: "Hotel anlegen" }).click();
  await orga.getByText("Hotel gespeichert.").waitFor();
  ok(await orga.getByRole("heading", { name: "TestWunsch Pension B" }).isVisible(), "Zweites Hotel angelegt und gewählt");
  await orga.fill("#labels", "B1");
  await orga.getByRole("button", { name: "Anlegen" }).click();
  await orga.getByText("Zimmer angelegt.").waitFor();
  ok(sql(`select count(*) from hotels where module_id = '${demo}'`) === "2", "Zwei Hotels im Modul");
  const hotelB = sql("select id from hotels where name = 'TestWunsch Pension B'");
  const hotelA = sql("select id from hotels where name = 'TestWunsch Hotel A'");
  ok(orga.url().includes(`hotel=${hotelB}`), "Seite bleibt beim gewählten Hotel");

  // Zuteilen über Hotelgrenzen
  const zuteilen = async (name, zimmer) => {
    const zeile = orga.locator("tr", { hasText: name });
    await zeile.locator("select").selectOption({ label: zimmer });
    await zeile.getByRole("button", { name: "OK" }).click();
    await orga.getByText("Zuteilung gespeichert.").waitFor();
    await orga.waitForLoadState("networkidle");
    await orga.reload();
  };
  await zuteilen("Yusuf Demir", "B1 (0/2)");
  ok(sql("select h.name from room_assignments ra join hotels h on h.id = ra.hotel_id join participants p on p.id = ra.participant_id where p.email = 'yusuf@example.test'") === "TestWunsch Pension B", "Yusuf in der Pension");
  await zuteilen("Yusuf Demir", "101 (0/2)");
  ok(sql("select string_agg(h.name, ',') from room_assignments ra join hotels h on h.id = ra.hotel_id join participants p on p.id = ra.participant_id where p.email = 'yusuf@example.test'") === "TestWunsch Hotel A", "Umzug ins andere Hotel: nur noch ein Zimmer");
  ok(await orga.locator("tr", { hasText: "Yusuf Demir" }).getByText("TestWunsch Hotel A").isVisible(), "Tabelle zeigt das Hotel der Person");

  // Zimmerplan je Hotel: Vorschlag für Hotel A
  await orga.goto(`${BASIS}/team/module/${demo}/zimmerplan/?hotel=${hotelA}`);
  ok(await orga.getByRole("navigation", { name: "Hotel" }).getByRole("link", { name: /TestWunsch Pension B/ }).isVisible(), "Zimmerplan: Auswahl der Hotels");
  await orga.getByRole("link", { name: "Vorschlag berechnen" }).click();
  await orga.getByRole("button", { name: "Vorschlag übernehmen" }).click();
  await orga.waitForURL(/hinweis=plan-/);
  ok(orga.url().includes(`hotel=${hotelA}`), "Nach dem Übernehmen beim selben Hotel");
  ok(sql(`select count(*) from room_assignments where hotel_id = '${hotelA}'`) === "3" && sql(`select count(*) from room_assignments where hotel_id = '${hotelB}'`) === "0", "Vorschlag teilt alle drei in Hotel A ein");

  // Zimmerliste je Hotel (Excel und PDF)
  const liste = await herunterladen(orga, orga.getByRole("link", { name: "Zimmerliste als Excel" }));
  ok(liste.text.includes("\"TestWunsch Hotel A\"") && liste.text.includes("Amina Yilmaz") && liste.text.includes("Yusuf Demir"), "Excel-Zimmerliste für Hotel A");
  ok(liste.name.includes("TestWunsch Hotel A"), `Dateiname nennt das Hotel („${liste.name}“)`);
  const pdf = await orga.context().newPage();
  await pdf.goto(`${BASIS}/team/module/${demo}/zimmerliste/?hotel=${hotelA}`);
  ok(await pdf.getByText("TestWunsch Hotel A").first().isVisible() && await pdf.getByText("Yusuf Demir").isVisible(), "Zimmerliste (PDF-Druckseite) für Hotel A");
  await pdf.goto(`${BASIS}/team/module/${demo}/zimmerliste/?hotel=${hotelB}`);
  ok(!(await pdf.getByText("Yusuf Demir").count()), "Zimmerliste der Pension ohne die Gäste von Hotel A");

  // Leeres Hotel entfernen (Rückfrage)
  await orga.goto(`${BASIS}/team/module/${demo}/hotel/?hotel=${hotelB}`);
  await orga.getByRole("button", { name: "Dieses Hotel entfernen" }).click();
  await orga.getByRole("button", { name: "Ja, Hotel entfernen" }).click();
  await orga.getByText("Hotel entfernt.").waitFor();
  ok(sql(`select count(*) from hotels where module_id = '${demo}'`) === "1", "Leeres Hotel entfernt");

  // Info-Mail nennt das Hotel der Person erst nach der Freigabe der Zimmer
  const admin = await teamLogin(browser, "admin@ses.test");
  const amina = sql("select id from participants where email = 'amina@example.test'");
  await admin.goto(`${BASIS}/team/module/${demo}/infomail/?person=${amina}`);
  ok(!(await admin.content()).includes("TestWunsch Hotel A") || sql(`select count(*) from hotels where module_id = '${demo}'`) === "1", "Info-Mail: ein Hotel wird wie bisher genannt");
  sql(`update hotels set rooms_visible = true where id = '${hotelA}'`);
  await admin.reload();
  const zimmerA = sql(`select r.label from room_assignments ra join rooms r on r.id = ra.room_id where ra.participant_id = '${amina}' and ra.hotel_id = '${hotelA}'`);
  ok((await admin.content()).includes("TestWunsch Hotel A") && (await admin.content()).includes(zimmerA), "Info-Mail: Hotel und Zimmer nach der Freigabe");

  const handy = await teamLogin(browser, "orga@ses.test", 390);
  for (const pfad of [`/team/module/${demo}/hotel/`, `/team/module/${demo}/zimmerplan/`]) {
    await handy.goto(`${BASIS}${pfad}`);
    ok(await keinUeberlauf(handy), `${pfad} am Handy ohne seitliches Scrollen`);
  }
  sql(`delete from hotels where module_id = '${demo}'; delete from stay_requests s using registrations r where r.id = s.registration_id and r.module_id = '${demo}'`);
}

// ---------------------------------------------------------------------------
// 7b. Logistik: Kostenübersicht, Materialliste, Zimmerliste per Mail ans Hotel
// ---------------------------------------------------------------------------
if (teil("kosten")) {
  await mailsLeeren();
  const demo = sql("select id from modules where slug = 'demokratie'");
  const probe = sql("select id from modules where slug = 'probe-einlass'");
  const nacht = sql(`select (min(day) - 1)::text from module_days where module_id = '${demo}'`);
  sql(`delete from hotels where module_id = '${demo}'; delete from module_costs where module_id = '${demo}'; delete from module_materials where module_id in ('${demo}', '${probe}')`);
  sql(`delete from module_speakers where module_id = '${demo}'; delete from speakers where name like 'TestWunsch%'`);
  sql(`insert into stay_requests (registration_id, nights) select r.id, array['${nacht}']::date[] from registrations r join participants p on p.id = r.participant_id
       where r.module_id = '${demo}' and p.email in ('amina@example.test', 'leila@example.test') on conflict (registration_id) do update set nights = excluded.nights`);
  sql(`insert into hotels (module_id, name, price_per_night, contact) values ('${demo}', 'TestWunsch Hotel', 80, 'Frau Berg, reservierung@testhotel.example, 0221 123')`);
  sql(`insert into rooms (hotel_id, label, capacity) select id, '101', 2 from hotels where name = 'TestWunsch Hotel'`);
  sql(`insert into room_assignments (room_id, participant_id, hotel_id) select r.id, p.id, r.hotel_id from rooms r join hotels h on h.id = r.hotel_id, participants p
       where h.name = 'TestWunsch Hotel' and p.email in ('amina@example.test', 'leila@example.test')`);
  sql(`insert into speakers (name) values ('TestWunsch Referentin')`);
  sql(`insert into module_speakers (module_id, speaker_id, status, fee, travel_costs) select '${demo}', id, 'zugesagt', 500, 120.50 from speakers where name = 'TestWunsch Referentin'`);
  sql(`insert into module_materials (module_id, label, quantity) values ('${probe}', 'TestWunsch Verlängerungskabel', '3')`);

  const orga = await teamLogin(browser, "orga@ses.test");
  await orga.goto(`${BASIS}/team/module/${demo}/kosten/`);
  await orga.fill("#label", "TestWunsch Mittagessen");
  await orga.selectOption("#category", { label: "Verpflegung" });
  await orga.fill("#amount", "1.250,50");
  await orga.getByRole("button", { name: "Hinzufügen" }).click();
  await orga.getByText("Posten gespeichert.").waitFor();
  const kpi = await orga.locator("main").innerText();
  ok(/80,00\s€\s*Hotel/.test(kpi), "Hotel: 1 Zimmer × 1 Nacht × 80 €");
  ok(/500,00\s€\s*Honorare/.test(kpi) && /120,50\s€\s*Reisekosten/.test(kpi), "Honorar und Reisekosten der Referentin");
  ok(/1\.250,50\s€\s*Sonstiges/.test(kpi) && /1\.951,00\s€\s*Gesamt/.test(kpi), "Sonstige Posten und Gesamtsumme 1.951,00 €");
  await orga.fill("#amount", "abc");
  await orga.fill("#label", "Falsch");
  await orga.getByRole("button", { name: "Hinzufügen" }).click();
  await orga.getByText("Bitte Bezeichnung und Betrag angeben").waitFor();
  ok(sql(`select count(*) from module_costs where module_id = '${demo}'`) === "1", "Ungültiger Betrag wird abgelehnt");
  await orga.locator("li", { hasText: "TestWunsch Mittagessen" }).getByRole("button", { name: "entfernen" }).click();
  await orga.getByRole("button", { name: "Ja, entfernen" }).click();
  await orga.getByText("Posten entfernt.").waitFor();
  ok(sql(`select count(*) from module_costs where module_id = '${demo}'`) === "0", "Posten nach Rückfrage entfernt");

  // Materialliste
  await orga.goto(`${BASIS}/team/module/${demo}/material/`);
  const neu = orga.locator("#materialliste > form").first();
  await neu.getByLabel("Neues Material").fill("TestWunsch Beamer");
  await neu.getByLabel("Menge").fill("1");
  await neu.getByLabel("Wer kümmert sich").fill("Orga Test");
  await orga.getByRole("button", { name: "Hinzufügen" }).click();
  await orga.getByText("Materialliste gespeichert.").waitFor();
  ok(await orga.getByText("1 von 1 offen").isVisible(), "Material angelegt, offen");
  await orga.getByRole("button", { name: "„TestWunsch Beamer“ abhaken" }).click();
  await orga.getByText("alles erledigt").waitFor();
  ok(sql(`select done_by is not null from module_materials where label = 'TestWunsch Beamer'`) === "t", "Abgehakt mit Person");
  await orga.selectOption("#von", { label: "Probe-Einlass (lokal)" }).catch(async () => orga.selectOption("#von", { index: 0 }));
  await orga.getByRole("button", { name: "Übernehmen" }).click();
  await orga.getByText("1 Einträge übernommen.").waitFor();
  ok(sql(`select count(*) from module_materials where module_id = '${demo}' and label = 'TestWunsch Verlängerungskabel' and done_at is null`) === "1", "Liste aus anderem Modul übernommen, ohne Haken");

  // Zimmerliste per Mail ans Hotel
  await orga.goto(`${BASIS}/team/module/${demo}/hotel/`);
  ok(await orga.inputValue("#an") === "reservierung@testhotel.example", "Adresse aus der Ansprechperson übernommen");
  await orga.locator("#zimmerliste").getByRole("button", { name: "Senden" }).click();
  ok(await orga.getByText("(2 Gäste) jetzt an die eingetragene Adresse schicken?").isVisible(), "Rückfrage vor dem Versand");
  await orga.getByRole("button", { name: "Ja, jetzt senden" }).click();
  await orga.getByText("Zimmerliste ans Hotel verschickt").waitFor();
  const mail = (await mailsWarten("reservierung@testhotel.example"))[0];
  const anhang = mail?.Attachments?.[0];
  ok(mail?.Subject.startsWith("Zimmerliste Demokratie · TestWunsch Hotel") && anhang?.FileName.endsWith(".csv"), "Mail ans Hotel mit Excel-Anhang");
  if (anhang) {
    const inhalt = await fetch(`${MAILPIT}/message/${mail.ID}/part/${anhang.PartID}`).then((x) => x.text());
    ok(inhalt.includes("Amina Yilmaz") && inhalt.includes("Leila Haddad") && !inhalt.includes("@example.test"), "Anhang: Namen und Zimmer, keine Kontaktdaten");
  }
  ok(await orga.getByText(/Zuletzt verschickt am .* an reservierung@testhotel\.example/).isVisible(), "Seite zeigt, wann und an wen");

  const handy = await teamLogin(browser, "orga@ses.test", 390);
  for (const pfad of [`/team/module/${demo}/kosten/`, `/team/module/${demo}/material/`, `/team/module/${demo}/hotel/`]) {
    await handy.goto(`${BASIS}${pfad}`);
    ok(await keinUeberlauf(handy), `${pfad.split("/").at(-2)} am Handy ohne seitliches Scrollen`);
  }
  const helfer = await teamLogin(browser, "helfer@ses.test");
  await helfer.goto(`${BASIS}/team/module/${demo}/kosten/`);
  ok(helfer.url().includes("fehler=rechte"), "Einlass-Helfer: keine Kosten");

  sql(`delete from hotels where module_id = '${demo}'; delete from module_costs where module_id = '${demo}'; delete from module_materials where module_id in ('${demo}', '${probe}')`);
  sql(`delete from module_speakers where module_id = '${demo}'; delete from speakers where name like 'TestWunsch%'`);
  sql(`delete from stay_requests s using registrations r where r.id = s.registration_id and r.module_id = '${demo}'; delete from email_log where kind = 'zimmerliste'`);
}

// ---------------------------------------------------------------------------
// 8. Orga-Team: eigener Menüpunkt „Logistik“; Modulbegrenzung gilt auch hier und im Export
// ---------------------------------------------------------------------------
if (teil("logistik")) {
  const demo = sql("select id from modules where slug = 'demokratie'");
  sql(`insert into module_materials (module_id, label) values ('${demo}', 'TestWunsch Namensschilder')`);
  for (const breite of [1280, 390]) {
    const orga = await teamLogin(browser, "orga@ses.test", breite);
    if (breite < 600) await orga.getByRole("button", { name: /Menü/ }).click();
    await orga.getByRole("link", { name: "Logistik" }).first().click();
    await orga.waitForURL(/\/team\/logistik\/$/);
    const karte = orga.locator("section", { hasText: "Demokratie" });
    ok(await karte.getByText("1 von 1 offen").isVisible(), `(${breite}px) Logistik zeigt das kommende Modul mit offener Materialliste`);
    ok(await keinUeberlauf(orga), `(${breite}px) Logistik ohne seitliches Scrollen`);
    await karte.getByRole("link", { name: "Hotel und Zimmer" }).click();
    await orga.waitForURL(/\/hotel\/$/);
    ok(await orga.getByRole("link", { name: "← Logistik" }).isVisible(), `(${breite}px) Modul-Reiter führen zurück zur Logistik`);
    ok(await orga.getByRole("link", { name: "Logistik", exact: true }).first().getAttribute("aria-current") === "page" || breite < 600, `(${breite}px) Menüpunkt Logistik bleibt markiert`);
  }
  const helfer = await teamLogin(browser, "helfer@ses.test");
  ok(await helfer.getByRole("link", { name: "Logistik" }).count() === 0, "Einlass-Helfer sieht keine Logistik");
  await helfer.goto(`${BASIS}/team/logistik/`);
  ok(helfer.url().includes("fehler=rechte"), "Einlass-Helfer: Logistik gesperrt");

  // Auf ein Modul begrenztes Orga-Konto: nur Einlass und Regieplan (wie bisher), auch kein Export
  sql(`update staff_members set module_id = '${demo}' where user_id = (select id from auth.users where email = 'orga@ses.test')`);
  try {
    const modul = await teamLogin(browser, "orga@ses.test");
    ok(await modul.getByRole("link", { name: "Logistik" }).count() === 0, "Modul-Konto: kein Menüpunkt Logistik");
    for (const pfad of ["/team/logistik/", `/team/module/${demo}/kosten/`, `/team/module/${demo}/material/`]) {
      await modul.goto(`${BASIS}${pfad}`);
      ok(modul.url().includes("fehler=rechte"), `Modul-Konto: ${pfad} gesperrt`);
    }
    const r = await modul.request.get(`${BASIS}/team/teilnehmende/export/`, { maxRedirects: 0 });
    ok(r.status() >= 300 && r.status() < 400, "Modul-Konto: kein Excel-Export der Teilnehmenden");
  } finally {
    sql("update staff_members set module_id = null where user_id = (select id from auth.users where email = 'orga@ses.test')");
  }
  sql("delete from module_materials where label like 'TestWunsch%'");
}

// ---------------------------------------------------------------------------
// 9a. Datenschutz und Impressum: Bewerbung, Login, Mein Bereich, Ticket, Mails
// ---------------------------------------------------------------------------
if (teil("links")) {
  await mailsLeeren();
  const DS = "https://www.islamrat.de/disclaimer/";
  const IM = "https://www.islamrat.de/impressum/";
  const hatLinks = async (page, ds = "Datenschutz", im = "Impressum") =>
    (await page.getByRole("link", { name: ds, exact: true }).last().getAttribute("href")) === DS &&
    (await page.getByRole("link", { name: im, exact: true }).last().getAttribute("href")) === IM;
  const besucher = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await besucher.goto(`${BASIS}/bewerbung/`);
  if (await besucher.locator("#vorname").count()) {
    const form = besucher.locator("form");
    ok((await form.getByRole("link", { name: "Datenschutz" }).getAttribute("href")) === DS && (await form.getByRole("link", { name: "Impressum" }).getAttribute("href")) === IM, "Bewerbungsformular: Datenschutz und Impressum am Einverständnis");
    await besucher.goto(`${BASIS}/tr/bewerbung/`);
    ok((await besucher.locator("form").getByRole("link", { name: "Gizlilik" }).count()) === 1, "Bewerbungsformular auf Türkisch: „Gizlilik“, „Künye“");
  } else console.log("–    Bewerbungsformular übersprungen (Server ohne BEWERBUNG_OFFEN=ja)");
  await besucher.goto(`${BASIS}/mein-bereich/login/`);
  ok(await hatLinks(besucher), "Login: Datenschutz und Impressum");
  await besucher.goto(`${BASIS}/ticket/?sprache=de`);
  ok(await hatLinks(besucher), "Ticket verloren: Datenschutz und Impressum");
  const link = sql("select link_token from participants where email = 'leila@example.test'");
  sql("update participants set preferred_language = 'tr' where email = 'leila@example.test'");
  await besucher.goto(`${BASIS}/ticket/${link}/`);
  ok(await hatLinks(besucher, "Gizlilik", "Künye"), "Ticket (Türkisch): Gizlilik und Künye");
  ok(await keinUeberlauf(besucher), "Ticket am Handy ohne seitliches Scrollen");

  const amina = await portalLogin(browser, "amina@example.test");
  ok(await hatLinks(amina), "Mein Bereich: Datenschutz und Impressum");
  // Login-Mail (Supabase-Vorlage): wirkt erst nach Neustart von Supabase, deshalb nur prüfen, wenn sie schon geladen ist
  const login = (await mailsAn("amina@example.test"))[0];
  if (login?.HTML.includes(DS)) ok(true, "Login-Mail: Datenschutz und Impressum");
  else console.log("–    Login-Mail ohne Links: Supabase läuft noch mit der alten Vorlage (supabase stop/start)");

  // Mails aus der App: Fuß mit Links, in der Sprache der Mail
  sql("delete from email_log where recipient in ('amina@example.test', 'leila@example.test') and kind = 'ticket'");
  for (const adresse of ["amina@example.test", "leila@example.test"]) {
    await besucher.goto(`${BASIS}/ticket/?sprache=de`);
    await besucher.fill("#email", adresse);
    await besucher.click("button[type=submit]");
    await besucher.getByText("Wenn es zu dieser Adresse eine Anmeldung gibt").waitFor();
  }
  const de = (await mailsWarten("amina@example.test", "Ticket"))[0];
  const tr = (await mailsWarten("leila@example.test", "bilet"))[0];
  ok(de?.Text.includes(`Datenschutz: ${DS}`) && de.Text.includes(`Impressum: ${IM}`) && de.HTML.includes(DS), "Ticket-Mail (Deutsch): Datenschutz und Impressum im Fuß");
  ok(tr?.Text.includes(`Gizlilik: ${DS}`) && tr.Text.includes(`Künye: ${IM}`), "Ticket-Mail (Türkisch): Gizlilik und Künye im Fuß");
  sql("update participants set preferred_language = 'de' where email = 'leila@example.test'");
}

// ---------------------------------------------------------------------------
// 9b. Mein Bereich: aus dem Verzeichnis austragen, Löschung beantragen; Admin sieht, was passiert, und bestätigt
// ---------------------------------------------------------------------------
if (teil("loeschen")) {
  await mailsLeeren();
  sql("delete from auth.users where email = 'selin.tw@example.test'");
  sql("delete from deletion_requests where participant_id in (select id from participants where email = 'selin.tw@example.test' or last_name like 'Person (%')");
  sql("delete from participants where email = 'selin.tw@example.test'");
  const selinId = sql("select public.upsert_participant('Selin', 'TestWunsch', 'selin.tw@example.test', NULL, 'academy_student', 'tr', true)");
  sql(`update participants set cohort_id = '00000000-0000-4000-8000-000000002026', phone = '+49 170 555' where id = '${selinId}'`);
  sql(`insert into registrations (module_id, participant_id, status, source) select id, '${selinId}', 'confirmed', 'staff' from modules where slug = 'demokratie'`);
  sql(`insert into contact_log (participant_id, channel, note) values ('${selinId}', 'notiz', 'TestWunsch Notiz')`);

  const selin = await portalLogin(browser, "selin.tw@example.test");
  ok(await selin.getByRole("heading", { name: "Verilerin" }).isVisible(), "Mein Bereich (Türkisch): Abschnitt „Verilerin“");
  await selin.getByRole("button", { name: "Rehberden çık" }).click();
  await selin.getByText("Üye rehberinden çıktın.").first().waitFor();
  ok(sql(`select directory_opt_out from participants where id = '${selinId}'`) === "t", "Aus dem Verzeichnis ausgetragen");
  const amina = await portalLogin(browser, "amina@example.test", 1280);
  await amina.goto(`${BASIS}/mein-bereich/verzeichnis/`);
  ok(!(await amina.getByText("Selin TestWunsch").count()), "Andere Mitglieder sehen sie im Verzeichnis nicht mehr");
  await selin.getByRole("button", { name: "Rehbere tekrar katıl" }).click();
  await selin.getByText("Tekrar üye rehberindesin.").first().waitFor();
  await amina.reload();
  ok(await amina.getByText("Selin TestWunsch").count() > 0, "Wieder eingetragen: wieder sichtbar");

  await selin.locator("#grund-loeschen").fill("TestWunsch Grund");
  await selin.getByRole("button", { name: "Silinmesini talep et" }).click();
  ok(await selin.getByText("gerçekten talep etmek istiyor musun").isVisible(), "Rückfrage vor dem Löschantrag (Türkisch)");
  await selin.getByRole("button", { name: "Evet, silinmesini talep et" }).click();
  await selin.getByText("Silme talebin bize ulaştı").waitFor();
  ok(await selin.getByText("tarihli silme talebin inceleniyor").isVisible(), "Antrag gestellt, Stand sichtbar");
  ok(sql(`select first_name from participants where id = '${selinId}'`) === "Selin", "Noch nichts gelöscht (keine Selbstlöschung)");
  ok(await keinUeberlauf(selin), "Mein Bereich am Handy ohne seitliches Scrollen");

  const vorstand = await teamLogin(browser, "vorstand@ses.test");
  await vorstand.goto(`${BASIS}/team/loeschantraege/`);
  ok(vorstand.url().includes("fehler=rechte"), "Vorstand: Löschanträge nur für Admins");
  const admin = await teamLogin(browser, "admin@ses.test", 390);
  ok(await admin.getByText("1 Löschantrag wartet auf Bearbeitung").isVisible(), "Admin-Startseite: Hinweis auf den Antrag");
  await admin.getByText("1 Löschantrag wartet auf Bearbeitung").click();
  await admin.waitForURL(/\/team\/loeschantraege\/$/);
  const karte = admin.locator("li", { hasText: "Selin TestWunsch" });
  ok(await karte.getByText("„TestWunsch Grund“").isVisible(), "Admin sieht den Grund");
  ok(await karte.getByText("Anrufe und Kontakt-Notizen: 1").isVisible() && await karte.getByText("Anmeldungen zu Modulen: 1").isVisible() && await karte.getByText("Login-Konto für „Mein Bereich“").isVisible(),
    "Admin sieht, was gelöscht und was anonymisiert wird");
  ok(await keinUeberlauf(admin), "Löschanträge am Handy ohne seitliches Scrollen");
  await karte.getByRole("button", { name: "Löschen bestätigen" }).click();
  await karte.getByRole("button", { name: "Ja, endgültig löschen" }).click();
  await admin.getByText("Erledigt: Konto und Kontaktdaten gelöscht").waitFor();
  ok(sql(`select first_name || ' ' || last_name like 'Gelöschte Person (%' and email is null and phone is null and not active from participants where id = '${selinId}'`) === "t", "Person anonymisiert");
  ok(sql("select count(*) from auth.users where email = 'selin.tw@example.test'") === "0", "Login-Konto gelöscht");
  ok(sql(`select count(*) from registrations where participant_id = '${selinId}'`) === "1" && sql(`select count(*) from contact_log where participant_id = '${selinId}'`) === "0", "Anmeldung bleibt, Notiz gelöscht");
  await selin.reload();
  ok(/\/mein-bereich\/login\//.test(selin.url()), "Gelöschte Person ist abgemeldet (zurück zum Login)");
  sql(`delete from deletion_requests where participant_id = '${selinId}'`);
  sql(`delete from participants where id = '${selinId}'`);
}

await browser.close();
console.log(fehler ? `\n${fehler} Fehler` : "\nAlles in Ordnung.");
process.exit(fehler ? 1 : 0);
