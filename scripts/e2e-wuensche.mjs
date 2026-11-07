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

await browser.close();
console.log(fehler ? `\n${fehler} Fehler` : "\nAlles in Ordnung.");
process.exit(fehler ? 1 : 0);
