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

// ---------------------------------------------------------------------------
// 2./15. Info-Mail statt „Tickets an alle“: kein Doppelversand, Bestätigung, gesperrt nach Absage
// ---------------------------------------------------------------------------
if (teil("infomail")) {
  await mailsLeeren();
  const winter = sql("select id from modules where slug = 'winter-school'");
  sql(`delete from email_log where kind in ('info', 'ticket') and module_id = '${winter}'`); // frühere Läufe
  const admin = await teamLogin(browser, "admin@ses.test");
  await admin.goto(`${BASIS}/team/module/${winter}/infomail/`);
  const form = admin.locator("form", { hasText: "Info-Mail jetzt senden" });
  ok(await form.locator("input[name=bestaetigt][required]").count() === 1, "Versand nur mit ausdrücklicher Bestätigung (Pflichthäkchen)");
  await form.locator("input[value=alle]").check();
  await form.locator("input[name=bestaetigt]").check();
  await form.getByRole("button", { name: "Info-Mail jetzt senden" }).click();
  await admin.getByText(/Info-Mails verschickt/).waitFor();
  const erste = (await fetch(`${MAILPIT}/messages`).then((x) => x.json())).messages_count;
  ok(erste >= 3, `Erster Versand für ein Modul in mehr als 30 Tagen: ${erste} Mails`);
  await form.locator("input[value=alle]").check();
  await form.locator("input[name=bestaetigt]").check();
  await form.getByRole("button", { name: "Info-Mail jetzt senden" }).click();
  await admin.getByText("0 Info-Mails verschickt").waitFor();
  const zweite = (await fetch(`${MAILPIT}/messages`).then((x) => x.json())).messages_count;
  ok(zweite === erste, "Zweiter Klick schickt nichts doppelt");

  // Absagen: Versand gesperrt, Modul in Mein Bereich nicht mehr unter „Kommende Module“
  const alteSeite = await admin.context().newPage(); // vor der Absage geöffnet, danach abgeschickt
  await alteSeite.goto(`${BASIS}/team/module/${winter}/infomail/`);
  await admin.goto(`${BASIS}/team/module/${winter}/`);
  const absage = admin.locator("form", { hasText: "Ja, das Modul wirklich absagen" });
  await absage.locator("input[name=benachrichtigen]").uncheck();
  await absage.locator("input[name=bestaetigt]").check();
  await absage.getByRole("button", { name: "Absagen" }).click();
  await admin.getByText("Modul abgesagt.").waitFor();
  ok(await admin.getByText("Info-Mail: Modul abgesagt").isVisible() && await admin.getByRole("link", { name: "Info-Mail: Vorschau und Versand" }).count() === 0, "Modulseite: Info-Mail nach Absage nicht mehr klickbar");
  sql(`delete from email_log where kind = 'info' and module_id = '${winter}'`);
  const altForm = alteSeite.locator("form", { hasText: "Info-Mail jetzt senden" });
  await altForm.locator("input[value=alle]").check();
  await altForm.locator("input[name=bestaetigt]").check();
  await altForm.getByRole("button", { name: "Info-Mail jetzt senden" }).click();
  await alteSeite.getByText("Das Modul ist abgesagt. Es wurde nichts verschickt.").waitFor();
  ok((await fetch(`${MAILPIT}/messages`).then((x) => x.json())).messages_count === zweite, "Server lehnt Versand nach Absage ab (veraltete Seite)");
  await admin.goto(`${BASIS}/team/module/${winter}/infomail/`);
  ok(await admin.getByText("Das Modul ist abgesagt. Info-Mails gehen dafür nicht mehr raus.").isVisible()
    && await admin.getByRole("button", { name: "Info-Mail jetzt senden" }).count() === 0, "Info-Mail-Seite: kein Versandknopf nach Absage");
  const mb = await portalLogin(browser, "yusuf@example.test");
  const kommende = mb.locator("#module");
  ok(await kommende.getByText("Dieses Modul wurde abgesagt. Dein Ticket gilt dafür nicht mehr.").isVisible(), "Mein Bereich: Absage sichtbar");
  ok(await kommende.locator("li", { hasText: "Winter School" }).locator("details").count() === 0, "Mein Bereich: abgesagtes Modul nicht als kommendes Modul mit Abmelden");
  await admin.goto(`${BASIS}/team/module/${winter}/`);
  await admin.getByRole("button", { name: "Absage zurücknehmen" }).click();
  await admin.getByText("Absage zurückgenommen.").waitFor();
}

// ---------------------------------------------------------------------------
// 5. Feedback-Umfrage: leeres Formular zählt nicht, gespeicherte Antworten sichtbar
// ---------------------------------------------------------------------------
if (teil("feedback")) {
  sql("delete from feedback_surveys where module_id = (select id from modules where slug = 'skills-workshop')");
  const umfrage = sql(`select set_config('request.jwt.claims', json_build_object('sub', (select user_id from staff_members where role = 'admin' limit 1), 'role', 'authenticated')::text, false);
    select public.create_feedback_survey((select id from modules where slug = 'skills-workshop'), now() - interval '1 hour', now() + interval '7 days')`).split("\n").at(-1);
  const amina = sql("select link_token from participants where email = 'amina@example.test'");
  const leila = sql("select link_token from participants where email = 'leila@example.test'");
  const antworten = () => Number(sql(`select count(*) from feedback_responses where survey_id = '${umfrage}'`));
  const seite = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await seite.goto(`${BASIS}/feedback/${amina}/${umfrage}/`);
  await seite.getByRole("button", { name: "Antwort absenden" }).click();
  await seite.getByText("Bitte beantworte mindestens eine Frage").waitFor();
  ok(antworten() === 0, "Leeres Formular wird nicht gespeichert");
  await seite.locator("fieldset").nth(0).getByText("gut", { exact: true }).click();
  await seite.locator("fieldset textarea").first().fill("Die Gruppenarbeit");
  await seite.getByRole("button", { name: "Antwort absenden" }).click();
  await seite.getByText("Deine Antwort ist gespeichert").waitFor();
  ok(antworten() === 1, "Antwort gespeichert");
  ok(await seite.locator("fieldset").nth(0).locator("input[value='4']").isChecked() && (await seite.locator("fieldset textarea").first().inputValue()) === "Die Gruppenarbeit",
    "Nach dem Absenden bleiben die Antworten im Formular stehen");
  await seite.reload();
  ok(await seite.getByText("Deine Antwort ist schon gespeichert").isVisible(), "Beim erneuten Öffnen: Hinweis auf gespeicherte Antwort");
  ok(await seite.locator("fieldset").nth(0).locator("input[value='4']").isChecked() && (await seite.locator("fieldset textarea").first().inputValue()) === "Die Gruppenarbeit",
    "Beim erneuten Öffnen sind die Antworten vorausgefüllt");
  ok(await keinUeberlauf(seite), "Feedback am Handy ohne seitliches Scrollen");
  await seite.goto(`${BASIS}/feedback/${leila}/${umfrage}/`);
  ok(await seite.getByText("Antworten können nur Personen, die beim Modul eingecheckt waren").isVisible() && await seite.locator("form").count() === 0,
    "Nicht anwesend: Hinweis gleich zu Beginn, kein Formular");
  sql(`delete from feedback_surveys where id = '${umfrage}'`);
}

// ---------------------------------------------------------------------------
// 6. Login: Code erneut senden (mit Wartezeit), Spam-Hinweis
// ---------------------------------------------------------------------------
if (teil("login")) {
  await mailsLeeren();
  const codeAus = async (anzahl) => {
    for (let i = 0; i < 30; i++) {
      const m = await mailsAn("leila@example.test");
      if (m.length >= anzahl) return m.sort((a, b) => Date.parse(b.Date) - Date.parse(a.Date))[0].Text.match(/\b(\d{6})\b/)[1];
      await new Promise((r) => setTimeout(r, 500));
    }
    return null;
  };
  const seite = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await seite.goto(`${BASIS}/mein-bereich/login/`);
  await seite.fill("#email", "leila@example.test");
  await seite.getByRole("button", { name: "Anmeldelink schicken" }).click();
  await seite.locator("#code").waitFor();
  const erster = await codeAus(1);
  ok(await seite.getByText("Schau bitte auch im Spam- oder Werbung-Ordner nach").isVisible(), "Spam-Hinweis sichtbar");
  const knopf = seite.getByRole("button", { name: /Code erneut senden/ });
  ok(await knopf.isDisabled() && /in \d+ s/.test(await knopf.innerText()), `Erneut senden erst nach Wartezeit: „${await knopf.innerText()}“`);
  await seite.waitForTimeout(61_000);
  ok(await knopf.isEnabled(), "Nach 60 Sekunden freigegeben");
  await knopf.click();
  await seite.getByText("Ein neuer Code ist unterwegs").waitFor();
  const zweiter = await codeAus(2);
  ok(zweiter && zweiter !== erster, "Zweite Mail mit neuem Code");
  ok(await seite.getByRole("button", { name: /Code erneut senden \(in/ }).isDisabled(), "Wartezeit beginnt erneut");
  await seite.fill("#code", ` ${zweiter.slice(0, 3)} ${zweiter.slice(3)}`);
  await seite.getByRole("button", { name: "Anmelden", exact: true }).click();
  await seite.waitForURL(/\/mein-bereich\/$/);
  ok(true, "Anmeldung mit dem neuen Code (auch mit Leerzeichen eingefügt)");
  ok(await keinUeberlauf(seite), "Mein Bereich am Handy ohne seitliches Scrollen");
}

// ---------------------------------------------------------------------------
// 3. Türkisch: Login, Login-Mail (GoTrue-Vorlage), Mein Bereich, Verzeichnis, Feedback, Adressänderung
// ---------------------------------------------------------------------------
if (teil("tuerkisch")) {
  await mailsLeeren();
  sql("update participants set preferred_language = 'tr' where email in ('leila@example.test', 'gast1@example.test')");
  sql("update participants set preferred_language = 'de' where email = 'amina@example.test'");
  // a) Login-Seite: Browser auf Türkisch, Umschalter auf Deutsch
  const trCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "tr-TR" });
  const seite = await trCtx.newPage();
  await seite.goto(`${BASIS}/mein-bereich/login/`);
  ok(await seite.getByRole("button", { name: "Giriş bağlantısını gönder" }).isVisible() && (await seite.locator("main").getAttribute("lang")) === "tr", "Login-Seite auf Türkisch (Browsersprache)");
  await seite.getByRole("link", { name: "Deutsch" }).click();
  await seite.getByRole("button", { name: "Anmeldelink schicken" }).waitFor();
  ok(true, "Umschalten auf Deutsch");
  await seite.getByRole("link", { name: "Türkçe" }).click();
  await seite.waitForURL(/sprache=tr/);
  await seite.getByRole("button", { name: "Giriş bağlantısını gönder" }).waitFor();
  await seite.fill("#email", "leila@example.test");
  await seite.getByRole("button", { name: "Giriş bağlantısını gönder" }).click();
  await seite.getByText("E-posta gelmedi mi?").waitFor();
  ok(await seite.getByText("spam ya da reklam klasörüne").isVisible(), "Spam-Hinweis auf Türkisch");
  let mail = null;
  for (let i = 0; i < 20 && !mail; i++) { mail = (await mailsAn("leila@example.test"))[0]; if (!mail) await seite.waitForTimeout(500); }
  ok(mail?.Subject === "„Mein Bereich“ giriş bağlantın – SES Academy" && mail.Text.includes("Şimdi giriş yap"), `Login-Mail Türkisch: „${mail?.Subject}“`);
  await seite.fill("#code", mail.Text.match(/\b(\d{6})\b/)[1]);
  await seite.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await seite.waitForURL(/\/mein-bereich\/$/);
  ok(await seite.getByRole("heading", { name: "Selam, Leila!" }).isVisible() && await seite.getByText("Yaklaşan modüller").isVisible() && await seite.getByText("Ödevler", { exact: true }).isVisible(),
    "Mein Bereich auf Türkisch");
  ok(!(await seite.locator("main").innerText()).match(/Kommende Module|Hausaufgaben|Mein Profil|Meine Anwesenheit/), "Keine deutschen Überschriften mehr");
  ok(await keinUeberlauf(seite), "Mein Bereich (Türkisch) am Handy ohne seitliches Scrollen");
  await seite.getByRole("link", { name: "Üye rehberi" }).click();
  await seite.getByRole("heading", { name: "Üyeler" }).waitFor();
  ok(await seite.getByPlaceholder("İsim ara").isVisible(), "Mitgliederverzeichnis auf Türkisch");
  // Adresse ändern: beide Bestätigungsmails Türkisch
  await mailsLeeren();
  await seite.goto(`${BASIS}/mein-bereich/#profil`);
  await seite.fill("#email", "leila.neu@example.test");
  await seite.getByRole("button", { name: "Adresi değiştir" }).click();
  await seite.getByText("Eski ve yeni adresine birer onay bağlantısı gönderdik").waitFor();
  await seite.waitForTimeout(1500);
  const aenderung = [...(await mailsAn("leila@example.test")), ...(await mailsAn("leila.neu@example.test"))];
  ok(aenderung.length === 2 && aenderung.every((m) => m.Subject === "Yeni e-posta adresini onayla – SES Academy"), `Adressänderung: ${aenderung.length} Mails auf Türkisch`);
  // b) Neues Konto (erster Login, Bestätigungs-Vorlage) auf Türkisch, auch von der deutschen Seite
  const gast = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await gast.goto(`${BASIS}/mein-bereich/login/?sprache=de`);
  await gast.fill("#email", "gast1@example.test");
  await gast.getByRole("button", { name: "Anmeldelink schicken" }).click();
  await gast.locator("#code").waitFor();
  let gastMail = null;
  for (let i = 0; i < 20 && !gastMail; i++) { gastMail = (await mailsAn("gast1@example.test"))[0]; if (!gastMail) await gast.waitForTimeout(500); }
  ok(gastMail?.Subject === "„Mein Bereich“ giriş bağlantın – SES Academy", "Erster Login (neues Konto) mit türkischem Profil: Mail Türkisch");
  // c) Deutsches Profil bleibt Deutsch
  const de = await portalLogin(browser, "amina@example.test");
  ok(await de.getByText("Kommende Module").isVisible(), "Deutsches Profil: Mein Bereich auf Deutsch");
  ok((await mailsAn("amina@example.test"))[0]?.Subject === "Dein Zugang zu „Mein Bereich“ – SES Academy", "Deutsches Profil: Login-Mail Deutsch");
  // d) Feedback-Umfrage und Einladung auf Türkisch (Amina war beim Skills-Workshop)
  sql("update participants set preferred_language = 'tr' where email = 'amina@example.test'");
  sql("delete from feedback_surveys where module_id = (select id from modules where slug = 'skills-workshop')");
  const umfrage = sql(`select set_config('request.jwt.claims', json_build_object('sub', (select user_id from staff_members where role = 'admin' limit 1), 'role', 'authenticated')::text, false);
    select public.create_feedback_survey((select id from modules where slug = 'skills-workshop'), now() - interval '1 hour', now() + interval '7 days')`).split("\n").at(-1);
  const skills = sql("select id from modules where slug = 'skills-workshop'");
  const admin = await teamLogin(browser, "admin@ses.test");
  await mailsLeeren();
  await admin.goto(`${BASIS}/team/module/${skills}/`);
  await admin.getByRole("button", { name: "Einladung an alle Anwesenden ohne Antwort senden" }).click();
  await admin.getByText(/Einladungen verschickt/).waitFor();
  const einladung = (await mailsAn("amina@example.test"))[0];
  const link = sql("select link_token from participants where email = 'amina@example.test'");
  ok(einladung?.Subject === "„Skills-Workshop“ hakkında geri bildirimin – SES Academy" && einladung.Text.includes(`/feedback/${link}/${umfrage}/`), "Feedback-Einladung Türkisch mit Mail-Link");
  const fb = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await fb.goto(`${BASIS}/feedback/${link}/${umfrage}/`);
  ok(await fb.getByRole("heading", { name: "Geri bildirimin" }).isVisible() && await fb.getByText("çok iyi").first().isVisible(), "Feedback-Umfrage auf Türkisch");
  await fb.getByRole("button", { name: "Cevabı gönder" }).click();
  await fb.getByText("Lütfen en az bir soruyu cevapla").waitFor();
  ok(true, "Leeres Formular: türkische Meldung");
  sql(`delete from feedback_surveys where id = '${umfrage}'`);
  sql("update participants set preferred_language = 'de' where email in ('amina@example.test', 'gast1@example.test')");
}

// ---------------------------------------------------------------------------
// 7. Bewerbung: Phase beendet, kein Formular (der Server lehnt ebenfalls ab, siehe Bericht)
// ---------------------------------------------------------------------------
if (teil("bewerbung")) {
  const seite = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  for (const [pfad, text] of [["/bewerbung/", "Die Bewerbungsphase für den aktuellen Jahrgang ist beendet"], ["/tr/bewerbung/", "Mevcut dönem için başvuru süreci sona erdi"]]) {
    await seite.goto(`${BASIS}${pfad}`);
    ok(await seite.getByText(text).isVisible() && await seite.locator("#formular form").count() === 0, `${pfad}: Phase beendet, kein Formular`);
    ok(!(await seite.content()).includes("trotzdem schon jetzt eintragen"), `${pfad}: kein widersprüchliches „trotzdem eintragen“`);
    ok(await keinUeberlauf(seite), `${pfad}: Handy ohne seitliches Scrollen`);
  }
}

// ---------------------------------------------------------------------------
// 9. Freigaben: Ablehnungsnotiz sichtbar, Verlauf am Handy erreichbar
// ---------------------------------------------------------------------------
if (teil("freigaben")) {
  const admin = await teamLogin(browser, "admin@ses.test");
  await admin.goto(`${BASIS}/team/nachrichten/`);
  await admin.fill("#betreff", "TestNach Ablehnung");
  await admin.fill("#text", "Bitte nicht senden.");
  await admin.getByRole("button", { name: "Zur Freigabe vorlegen" }).click();
  await admin.waitForURL(/hinweis=/);
  const vorstand = await teamLogin(browser, "vorstand@ses.test", 390);
  await vorstand.goto(`${BASIS}/team/freigaben/`);
  const karte = vorstand.locator("li", { hasText: "TestNach Ablehnung" });
  await karte.getByLabel("Notiz").fill("Bitte erst Hotel klären");
  await karte.getByRole("button", { name: "Ablehnen" }).click();
  await vorstand.getByText("Abgelehnt.").waitFor();
  ok(await keinUeberlauf(vorstand), "Freigaben am Handy: Seite ohne seitliches Scrollen");
  const verlauf = vorstand.locator("table").locator("xpath=..");
  ok(await verlauf.evaluate((d) => getComputedStyle(d).overflowX === "auto"), "Verlauf am Handy in eigenem Scrollbereich");
  await verlauf.evaluate((d) => { d.scrollLeft = d.scrollWidth; });
  const status = vorstand.locator("tr", { hasText: "TestNach Ablehnung" }).getByText("Notiz: „Bitte erst Hotel klären“");
  ok(await status.isVisible(), "Verlauf: Ablehnungsnotiz sichtbar (Spalte Status erreichbar)");
  await admin.goto(`${BASIS}/team/nachrichten/`);
  await admin.locator("details", { hasText: "TestNach Ablehnung" }).locator("summary").click();
  ok(await admin.getByText("Abgelehnt mit Notiz:").isVisible() && await admin.getByText("Bitte erst Hotel klären").first().isVisible(), "Antragsteller sieht die Notiz in Nachrichten");
  await admin.goto(`${BASIS}/team/freigaben/`);
  ok(await admin.locator("tr", { hasText: "TestNach Ablehnung" }).getByText("abgelehnt").isVisible(), "Status lesbar statt Datenbankwort");
  sql("delete from approvals where summary like '%TestNach%'");
}

// ---------------------------------------------------------------------------
// 10. Regieplan: Programmpunkte und Einsätze bearbeiten
// ---------------------------------------------------------------------------
if (teil("regieplan")) {
  const tag = sql("select d.id from module_days d join modules m on m.id = d.module_id where m.slug = 'demokratie' order by d.day limit 1");
  sql(`delete from program_items where module_day_id = '${tag}' and title like 'TestNach%'; delete from duty_assignments where module_day_id = '${tag}' and person_name like 'TestNach%'`);
  sql(`insert into program_items (module_day_id, starts_at, ends_at, title, room, note) values ('${tag}', '2026-11-14 09:00+00', '2026-11-14 10:00+00', 'TestNach Vortrag', 'Saal 1', 'Referent')`);
  sql(`insert into duty_assignments (module_day_id, person_name, phone, task) values ('${tag}', 'TestNach Helferin', '0170 1', 'Einlass')`);
  for (const breite of [1280, 390]) {
    const orga = await teamLogin(browser, "orga@ses.test", breite);
    await orga.goto(`${BASIS}/team/regieplan/?tag=${tag}`);
    const zeile = orga.locator("li", { hasText: "TestNach Vortrag" });
    await zeile.locator("summary").click();
    await zeile.getByRole("link", { name: "Bearbeiten" }).click();
    await orga.getByText("Programmpunkt bearbeiten").waitFor();
    ok(await orga.inputValue("#b-title") === "TestNach Vortrag" && await orga.inputValue("#b-von") === "10:00", `(${breite}px) Bearbeiten-Formular vorausgefüllt`);
    await orga.fill("#b-bis", "09:30");
    await orga.getByRole("button", { name: "Speichern" }).click();
    await orga.getByText("Bitte die Angaben prüfen").waitFor();
    ok(await orga.getByText("Programmpunkt bearbeiten").isVisible(), `(${breite}px) Ende vor Beginn abgelehnt, Formular bleibt offen`);
    await orga.fill("#b-title", `TestNach Vortrag geändert ${breite}`);
    await orga.fill("#b-von", "10:15");
    await orga.fill("#b-bis", "11:15");
    await orga.getByRole("button", { name: "Speichern" }).click();
    await orga.getByText("Programmpunkt geändert.").waitFor();
    ok(sql(`select title || ' ' || to_char(starts_at at time zone 'Europe/Berlin', 'HH24:MI') from program_items where module_day_id = '${tag}' and title like 'TestNach%'`) === `TestNach Vortrag geändert ${breite} 10:15`, `(${breite}px) Programmpunkt gespeichert`);
    sql(`update program_items set title = 'TestNach Vortrag', starts_at = '2026-11-14 09:00+00' where module_day_id = '${tag}' and title like 'TestNach%'`);
    await orga.goto(`${BASIS}/team/regieplan/?tag=${tag}`);
    const einsatz = orga.locator("li", { hasText: "TestNach Helferin" });
    await einsatz.locator("summary").click();
    await einsatz.getByRole("link", { name: "Bearbeiten" }).click();
    await orga.getByText("Einsatz bearbeiten").waitFor();
    await orga.fill("#eb-phone", "+49 170 5550009");
    await orga.check("#einsatz-" + sql(`select id from duty_assignments where module_day_id = '${tag}' and person_name like 'TestNach%'`) + " input[name=is_lead]");
    await orga.getByRole("button", { name: "Speichern" }).click();
    await orga.getByText("Einsatz geändert.").waitFor();
    ok(sql(`select phone || ' ' || is_lead from duty_assignments where module_day_id = '${tag}' and person_name like 'TestNach%'`) === "+49 170 5550009 true", `(${breite}px) Einsatz gespeichert (Telefon, Leitung)`);
    sql(`update duty_assignments set phone = '0170 1', is_lead = false where module_day_id = '${tag}' and person_name like 'TestNach%'`);
    ok(await keinUeberlauf(orga), `(${breite}px) Regieplan ohne seitliches Scrollen`);
  }
  sql(`delete from program_items where module_day_id = '${tag}' and title like 'TestNach%'; delete from duty_assignments where module_day_id = '${tag}' and person_name like 'TestNach%'`);
}

await browser.close();
console.log(fehler ? `\n${fehler} Fehler` : "\nAlles in Ordnung.");
process.exit(fehler ? 1 : 0);
