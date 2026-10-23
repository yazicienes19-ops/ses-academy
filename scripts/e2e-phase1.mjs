// Ende-zu-Ende-Test Phase 1 (headless). Erwartet: frische DB (supabase db reset), `next start -p 3100`.
// Aufruf aus dem Projektordner: node <dieses-skript>
import { chromium } from "playwright";

const BASIS = "http://localhost:3100";
const MAILPIT = "http://127.0.0.1:55324/api/v1";
let fehler = 0;
const ok = (bedingung, text) => {
  console.log(`${bedingung ? "ok  " : "FEHLER"} ${text}`);
  if (!bedingung) fehler++;
};

async function mails() {
  const r = await fetch(`${MAILPIT}/messages`).then((x) => x.json());
  return Promise.all(r.messages.map((m) => fetch(`${MAILPIT}/message/${m.ID}`).then((x) => x.json())));
}

async function login(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASIS}/team/login/`);
  await page.fill("#email", email);
  await page.fill("#passwort", "test1234");
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASIS}/team/`);
  return page;
}

const browser = await chromium.launch();
await fetch(`${MAILPIT}/messages`, { method: "DELETE" });

// 1. Bewerbung über die öffentliche Seite
const besucher = await (await browser.newContext()).newPage();
await besucher.goto(`${BASIS}/bewerbung/`);
const ausfuellen = async (email) => {
  await besucher.fill("#vorname", "Testa");
  await besucher.fill("#nachname", "Neumann");
  await besucher.fill("#email", email);
  await besucher.fill("#geburtsjahr", "2003");
  await besucher.fill("#land", "Deutschland");
  await besucher.fill("#stadt", "Köln");
  await besucher.fill("#motivation", "Ich möchte Gesellschaft mitgestalten.");
  await besucher.check("input[name=einwilligung]");
  await besucher.click("form button[type=submit]");
};
await ausfuellen("Testa.Neumann@Example.test ");
await besucher.getByText("Deine Bewerbung ist bei uns eingegangen").waitFor({ timeout: 15000 });
ok(true, "Bewerbung abgeschickt, Dankeschön sichtbar");

await besucher.reload();
await ausfuellen("testa.neumann@example.test");
await besucher.getByText("bereits eine Bewerbung").waitFor({ timeout: 15000 });
ok(await besucher.inputValue("#motivation") !== "", "Doppelte Bewerbung erkannt, Eingaben bleiben stehen");

let alle = await mails();
ok(alle.some((m) => m.Subject === "Deine Bewerbung ist eingegangen" && m.To[0].Address === "testa.neumann@example.test"),
  "Eingangsbestätigung per Mail (E-Mail normalisiert)");

// 2. Rechte: ohne Login und als Helfer
const anonym = await (await browser.newContext()).newPage();
await anonym.goto(`${BASIS}/team/einlass/`);
ok(anonym.url().endsWith("/team/login/"), "Ohne Login: Einlass leitet zum Login");

const helfer = await login(browser, "helfer@ses.test");
await helfer.goto(`${BASIS}/team/bewerbungen/`);
ok(helfer.url().includes("fehler=rechte"), "Helfer kommt nicht an Bewerbungen");
ok(!(await helfer.getByRole("link", { name: "Bewerbungen" }).count()), "Helfer sieht keinen Bewerbungen-Link");

// 3. Admin nimmt an, Ticket-Mail kommt
const admin = await login(browser, "admin@ses.test");
await admin.goto(`${BASIS}/team/bewerbungen/`);
const karte = admin.locator("li", { hasText: "Testa Neumann" });
await karte.getByRole("button", { name: "Annehmen und Ticket senden" }).click();
await admin.getByText("Angenommen. Die Person ist für alle kommenden Module angemeldet").waitFor({ timeout: 15000 });
ok(true, "Annahme bestätigt");

alle = await mails();
const ticketMail = alle.find((m) => m.Subject === "Dein Ticket für die SES Academy");
ok(Boolean(ticketMail), "Ticket-Mail verschickt");
ok(ticketMail?.Attachments?.length + (ticketMail?.Inline?.length ?? 0) >= 1, "QR-Code hängt als Bild an");
const link = ticketMail?.Text.match(/http:\/\/localhost:3000(\/ticket\/[0-9a-f-]{36}\/)/)?.[1];
const kurzcode = ticketMail?.Text.match(/Kurzcode: ([0-9A-F]{4}-[0-9A-F]{4})/)?.[1];
ok(Boolean(link && kurzcode), `Mail enthält Link und Kurzcode (${kurzcode})`);
ok(ticketMail?.Text.includes("Demokratie") && ticketMail?.Text.includes("Winter School"), "Mail listet die kommenden Module");

// 4. Ticket-Seite
await besucher.goto(`${BASIS}${link}`);
ok(await besucher.locator("svg").first().isVisible(), "Ticket-Seite zeigt QR-Code");
ok(await besucher.getByText(kurzcode).isVisible(), "Ticket-Seite zeigt Kurzcode");
const demokratie = besucher.locator("li", { hasText: "Demokratie" });
await demokratie.getByText("Ich kann nicht teilnehmen").click();
await demokratie.locator("textarea").fill("Familienfeier");
await demokratie.getByRole("button", { name: "Abmeldung bestätigen" }).click();
await besucher.getByText("Deine Abmeldung ist gespeichert").waitFor({ timeout: 15000 });
ok(await besucher.locator("li", { hasText: "Demokratie" }).getByText("Entschuldigt").isVisible(), "Selbst entschuldigt, Status sichtbar");

// 5. Einlass als Helfer: nur Scanner, Code, Zähler
await helfer.goto(`${BASIS}/team/einlass/`);
ok(!(await helfer.getByText("Anwesenheitsliste").count()), "Helfer sieht keine Anwesenheitsliste");
ok(await helfer.getByRole("button", { name: "Kamera starten" }).isVisible(), "Scanner vorhanden");
const pruefe = async (code) => {
  await helfer.fill("#kurzcode", code);
  await helfer.click("form button:has-text('Prüfen')");
  await helfer.waitForTimeout(1500);
  return helfer.locator("[role=status][aria-live=assertive]").innerText();
};
let karteText = await pruefe(kurzcode.toLowerCase());
ok(/Testa Neumann/.test(karteText) && /Erfolgreich eingecheckt um \d\d:\d\d:\d\d Uhr/.test(karteText), "Kurzcode klein mit Bindestrich: grün mit Name und Uhrzeit");
ok(/Academy-Teilnehmer:in/.test(karteText) && /Probe-Einlass/.test(karteText), "Karte zeigt Zugehörigkeit und Veranstaltung");
const ersteZeit = karteText.match(/\d\d:\d\d:\d\d/)?.[0];
karteText = await pruefe(kurzcode.replace("-", " "));
ok(/Bereits eingecheckt um/.test(karteText) && karteText.includes(ersteZeit), "Zweitscan: gelb mit ursprünglicher Uhrzeit");
karteText = await pruefe("hallo");
ok(/Ungültiger Code/.test(karteText), "Unsinn: rot, ungültig");
ok(/1 von|2 von|3 von|4 von|5 von/.test(await helfer.locator("[aria-label='Live-Stand']").innerText()), "Zähler sichtbar");

// 6. Einlass als Orga: Liste, Warteliste, abhaken, zurücknehmen
const orga = await login(browser, "orga@ses.test");
await orga.goto(`${BASIS}/team/einlass/`);
ok(await orga.getByText("Anwesenheitsliste").isVisible(), "Orga sieht Anwesenheitsliste");
const wartezeile = orga.locator("li", { hasText: "Gast Warteliste" });
ok(await wartezeile.getByText(/· Warteliste$/).isVisible() && !(await wartezeile.getByRole("button", { name: "Abhaken" }).count()),
  "Warteliste: kein Abhaken möglich");
await orga.locator("li", { hasText: "Leila Haddad" }).getByRole("button", { name: "Abhaken" }).click();
await orga.locator("li", { hasText: "Leila Haddad" }).getByText(/da seit/).waitFor({ timeout: 10000 });
ok(true, "Orga hakt manuell ab");
orga.once("dialog", (d) => d.accept());
await orga.locator("li", { hasText: "Leila Haddad" }).getByRole("button", { name: "zurücknehmen" }).click();
await orga.locator("li", { hasText: "Leila Haddad" }).getByRole("button", { name: "Abhaken" }).waitFor({ timeout: 10000 });
ok(true, "Orga nimmt Check-in zurück");

// 7. Modul ohne Ticket: kein Scanner
const ohne = await orga.locator("#tag option", { hasText: "Probe ohne Ticket" }).getAttribute("value");
await orga.goto(`${BASIS}/team/einlass/?tag=${ohne}`);
ok(await orga.getByText("Für dieses Modul gibt es kein Ticket").isVisible() && !(await orga.getByRole("button", { name: "Kamera starten" }).count()),
  "Modul ohne Ticket: Hinweis statt Scanner");

await browser.close();
console.log(fehler === 0 ? "\nALLES GRÜN" : `\n${fehler} FEHLER`);
process.exit(fehler ? 1 : 0);
