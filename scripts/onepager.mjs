// Erzeugt public/presse/SES-Academy-<sprache>.pdf aus /onepager/<sprache>/ (statischer Build muss unter PORT laufen).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const PORT = process.env.PORT ?? "3005";
mkdirSync("public/presse", { recursive: true });
const b = await chromium.launch();
const p = await b.newPage();
for (const l of ["de", "tr", "en", "fr", "nl"]) {
  await p.goto(`http://localhost:${PORT}/onepager/${l}/`, { waitUntil: "networkidle" });
  await p.pdf({ path: `public/presse/SES-Academy-${l}.pdf`, format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  console.log("PDF", l);
}
await b.close();
