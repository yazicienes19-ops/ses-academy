// Namensabgleich für Importe: Tippfehler, türkische Sonderzeichen, Groß/Klein, Reihenfolge.

const ersatz: Record<string, string> = { ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g", ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c", â: "a", î: "i", û: "u", é: "e", è: "e", ë: "e", à: "a", š: "s", ć: "c", č: "c", ž: "z", đ: "d" };

/** „Ahmet-Selim  KAYA“ → „ahmet selim kaya“ */
export function faltName(s: string) {
  return s
    .normalize("NFC")
    .replace(/[ıİşŞğĞüÜöÖçÇâîûéèëàšćčžđ]/g, (c) => ersatz[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // „(Video 2)“
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const sortiert = (s: string) => s.split(" ").sort().join(" ");

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  const v = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = v[0];
    v[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = v[j];
      v[j] = Math.min(v[j] + 1, v[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return v[b.length];
}

export type Person = { id: string; name: string };
export type Treffer =
  | { art: "sicher"; person: Person }
  | { art: "vorschlag"; person: Person; grund: string }
  | { art: "mehrdeutig"; kandidaten: Person[] }
  | { art: "keiner" };

/** Sucht eine Person zum Namen. „sicher“ wird automatisch übernommen, „vorschlag“ nur nach Bestätigung. */
export function finde(name: string, personen: Person[]): Treffer {
  // Einzelbuchstaben am Ende („Leyla Köklüce D“) sind meist Kürzel aus Dateinamen
  const roh = faltName(name).split(" ");
  const f = (roh.length > 1 ? roh.filter((t, i) => t.length > 1 || i < roh.length - 1) : roh).join(" ");
  if (!f) return { art: "keiner" };
  const gefaltet = personen.map((p) => ({ p, f: faltName(p.name) }));

  const exakt = gefaltet.filter((x) => x.f === f || sortiert(x.f) === sortiert(f));
  if (exakt.length === 1) return { art: "sicher", person: exakt[0].p };
  if (exakt.length > 1) return { art: "mehrdeutig", kandidaten: exakt.map((x) => x.p) };

  // Tippfehler: höchstens 1 Fehler je 6 Zeichen, max. 2
  const grenze = Math.min(2, Math.floor(f.length / 6));
  const nah = gefaltet.map((x) => ({ ...x, d: levenshtein(x.f, f) })).filter((x) => x.d <= grenze).sort((a, b) => a.d - b.d);
  if (nah.length === 1 || (nah.length > 1 && nah[0].d < nah[1].d)) return { art: "vorschlag", person: nah[0].p, grund: `ähnlich geschrieben (${nah[0].d} Zeichen anders)` };

  // Teilname oder zusätzlicher Zweitname, z. B. „Ahmet-Selim“, „Batuhan Vural“ ↔ „Muhammed Batuhan Vuraö“,
  // „Mert Şakir Koçaş“ ↔ „Mert Kocas“: alle Teile der kürzeren Schreibweise finden sich (ggf. mit 1 Tippfehler) in der längeren.
  const teile = f.split(" ");
  const gleich = (a: string, b: string) => a === b || (a.length >= 5 && b.length >= 5 && levenshtein(a, b) <= 1);
  const steckt = (kurz: string[], lang: string[]) => kurz.every((k) => lang.some((l) => gleich(k, l)));
  const enthalten = gefaltet.filter((x) => {
    const t = x.f.split(" ");
    return steckt(teile, t) || (t.length >= 2 && steckt(t, teile));
  });
  if (enthalten.length === 1) return { art: "vorschlag", person: enthalten[0].p, grund: "nur Teil des Namens angegeben" };
  if (enthalten.length > 1 && enthalten.length <= 5) return { art: "mehrdeutig", kandidaten: enthalten.map((x) => x.p) };

  // Abgeschnittener Name („Hülya Yama…“): letzter Teil ist der Anfang eines Namensteils
  if (teile.length > 1 && teile[teile.length - 1].length >= 3) {
    const vorne = teile.slice(0, -1), letzter = teile[teile.length - 1];
    const anfang = gefaltet.filter((x) => {
      const t = x.f.split(" ");
      return vorne.every((v) => t.includes(v)) && t.some((w) => w.startsWith(letzter) && !vorne.includes(w));
    });
    if (anfang.length === 1) return { art: "vorschlag", person: anfang[0].p, grund: "Name abgeschnitten" };
    if (anfang.length > 1 && anfang.length <= 5) return { art: "mehrdeutig", kandidaten: anfang.map((x) => x.p) };
  }
  return { art: "keiner" };
}

// ── Regionen ──────────────────────────────────────────────────────────────────

/** Schreibweisen aus den bisherigen Listen → einheitlicher Regionsname (siehe Tabelle regionen). */
const regionAlias: Record<string, string> = {
  "a viyana": "A-Viyana", "a linz": "A-Linz", "a arlberg": "A-Arlberg",
  "g bavyera": "Güney Bavyera", "guney bavyera": "Güney Bavyera",
  "ruhr a": "Ruhr A", "k ruhr": "Kuzey Ruhr", "kuzey ruhr": "Kuzey Ruhr",
  "freiburg donau": "Freiburg-Donau", "r n saar": "R.-N.-Saar",
  "d fransa": "D. Fransa", "g b fransa": "G.B. Fransa", "g fransa": "G.B. Fransa",
  "isvicre": "İsviçre",
};

export function regionName(roh: unknown, bekannte: string[]): string | null {
  if (roh == null) return null;
  const f = faltName(String(roh));
  if (!f || f === "bilmiyorum") return null;
  if (regionAlias[f]) return regionAlias[f];
  return bekannte.find((b) => faltName(b) === f) ?? null;
}

export const landAusText: Record<string, string> = { almanya: "DE", avusturya: "AT", fransa: "FR", isvicre: "CH", hollanda: "NL", belcika: "BE", deutschland: "DE", osterreich: "AT", frankreich: "FR", schweiz: "CH" };
