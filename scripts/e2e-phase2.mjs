// Ende-zu-Ende-Test Phase 2 (headless). Erwartet: frische DB (supabase db reset), `next start -p 3100`.
import { chromium } from "playwright";

const BASIS = "http://localhost:3100";
const MAILPIT = "http://127.0.0.1:55324/api/v1";
let fehler = 0;
const ok = (bedingung, text) => {
  console.log(`${bedingung ? "ok  " : "FEHLER"} ${text}`);
  if (!bedingung) fehler++;
};
const mails = async () => {
  const r = await fetch(`${MAILPIT}/messages`).then((x) => x.json());
  return Promise.all(r.messages.map((m) => fetch(`${MAILPIT}/message/${m.ID}`).then((x) => x.json())));
};
const mailsAn = async (adresse) => (await mails()).filter((m) => m.To[0].Address === adresse);

async function login(browser, email, passwort = "test1234") {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${BASIS}/team/login/`);
  await page.fill("#email", email);
  await page.fill("#passwort", passwort);
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASIS}/team/`);
  return page;
}

const browser = await chromium.launch();
await fetch(`${MAILPIT}/messages`, { method: "DELETE" });
const admin = await login(browser, "admin@ses.test");

// 1. Neues Modul anlegen, Termin, veröffentlichen: Jahrgang wird automatisch angemeldet
await admin.goto(`${BASIS}/team/module/`);
await admin.fill("#title", "Testmodul Phase 2");
await admin.fill("#slug", "testmodul-phase-2");
await admin.click("button:has-text('Modul anlegen')");
await admin.getByText("Modul angelegt").waitFor();
ok(true, "Modul angelegt (Entwurf)");
await admin.fill("#day", "2027-03-14");
await admin.fill("#von", "09:30");
await admin.fill("#bis", "17:00");
await admin.click("button:has-text('Termin eintragen')");
await admin.getByText("Termin eingetragen").waitFor();
ok(await admin.getByText("09:30 bis 17:00 Uhr").isVisible(), "Termin in Berliner Zeit gespeichert und angezeigt");
await admin.selectOption("#status", "published");
await admin.click("button:has-text('Speichern')");
await admin.getByText("3 angenommene Teilnehmende wurden automatisch angemeldet").waitFor();
ok(true, "Veröffentlichen meldet den Jahrgang automatisch an");

// 2. Demokratie für Gäste öffnen, genau ein freier Platz (3 Jahrgang + 1)
await admin.goto(`${BASIS}/team/module/`);
await admin.locator("a", { hasText: "Demokratie" }).click();
await admin.waitForURL(/\/team\/module\/[0-9a-f-]{36}\//);
await admin.check("input[name=open_registration]");
await admin.fill("#capacity", "4");
await admin.click("button:has-text('Speichern')");
await admin.getByText("Gespeichert.").waitFor();
ok(true, "Demokratie für Gäste geöffnet, Kapazität 4");

const besucher = await (await browser.newContext()).newPage();
await besucher.goto(`${BASIS}/seminar/demokratie/`);
await besucher.getByText("Noch 1 Platz frei").waitFor({ timeout: 10000 });
ok(true, "Seminarseite zeigt Anmeldung mit freien Plätzen");
await besucher.goto(`${BASIS}/seminar/verfassungen/`);
await besucher.waitForTimeout(1500);
ok(!(await besucher.getByText("Jetzt anmelden").count()), "Vergangenes, geschlossenes Modul zeigt kein Formular");

const anmelden = async (seite, vorname, email) => {
  await seite.goto(`${BASIS}${seite === besucher ? "" : ""}/seminar/demokratie/`);
  await seite.locator("#anm-vorname").waitFor();
  await seite.fill("#anm-vorname", vorname);
  await seite.fill("#anm-nachname", "Gast");
  await seite.fill("#anm-email", email);
  await seite.check("#anmeldung input[name=einwilligung]");
  await seite.click("#anmeldung button[type=submit]");
  await seite.locator("#anmeldung [role=status]").waitFor({ timeout: 15000 });
  return seite.locator("#anmeldung [role=status]").innerText();
};
let text = await anmelden(besucher, "Anna", "anna@example.test");
ok(text.includes("Du bist angemeldet"), "Gast A angemeldet");
const enPage = await (await browser.newContext()).newPage();
await enPage.goto(`${BASIS}/en/seminar/demokratie/`);
await enPage.getByText("Fully booked").waitFor({ timeout: 10000 });
ok(true, "Englische Seite: ausgebucht-Hinweis");
await enPage.fill("#anm-vorname", "Ben");
await enPage.fill("#anm-nachname", "Guest");
await enPage.fill("#anm-email", "ben@example.test");
await enPage.check("#anmeldung input[name=einwilligung]");
await enPage.click("#anmeldung button[type=submit]");
await enPage.getByText("You are on the waiting list").waitFor({ timeout: 15000 });
ok(true, "Gast B (englisch) auf der Warteliste");

text = await anmelden(await (await browser.newContext()).newPage(), "Anna", "ANNA@example.test");
ok(text.includes("schon angemeldet"), "Doppelte Anmeldung erkannt (E-Mail normalisiert)");

let anna = await mailsAn("anna@example.test");
const ben = await mailsAn("ben@example.test");
ok(anna.length === 1, `Gast A: genau eine Ticket-Mail trotz zweiter Anmeldung (Spam-Schutz) [${anna.length}]`);
ok(ben.length === 1 && ben[0].Subject === "Your ticket for the SES Academy" && ben[0].Text.includes("Waiting list"),
  "Gast B: englische Mail mit Status Warteliste");

// 3. A meldet sich ab, B rückt nach und bekommt sein Ticket
const link = anna[0].Text.match(/http:\/\/localhost:3000(\/ticket\/[0-9a-f-]{36}\/)/)[1];
await besucher.goto(`${BASIS}${link}`);
const zeile = besucher.locator("li", { hasText: "Demokratie" });
await zeile.getByText("Ich kann nicht teilnehmen").click();
await zeile.getByRole("button", { name: "Abmeldung bestätigen" }).click();
await besucher.getByText("Deine Abmeldung ist gespeichert").waitFor();
ok(await besucher.locator("li", { hasText: "Demokratie" }).getByText("Abgemeldet").isVisible(), "Gast A abgemeldet (Gäste: abgemeldet, nicht entschuldigt)");
await besucher.waitForTimeout(1500);
const benNeu = await mailsAn("ben@example.test");
ok(benNeu.length === 2 && benNeu.some((m) => m.Text.includes("(Registered)")), "Gast B rückt nach und bekommt Ticket als angemeldet");

// 4. Ticket verloren
const verloren = await (await browser.newContext()).newPage();
for (const adresse of ["amina@example.test", "niemand@example.test"]) {
  await verloren.goto(`${BASIS}/ticket/?sprache=de`);
  await verloren.fill("#email", adresse);
  await verloren.click("button[type=submit]");
  await verloren.getByText("Wenn es zu dieser Adresse eine Anmeldung gibt").waitFor();
}
ok((await mailsAn("amina@example.test")).length === 1, "Ticket verloren: Mail an bekannte Adresse");
ok((await mailsAn("niemand@example.test")).length === 0, "Ticket verloren: unbekannte Adresse bekommt nichts, gleiche Meldung");

// 5. Team-Konto anlegen, einloggen, Passwort ändern
await admin.goto(`${BASIS}/team/team/`);
await admin.fill("input[name=name]", "Neue Helferin");
await admin.fill("input[name=email]", "neu@ses.test");
await admin.fill("input[name=passwort]", "startpasswort1");
await admin.click("button:has-text('Anlegen')");
await admin.getByText("Konto angelegt").waitFor();
const neu = await login(browser, "neu@ses.test", "startpasswort1");
ok(await neu.getByText("Neue Helferin · Einlass-Helfer:in").isVisible(), "Neues Konto kann sich als Helferin anmelden");
await neu.goto(`${BASIS}/team/passwort/`);
await neu.fill("#neu", "meinneuespasswort");
await neu.fill("#wiederholung", "meinneuespasswort");
await neu.click("button:has-text('Speichern')");
await neu.getByText("Passwort geändert.").waitFor();
await login(browser, "neu@ses.test", "meinneuespasswort");
ok(true, "Passwort geändert, Login mit neuem Passwort");
const vorstand = await login(browser, "vorstand@ses.test");
ok(!(await vorstand.getByRole("link", { name: "Team", exact: true }).count()) && (await vorstand.getByRole("link", { name: "Module" }).count()) > 0,
  "Vorstand sieht Module, aber nicht die Teamverwaltung");
await vorstand.goto(`${BASIS}/team/team/`);
ok(vorstand.url().includes("fehler=rechte"), "Vorstand kommt nicht in die Teamverwaltung");

await browser.close();
console.log(fehler === 0 ? "\nALLES GRÜN" : `\n${fehler} FEHLER`);
process.exit(fehler ? 1 : 0);
