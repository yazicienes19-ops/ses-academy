// Ende-zu-Ende-Test der Wünsche aus dem Gesamttest (07.11.2026). Headless, Laptop- und Handybreite.
// Erwartet: frische DB (supabase db reset) und einen laufenden Server, z. B. `npx next dev -p 3031`.
// Aufruf aus dem Projektordner: BASIS=http://localhost:3031 node scripts/e2e-wuensche.mjs [teil …]
import { execFileSync } from "node:child_process";
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

await browser.close();
console.log(fehler ? `\n${fehler} Fehler` : "\nAlles in Ordnung.");
process.exit(fehler ? 1 : 0);
