// Ende-zu-Ende-Test der Nachbesserungen vom 07.11.2026 (Gesamttest 02.11.). Headless, Laptop- und Handybreite.
// Erwartet: frische DB (supabase db reset) und einen laufenden Server, z. B. `npx next dev -p 3031`.
// Aufruf aus dem Projektordner: BASIS=http://127.0.0.1:3031 node scripts/e2e-nachbesserung.mjs [teil …]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
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

async function teamLogin(browser, email, breite = 1280) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: 900 } });
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
    if (!code) await new Promise((r) => setTimeout(r, 500));
  }
  await page.fill("#code", code);
  await page.locator("form button").first().click();
  await page.waitForURL(/\/mein-bereich\/$/);
  return page;
}

/** QR-Code der Seite im Browser auslesen (jsQR aus node_modules). */
async function qrLesen(page, selektor) {
  const jsqr = createRequire(import.meta.url).resolve("jsqr");
  await page.addScriptTag({ content: readFileSync(jsqr.replace(/[^/]+$/, "jsQR.js"), "utf8").replace(/^/, "") }).catch(() => {});
  return page.evaluate(async (sel) => {
    const svg = document.querySelector(sel);
    const xml = new XMLSerializer().serializeToString(svg);
    const bild = new Image();
    bild.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
    await bild.decode();
    const c = document.createElement("canvas");
    c.width = 480; c.height = 480;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, 480, 480);
    g.drawImage(bild, 0, 0, 480, 480);
    const d = g.getImageData(0, 0, 480, 480);
    return window.jsQR(d.data, 480, 480)?.data ?? null;
  }, selektor);
}

const keinUeberlauf = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const browser = await chromium.launch();

// ---------------------------------------------------------------------------
// 1. Ticket-Link getrennt vom QR-Code
// ---------------------------------------------------------------------------
if (teil("ticket")) {
  await mailsLeeren();
  const [qr, link] = sql("select checkin_token || ' ' || link_token from participants where email = 'amina@example.test'").split(" ");
  const demo = sql("select id from modules where slug = 'demokratie'");
  ok(qr && link && qr !== link, "Amina hat QR- und Link-Token");

  // a) Über den QR-Inhalt (alter Link): Ticket ja, Abmelden nein
  const handy = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await handy.goto(`${BASIS}/ticket/${qr}/`);
  ok(await handy.getByText("Dein Ticket").isVisible(), "Alter Ticket-Link (QR-Token) zeigt das Ticket");
  ok((await qrLesen(handy, "section svg")) === `ses:checkin:${qr}`, "QR-Code enthält weiter den Einlass-Token");
  ok(await handy.locator("form textarea[name=grund]").count() === 0, "Kein Abmelde-Formular über den QR-Token");
  ok(!(await handy.content()).includes(link), "Link-Token steht nicht auf der Seite");
  ok(await keinUeberlauf(handy), "Ticket-Seite am Handy ohne seitliches Scrollen");
  sql("delete from email_log where recipient = 'amina@example.test'"); // Sperrfrist von 10 Minuten aus früheren Läufen
  await handy.getByRole("button", { name: "Link per Mail schicken" }).click();
  await handy.getByText("Wir haben dir den Link an deine E-Mail-Adresse geschickt").waitFor();
  const ticketMail = (await mailsAn("amina@example.test", "Ticket"))[0];
  ok(ticketMail?.Text.includes(`/ticket/${link}/`) && !ticketMail.Text.includes(`/ticket/${qr}/`), "Mail enthält den Link-Token, nicht den QR-Token");

  // b) Über den Mail-Link: abmelden, Bestätigungsmail, zurücknehmen
  await handy.goto(`${BASIS}/ticket/${link}/`);
  ok((await qrLesen(handy, "section svg")) === `ses:checkin:${qr}`, "Auch über den Mail-Link zeigt der QR den Einlass-Token");
  const karte = handy.locator("li", { hasText: "Demokratie" });
  await karte.getByText("Ich kann nicht teilnehmen").click();
  await karte.locator("textarea").fill("Krank");
  await karte.getByRole("button", { name: "Abmeldung bestätigen" }).click();
  await handy.getByText("Deine Abmeldung ist gespeichert").waitFor();
  ok(sql(`select status from registrations r join participants p on p.id = r.participant_id where p.email = 'amina@example.test' and r.module_id = '${demo}'`) === "excused", "Abgemeldet (entschuldigt)");
  const bestaetigung = (await mailsAn("amina@example.test", "Abmeldung gespeichert"))[0];
  ok(bestaetigung?.Text.includes("zurücknehmen") && bestaetigung.Text.includes(`/ticket/${link}/`), "Bestätigungsmail mit Weg zurück");
  await handy.locator("li", { hasText: "Demokratie" }).getByRole("button", { name: "Doch teilnehmen" }).click();
  await handy.getByText("Schön, dass du doch dabei bist").waitFor();
  ok(sql(`select status from registrations r join participants p on p.id = r.participant_id where p.email = 'amina@example.test' and r.module_id = '${demo}'`) === "confirmed", "Doch teilnehmen: wieder bestätigt");

  // b2) Ohne JavaScript (Skripte noch nicht geladen): das Formular muss trotzdem durchgehen
  const ohneJs = await (await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })).newPage();
  await ohneJs.goto(`${BASIS}/ticket/${link}/`);
  await ohneJs.locator("li", { hasText: "Demokratie" }).locator("details").evaluate((d) => d.setAttribute("open", ""));
  await ohneJs.locator("li", { hasText: "Demokratie" }).getByRole("button", { name: "Abmeldung bestätigen" }).click();
  await ohneJs.getByText("Deine Abmeldung ist gespeichert").waitFor();
  await ohneJs.locator("li", { hasText: "Demokratie" }).getByRole("button", { name: "Doch teilnehmen" }).click();
  await ohneJs.getByText("Schön, dass du doch dabei bist").waitFor();
  ok(true, "Abmelden und zurücknehmen auch ohne JavaScript");

  // c) Mein Bereich: abmelden und zurücknehmen angemeldet
  const mb = await portalLogin(browser, "amina@example.test");
  ok((await mb.locator("a", { hasText: "Ticket-Seite öffnen" }).getAttribute("href")) === `/ticket/${link}/`, "Mein Bereich verlinkt den Mail-Link");
  const mbKarte = mb.locator("#module li", { hasText: "Demokratie" });
  await mbKarte.getByText("Ich kann nicht teilnehmen").click();
  await mbKarte.getByRole("button", { name: "Abmeldung bestätigen" }).click();
  await mb.getByText("Deine Abmeldung ist gespeichert").waitFor();
  await mb.locator("#module li", { hasText: "Demokratie" }).getByRole("button", { name: "Doch teilnehmen" }).click();
  await mb.getByText("Schön, dass du doch dabei bist").waitFor();
  ok(true, "Mein Bereich: abmelden und zurücknehmen");
  ok(await keinUeberlauf(mb), "Mein Bereich am Handy ohne seitliches Scrollen");
}

await browser.close();
console.log(fehler ? `\n${fehler} Fehler` : "\nAlles in Ordnung.");
process.exit(fehler ? 1 : 0);
