// Ende-zu-Ende-Test Kommission ↔ Teilnehmende (headless): Abgaben, Material, Regieplan/Tagesordnung, Hotel, Rollen-Weiterleitung.
// Erwartet: frische DB (supabase db reset), `next start -p 3100` (oder BASIS=http://localhost:PORT).
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const BASIS = process.env.BASIS ?? "http://localhost:3100";
const MAILPIT = "http://127.0.0.1:55324/api/v1";
let fehler = 0;
const ok = (bedingung, text) => {
  console.log(`${bedingung ? "ok  " : "FEHLER"} ${text}`);
  if (!bedingung) fehler++;
};
const pdf = (name) => ({ name, mimeType: "application/pdf", buffer: Buffer.from(`%PDF-1.4\n% ${name}\n%%EOF\n`) });

async function teamLogin(browser, email) {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${BASIS}/team/login/`);
  await page.fill("#email", email);
  await page.fill("#passwort", "test1234");
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASIS}/team/`);
  return page;
}

async function portalLogin(browser, email) {
  await fetch(`${MAILPIT}/messages`, { method: "DELETE" });
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${BASIS}/mein-bereich/login/`);
  await page.fill("input[name=email]", email);
  await page.click("form button");
  await page.locator("input[name=code]").waitFor();
  let code = null;
  for (let i = 0; i < 20 && !code; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const liste = await fetch(`${MAILPIT}/messages`).then((x) => x.json());
    const m = liste.messages.find((x) => x.To[0].Address === email);
    if (m) code = (await fetch(`${MAILPIT}/message/${m.ID}`).then((x) => x.json())).Text.match(/\b(\d{6})\b/)?.[1];
  }
  if (!code) {
    // Rückfall, falls die eigene Mailvorlage (supabase/templates/anmeldung.html) lokal nicht geladen ist:
    // frischen 6-stelligen Code über die Admin-API der lokalen Supabase erzeugen (ersetzt den gerade verschickten).
    const status = JSON.parse(execSync("supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
    const r = await fetch(`${status.API_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { apikey: status.SERVICE_ROLE_KEY, Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", email }),
    }).then((x) => x.json());
    code = r.email_otp ?? r.properties?.email_otp;
  }
  await page.fill("input[name=code]", code ?? "000000");
  await page.click("form button");
  await page.waitForURL(`${BASIS}/mein-bereich/`);
  return page;
}

const browser = await chromium.launch();
const admin = await teamLogin(browser, "admin@ses.test");

// 1. Kommission: Hausaufgabe nur PDF + Text
await admin.goto(`${BASIS}/team/hausaufgaben/`);
await admin.fill("#number", "7");
await admin.fill("#title", "Essay Demokratie");
await admin.fill("#description", "Schreibe eine Seite zu Populismus.");
await admin.locator("label", { hasText: "Word (DOCX)" }).click();
await admin.locator("label", { hasText: "Link (z. B. Video)" }).click();
await admin.locator("form:has(#title) button").click();
await admin.waitForURL(/\/team\/hausaufgaben\/[0-9a-f-]{36}\//);
const aufgabeUrl = admin.url().split("?")[0];
ok(true, "Hausaufgabe mit Formaten PDF + Text angelegt");

// 2. Material: eines freigeschaltet, eines verborgen
await admin.goto(`${BASIS}/team/material/`);
await admin.setInputFiles("#datei", pdf("reader.pdf"));
await admin.fill("#title", "Reader Demokratie");
await admin.check("input[type=checkbox][name=published]");
await admin.click("button:has-text('Hochladen')");
await admin.locator("table", { hasText: "Reader Demokratie" }).waitFor();
await admin.reload();
await admin.setInputFiles("#datei", pdf("entwurf.pdf"));
await admin.fill("#title", "Interner Entwurf");
await admin.click("button:has-text('Hochladen')");
await admin.locator("table", { hasText: "Interner Entwurf" }).waitFor();
ok((await admin.getByText("✓ freigeschaltet").count()) === 1 && (await admin.getByText("verborgen").count()) === 1, "Material: 1 freigeschaltet, 1 verborgen");

// 3. Regieplan (Standard: nächstes Modul = Demokratie): ein sichtbarer, ein verborgener Punkt, interne Notiz
await admin.goto(`${BASIS}/team/regieplan/`);
await admin.locator("nav[aria-label='Modul wählen'] a", { hasText: "Demokratie" }).click();
await admin.locator("h1", { hasText: "Demokratie" }).waitFor();
ok(true, "Regieplan: Modul Demokratie gewählt");
const neu = admin.locator("section").first().locator("form").last();
await neu.locator("[name=starts_at]").fill("09:30");
await neu.locator("[name=ends_at]").fill("10:00");
await neu.locator("[name=title]").fill("Begrüßung und Keynote");
await neu.locator("[name=location]").fill("Saal A");
await neu.locator("[name=responsible]").fill("Furkan GEHEIM");
await neu.locator("[name=note]").fill("Mikro 2 testen GEHEIM");
await neu.locator("button:has-text('Hinzufügen')").click();
await admin.getByText("Gespeichert.").waitFor();
const neu2 = admin.locator("section").first().locator("form").last();
await neu2.locator("[name=starts_at]").fill("12:00");
await neu2.locator("[name=title]").fill("Orga-Besprechung VERBORGEN");
await neu2.locator("[name=published]").uncheck();
await neu2.locator("button:has-text('Hinzufügen')").click();
await admin.getByText("1/2 sichtbar").waitFor();
ok(true, "Regieplan: 2 Punkte, 1 sichtbar");

// 4. Hotel: Amina + Yusuf im selben Zimmer, noch nicht freigegeben
await admin.goto(`${BASIS}/team/hotel/`);
await admin.locator("nav[aria-label='Modul wählen'] a", { hasText: "Demokratie" }).click();
await admin.locator("h1", { hasText: "Demokratie" }).waitFor();
for (const [name, code] of [["Amina", "4711"], ["Yusuf", "4711"]]) {
  const zeile = admin.locator("form", { hasText: name });
  await zeile.locator("[name=hotel_name]").fill("Hotel Rhein");
  await zeile.locator("[name=room_number]").fill("204");
  await zeile.locator("[name=room_pin_code]").fill(code);
  await zeile.locator("[name=check_in_info]").fill("Check-in ab 15 Uhr");
  await zeile.locator("button:has-text('Zuweisen')").click();
  await admin.getByText("Gespeichert.").waitFor();
}
ok(await admin.getByText("noch nicht freigegeben").isVisible(), "Hotel: Zimmer zugewiesen, noch nicht live");

// 5. Amina: Portal
const amina = await portalLogin(browser, "amina@example.test");
let html = await amina.content();
ok(!html.includes("Hotel Rhein") && !html.includes("4711"), "Teilnehmerin: Zimmer vor Freigabe unsichtbar");
ok(html.includes("Reader Demokratie") && !html.includes("Interner Entwurf"), "Teilnehmerin: nur freigeschaltetes Material");
ok(!html.includes("GEHEIM") && !html.includes("VERBORGEN"), "Teilnehmerin: keine internen Regieplan-Daten im HTML");
await amina.locator("li", { hasText: "Demokratie" }).getByText("Tagesordnung ansehen").click();
ok(await amina.getByText("Begrüßung und Keynote").isVisible(), "Teilnehmerin: Tagesordnung sichtbar");
await amina.locator("li", { hasText: "Demokratie" }).getByText("Tagesordnung ansehen").waitFor();
const karte = amina.locator("details", { hasText: "Essay Demokratie" });
await karte.locator("summary").click();
ok(await karte.getByText("Offen").isVisible(), "Status vor Abgabe: Offen");
ok((await karte.locator("[name=link]").count()) === 0 && (await karte.locator("[name=text]").count()) === 1, "Formular zeigt nur erlaubte Formate (Text + Datei, kein Link)");
await karte.locator("[name=text]").fill("Populismus vereinfacht komplexe Fragen.");
await karte.locator("input[type=file]").setInputFiles(pdf("essay-amina.pdf"));
await karte.locator("button:has-text('Abgeben')").click();
await amina.getByText("Abgabe eingereicht").waitFor();
await amina.reload();
const karte2 = amina.locator("details", { hasText: "Essay Demokratie" });
await karte2.locator("summary").click();
ok(await karte2.getByText("Eingereicht").first().isVisible(), "Status nach Abgabe: Eingereicht");
const eigeneDatei = await karte2.locator("a", { hasText: "essay-amina.pdf" }).getAttribute("href");
const r1 = await amina.request.get(`${BASIS}${eigeneDatei}`);
ok(r1.ok() && (await r1.text()).includes("essay-amina.pdf"), "Teilnehmerin kann eigene Datei herunterladen");

// Rollen-Weiterleitung
for (const pfad of ["/team/", "/team/hotel/", "/team/material/", "/team/login/", "/dashboard/"]) {
  await amina.goto(`${BASIS}${pfad}`);
  ok(amina.url() === `${BASIS}/mein-bereich/`, `Teilnehmerin ${pfad} → /mein-bereich/`);
}
const r2 = await amina.request.get(`${BASIS}/team/datei/?abgabe=${eigeneDatei.split("=")[1]}`, { maxRedirects: 0 });
ok(r2.status() === 307 && r2.headers().location?.includes("/mein-bereich/"), "Teilnehmerin: Kommissions-Download gesperrt");

// 6. Kommission sieht die Abgabe und lädt sie herunter
await admin.goto(aufgabeUrl);
ok(await admin.getByText("selbst eingereicht").isVisible(), "Kommission sieht Teilnehmer-Abgabe");
const dl = await admin.locator("a", { hasText: "essay-amina.pdf" }).getAttribute("href");
const r3 = await admin.request.get(`${BASIS}${dl}`);
ok(r3.ok() && (await r3.text()).includes("essay-amina.pdf"), "Kommission lädt Abgabe herunter");
await admin.goto(`${BASIS}/dashboard/`);
ok(admin.url() === `${BASIS}/team/`, "Kommission /dashboard → /team/");

// 7. Yusuf darf Aminas Datei nicht holen
const yusuf = await portalLogin(browser, "yusuf@example.test");
const r4 = await yusuf.request.get(`${BASIS}${eigeneDatei}`, { maxRedirects: 0 });
ok(r4.status() === 404, "Anderer Teilnehmer: fremde Abgabe → 404");

// 8. Hotel freigeben → Amina sieht Zimmer, Code und Mitbewohner
await admin.goto(`${BASIS}/team/hotel/`);
await admin.locator("nav[aria-label='Modul wählen'] a", { hasText: "Demokratie" }).click();
await admin.locator("h1", { hasText: "Demokratie" }).waitFor();
await admin.click("button:has-text('Für Teilnehmende freigeben')");
await admin.getByText("live in den Teilnehmer-Dashboards").waitFor();
await amina.goto(`${BASIS}/mein-bereich/`);
html = await amina.locator("body").innerText();
ok(html.includes("Hotel Rhein · Zimmer 204") && html.includes("4711") && html.includes("Yusuf"), "Nach Freigabe: Zimmer, Tür-Code und Mitbewohner sichtbar");

// 9. Abgestufte Kommissionsrechte
const orga = await teamLogin(browser, "orga@ses.test");
await orga.goto(`${BASIS}/team/hotel/`);
ok(orga.url().includes("fehler=rechte"), "Orga-Team: kein Zugriff auf Hotel/Türcodes");
await orga.goto(`${BASIS}/team/material/`);
ok(orga.url().startsWith(`${BASIS}/team/material/`), "Orga-Team: Material erlaubt");
const helfer = await teamLogin(browser, "helfer@ses.test");
await helfer.goto(`${BASIS}/team/regieplan/`);
ok(helfer.url().includes("fehler=rechte"), "Einlass-Helfer: kein Regieplan");

await browser.close();
console.log(fehler ? `\n${fehler} FEHLER` : "\nAlles ok.");
process.exit(fehler ? 1 : 0);
