// Testmail über die SMTP-Zugangsdaten aus der .env des Betriebs (./ses.sh mailtest <adresse>).
// Prüft nacheinander Verbindung, Verschlüsselung und Anmeldung und schickt dann eine kurze Mail.
// Die Werte kommen aus der Umgebung (ses.sh lädt ~/SES_ACADEMY/betrieb-daten/.env). Passwörter werden nie ausgegeben.
import { createRequire } from "node:module";

// nodemailer aus der Betriebskopie bzw. dem Repo laden (ses.sh wechselt vorher in diesen Ordner)
const nodemailer = createRequire(`${process.cwd()}/`)("nodemailer");

const an = process.argv[2];
const env = process.env;
const fehlerAus = (text) => { console.error(`FEHLER: ${text}`); process.exit(1); };
const hinweis = (text) => console.log(`Hinweis: ${text}`);

if (!an || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(an)) fehlerAus("Bitte eine Empfängeradresse angeben: ./betrieb/ses.sh mailtest name@beispiel.de");

const host = (env.SMTP_HOST ?? "").trim();
const port = Number(env.SMTP_PORT || 587);
const secure = env.SMTP_SECURE === "true";
const user = (env.SMTP_USER ?? "").trim();
const pass = env.SMTP_PASS ?? "";
const from = env.MAIL_FROM || "SES Academy <ses@islamrat.de>";
const absender = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
const gotrueAbsender = (env.SMTP_FROM_ADDRESS ?? "").trim().toLowerCase();

console.log("Mailversand prüfen");
console.log(`  SMTP_HOST          ${host || "(leer)"}`);
console.log(`  SMTP_PORT          ${port}`);
console.log(`  SMTP_SECURE        ${secure ? "true (TLS ab Verbindungsbeginn)" : "false (STARTTLS, wenn der Server es anbietet)"}`);
console.log(`  SMTP_USER          ${user || "(leer)"}`);
console.log(`  SMTP_PASS          ${pass ? "gesetzt" : "(leer)"}`);
console.log(`  MAIL_FROM          ${from}   (Absender der App-Mails)`);
console.log(`  SMTP_FROM_ADDRESS  ${gotrueAbsender || "(leer)"}   (Absender der Login-Codes über GoTrue)`);
console.log("");

if (!host) fehlerAus("SMTP_HOST ist leer. In ~/SES_ACADEMY/betrieb-daten/.env den Postausgangsserver eintragen (siehe betrieb/README.md).");
if (user && !pass) fehlerAus("SMTP_USER ist gesetzt, SMTP_PASS aber leer. Passwort des Postfachs eintragen.");
if (port === 465 && !secure) hinweis("Port 465 erwartet normalerweise SMTP_SECURE=true.");
if (port === 587 && secure) hinweis("Port 587 erwartet normalerweise SMTP_SECURE=false (STARTTLS).");
if (!gotrueAbsender) hinweis("SMTP_FROM_ADDRESS ist leer: GoTrue nimmt dann ses@islamrat.de als Absender der Login-Codes.");
else if (gotrueAbsender !== absender) hinweis(`MAIL_FROM (${absender}) und SMTP_FROM_ADDRESS (${gotrueAbsender}) sind verschieden. Viele Mailserver lassen nur die eigene Adresse als Absender zu.`);
if (user && user.includes("@") && user.toLowerCase() !== absender) hinweis(`Angemeldet wird als ${user}, Absender ist ${absender}. Klappt der Versand nicht, beide gleich setzen.`);

const transport = nodemailer.createTransport({
  host, port, secure,
  auth: user ? { user, pass } : undefined,
  connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 30_000,
});

/** Fehler von nodemailer in eine verständliche Ursache übersetzen. */
function erklaere(e) {
  const code = e?.code ?? "";
  // OpenSSL-Meldungen auf den lesbaren Teil kürzen („wrong version number“ statt der ganzen Fehlerkette)
  const text = String(e?.message ?? e).split("\n")[0].replace(/^[0-9A-F]+:error:[0-9A-F]+:[^:]+:[^:]+:([^:]+):.*$/, "$1").trim();
  const tls = /ssl|tls|certificate|wrong version number|self[- ]signed|handshake|EPROTO/i.test(`${code} ${text}`);
  if (code === "EDNS" || /ENOTFOUND|EAI_AGAIN/.test(text)) return `Verbindung: Den Server „${host}“ gibt es nicht oder er ist gerade nicht auflösbar. SMTP_HOST prüfen.`;
  if (code === "EAUTH") return `Anmeldung: Der Server hat Benutzer oder Passwort abgelehnt (${e.response ?? text}). SMTP_USER und SMTP_PASS prüfen.`;
  if (tls) return `TLS: Die Verschlüsselung passt nicht (${text}). Bei Port 465 SMTP_SECURE=true, bei Port 587 SMTP_SECURE=false setzen.`;
  if (code === "ETIMEDOUT" || /timeout/i.test(text)) return `Verbindung: Keine Antwort von ${host}:${port} (Zeitüberschreitung). Port prüfen, oder ein Netz/Firewall blockiert ausgehende Mails.`;
  if (code === "ECONNECTION" || code === "ESOCKET" || /ECONNREFUSED|ECONNRESET|EHOSTUNREACH/.test(text)) return `Verbindung: ${host}:${port} nimmt keine Verbindung an (${text}). SMTP_HOST und SMTP_PORT prüfen.`;
  if (code === "EENVELOPE") return `Absender/Empfänger: Der Server hat die Adressen abgelehnt (${e.response ?? text}). Darf ${absender} über dieses Postfach senden?`;
  return `Unbekannter Fehler (${code || "ohne Code"}): ${text}`;
}

try {
  process.stdout.write("1. Verbindung, Verschlüsselung und Anmeldung … ");
  await transport.verify();
  console.log("in Ordnung");
  process.stdout.write(`2. Testmail an ${an} … `);
  const info = await transport.sendMail({
    from, to: an,
    subject: "Testmail SES Academy",
    text: `Diese Testmail kommt von der SES-Plattform (${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}).\n\nWenn du sie liest, funktioniert der Mailversand für Tickets und Info-Mails.\nDie Login-Codes verschickt die Anmeldung (GoTrue) mit denselben Zugangsdaten, nachdem der Betrieb neu gestartet wurde: ./ses.sh stopp && ./ses.sh start`,
  });
  console.log("verschickt");
  console.log(`   Antwort des Servers: ${info.response}`);
  if (info.rejected?.length) console.log(`   Abgelehnt: ${info.rejected.join(", ")}`);
  console.log("");
  console.log("OK. Bitte im Postfach (auch im Spam-Ordner) nachsehen.");
  console.log("Danach den Login-Code testen: Betrieb neu starten, unter /mein-bereich/login/ die eigene Adresse eingeben.");
} catch (e) {
  console.log("");
  fehlerAus(erklaere(e));
}
