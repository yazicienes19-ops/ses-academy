// Testlauf der Importe ohne Oberfläche: npx tsx --conditions=react-server --env-file=.env.local scripts/import-test.mts <art> <datei> [anwenden] [vorschlaege] [anlegen]
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { importiere, type ImportArt } from "../src/lib/import/importe";

const [art, pfad, ...flags] = process.argv.slice(2);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const datei = new File([await readFile(pfad)], basename(pfad));
const b = await importiere(sb, art as ImportArt, datei, {
  anwenden: flags.includes("anwenden"),
  vorschlaegeUebernehmen: flags.includes("vorschlaege"),
  fehlendeAnlegen: flags.includes("anlegen"),
  ueberschreiben: flags.includes("ueberschreiben"),
  hausaufgabeNr: 1,
});
console.log(`== ${b.titel} (${b.angewendet ? "angewendet" : "Vorschau"})`);
for (const [k, v] of b.zahlen) console.log(`  ${k}: ${v}`);
for (const h of b.hinweise) console.log(`  [${h.stufe}] ${h.text}`);
