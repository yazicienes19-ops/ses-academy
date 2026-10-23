// Ende-zu-Ende-Test Phase 3+4 (headless): Offline-Einlass, Walk-in, Auswertung, CSV, Teilnehmer-Kennzahlen.
// Erwartet: frische DB (supabase db reset), `next start -p 3100`.
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const BASIS = "http://localhost:3100";
const MAILPIT = "http://127.0.0.1:55324/api/v1";
let fehler = 0;
const ok = (bedingung, text) => {
  console.log(`${bedingung ? "ok  " : "FEHLER"} ${text}`);
  if (!bedingung) fehler++;
};
const sql = (abfrage) =>
  execFileSync("docker", ["exec", "-i", "supabase_db_ses-academy", "psql", "-U", "postgres", "-t", "-A", "-c", abfrage]).toString().trim();
const mails = async () => (await fetch(`${MAILPIT}/messages`).then((x) => x.json())).messages;

async function login(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASIS}/team/login/`);
  await page.fill("#email", email);
  await page.fill("#passwort", "test1234");
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASIS}/team/`);
  return { page, ctx };
}
const karte = (page) => page.locator("[role=status][aria-live=assertive]").innerText();
async function code(page, wert) {
  await page.fill("#kurzcode", wert);
  await page.click("form button:has-text('Prüfen')");
  await page.waitForTimeout(800);
  return karte(page);
}

const yusuf = sql("select short_code from participants where email='yusuf@example.test'");
const aminaToken = sql("select checkin_token from participants where email='amina@example.test'");
const warte = sql("select short_code from participants where email='gast2@example.test'");

const browser = await chromium.launch();
await fetch(`${MAILPIT}/messages`, { method: "DELETE" });

// 1. Offline-Einlass als Helfer
const { page: helfer, ctx: helferCtx } = await login(browser, "helfer@ses.test");
await helfer.goto(`${BASIS}/team/einlass/`);
await helfer.waitForTimeout(500);
ok(await helfer.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("ses-einlass:liste:"))), "Einlassliste für offline gespeichert");
const gespeichert = await helfer.evaluate(() => JSON.stringify(Object.entries(localStorage).find(([k]) => k.startsWith("ses-einlass:liste:"))[1]));
ok(!gespeichert.includes("@example.test"), "Offline-Liste enthält keine E-Mail-Adressen");
ok(!(await helfer.getByText("Walk-in").count()), "Helfer sieht kein Walk-in");

await helferCtx.setOffline(true);
let text = await code(helfer, yusuf.toLowerCase().slice(0, 4) + "-" + yusuf.slice(4));
ok(/Yusuf Demir/.test(text) && /Offline vorgemerkt um/.test(text), "Offline: Kurzcode grün vorgemerkt");
ok(await helfer.getByText("1 Check-in warten auf Übertragung").isVisible(), "Warteschlange zeigt 1");
text = await code(helfer, yusuf);
ok(/Bereits erfasst um/.test(text), "Offline: Zweitscan gelb");
text = await code(helfer, aminaToken);
ok(/Amina Yilmaz/.test(text) && /Offline vorgemerkt/.test(text), "Offline: voller Token über Hash erkannt");
text = await code(helfer, warte);
ok(/Warteliste/.test(text), "Offline: Warteliste rot");
text = await code(helfer, "FFFFFFFF");
ok(/Code unbekannt/.test(text), "Offline: unbekannter Code rot");
ok(await helfer.getByText("2 Check-ins warten auf Übertragung").isVisible(), "Warteschlange zeigt 2");

await helferCtx.setOffline(false);
await helfer.getByText("2 Offline-Check-ins übertragen.").waitFor({ timeout: 15000 });
ok(true, "Nach Wiederverbindung automatisch übertragen");
ok(sql("select count(*) from attendances where method='offline_sync'") === "2", "In der Datenbank als offline_sync gespeichert");
const abstand = Number(sql("select extract(epoch from now() - max(checked_in_at)) from attendances where method='offline_sync'"));
ok(abstand > 0 && abstand < 300, "Ursprüngliche Scanzeit übernommen");
ok(!(await helfer.getByText("warten auf Übertragung").count()), "Warteschlange leer");

// 2. Walk-in als Orga
const { page: orga } = await login(browser, "orga@ses.test");
await orga.goto(`${BASIS}/team/einlass/`);
await orga.getByText("Walk-in: nicht angemeldete Person erfassen").click();
await orga.fill("#wi-vorname", "Walter");
await orga.fill("#wi-nachname", "Spontan");
await orga.fill("#wi-email", "walter@example.test");
await orga.check("input[name=einwilligung]");
await orga.click("button:has-text('Erfassen und einchecken')");
await orga.getByText("Walter Spontan").first().waitFor({ timeout: 10000 });
text = await karte(orga);
ok(/Erfolgreich eingecheckt/.test(text) && /Gast/.test(text), "Walk-in grün, Zugehörigkeit Gast");
await orga.waitForTimeout(1000);
ok((await mails()).some((m) => m.To[0].Address === "walter@example.test"), "Walk-in mit E-Mail bekommt Ticket");
ok(sql("select count(*) from attendances where method='walk_in'") === "1", "Walk-in als walk_in gespeichert");
await orga.goto(`${BASIS}/team/auswertung/`);
ok(orga.url().includes("fehler=rechte"), "Orga kommt nicht in die Auswertung");

// 3. Auswertung als Vorstand
const { page: vorstand } = await login(browser, "vorstand@ses.test");
await vorstand.goto(`${BASIS}/team/auswertung/`);
const tabelle = await vorstand.locator("table").first().innerText();
ok(/Verfassungen[\s\S]*66,7 %/.test(tabelle), "Event-Vergleich: Verfassungen 66,7 %");
ok(/Auftakt[\s\S]*100 %/.test(tabelle), "Event-Vergleich: Auftakt 100 %");
const aktiv = await vorstand.locator("section", { hasText: "Besonders aktiv" }).innerText();
ok(/Amina Yilmaz[\s\S]*Serie 6/.test(aktiv), "Besonders aktiv: Amina mit Serie 6");
ok((await vorstand.locator("figure button").count()) === 6, "Verlauf: 6 vergangene Modultage");
await vorstand.locator("figure button").nth(2).hover();
ok(/Verfassungen[\s\S]*2 von 3 da · 67 %/.test(await vorstand.locator("[role=tooltip]").innerText()), "Tooltip zeigt Zahlen");
const kpi = await vorstand.locator("main").innerText();
ok(/No-Shows/.test(kpi) && /87,5 %/.test(kpi), "Kennzahl: Anwesenheit gesamt 87,5 % (14 von 16 vergangenen Tagen)");

await vorstand.goto(`${BASIS}/team/auswertung/?von=2026-06-01&bis=2026-06-30`);
ok((await vorstand.locator("figure button").count()) === 2, "Zeitraumfilter: Juni hat 2 Tage");

const csv = await vorstand.request.get(`${BASIS}/team/auswertung/export/`);
const csvText = await csv.text();
ok(csv.status() === 200 && csv.headers()["content-type"].includes("text/csv"), "CSV-Export lädt");
ok(csvText.startsWith("﻿Vorname;Nachname;E-Mail") && csvText.includes("Amina;Yilmaz;amina@example.test"), "CSV hat Kopf und Daten");
const anonym = await (await browser.newContext()).request.get(`${BASIS}/team/auswertung/export/`, { maxRedirects: 0 });
ok(anonym.status() >= 300 && anonym.status() < 400, "CSV ohne Login: Weiterleitung statt Daten");

// 4. Teilnehmer-Detailseite mit Kennzahlen und Zeitleiste
const yid = sql("select id from participants where email='yusuf@example.test'");
await vorstand.goto(`${BASIS}/team/teilnehmende/${yid}/`);
const teilnahme = await vorstand.locator("section", { hasText: "Rekord-Serie" }).innerText();
ok(/Verfassungen[\s\S]*Verpasst \/ No-Show/.test(teilnahme), "Zeitleiste: Verfassungen verpasst");
ok(/Auftakt[\s\S]*Teilgenommen · 2\/2 Tage/.test(teilnahme), "Zeitleiste: Auftakt 2/2 Tage");
ok(/71,4 %/.test(teilnahme), "Kachel: Quote 71,4 % (5 da inkl. heute offline, 2 verpasst)");

await browser.close();
console.log(fehler === 0 ? "\nALLES GRÜN" : `\n${fehler} FEHLER`);
process.exit(fehler ? 1 : 0);
