// Prüft den Zimmerplan (src/lib/zimmerplan.ts) mit kleinen, gezielten Fällen: npm run test:zimmerplan
import { planen, wunschAufloesen, wunschTeile, wuenschtEinzelzimmer, type PlanPerson } from "../src/lib/zimmerplan";

let fehler = 0;
const ok = (label: string, wahr: boolean) => { console.log(`${wahr ? "ok " : "FEHLER"}  ${label}`); if (!wahr) fehler++; };

// Wünsche zerlegen
ok("Teile", JSON.stringify(wunschTeile("Tala Yılmaz, Ayşe ve Zeynep (Köln)")) === JSON.stringify(["Tala Yılmaz", "Ayşe", "Zeynep"]));
ok("kein Wunsch", wunschTeile("Farketmez").length === 0 && wunschTeile("-").length === 0 && wunschTeile("Yok").length === 0);
ok("Einzelzimmer", wuenschtEinzelzimmer("Tek oda") && wuenschtEinzelzimmer("Einzelzimmer bitte") && !wuenschtEinzelzimmer("Tala"));
const leute = [{ id: "y", name: "Yusuf Demir" }, { id: "t", name: "Tala Kaya" }, { id: "s1", name: "Selim Kaya" }, { id: "s2", name: "Selim Kaya" }];
const r = wunschAufloesen({ id: "y", room_wish: "Tala Kaya, Selim Kaya, Unbekannt Person" }, leute, []);
ok("aufgelöst: sicher / mehrdeutig / unbekannt", r.map((t) => t.art).join() === "sicher,mehrdeutig,unbekannt");
const r2 = wunschAufloesen({ id: "y", room_wish: "Selim Kaya, Unbekannt Person" }, leute, [
  { participant_id: "y", token: "selim kaya", wished_id: "s2" }, { participant_id: "y", token: "unbekannt person", wished_id: null }]);
ok("Korrekturen haben Vorrang", r2[0].art === "korrigiert" && r2[0].ziel?.id === "s2" && r2[1].art === "ignoriert");

// Planen
const p = (id: string, gender: string, extra: Partial<PlanPerson> = {}): PlanPerson =>
  ({ id, name: id, gender, region: null, nights: ["2026-11-13", "2026-11-14"], zimmerId: null, quelle: null, wuensche: [], einzelzimmer: false, ...extra });
const zimmer = (n: number, cap = 2) => Array.from({ length: n }, (_, i) => ({ id: `z${i + 1}`, label: String(101 + i), capacity: cap }));
const wo = (e: ReturnType<typeof planen>, id: string) => e.zimmer.find((z) => z.belegung.some((b) => b.id === id))?.id;

// gegenseitig zusammen, Geschlechter getrennt
let e = planen([p("yusuf", "m", { wuensche: ["tala"] }), p("tala", "m", { wuensche: ["yusuf"] }), p("ayse", "w"), p("ali", "m"), p("zeynep", "w")], zimmer(4), new Set());
ok("gegenseitiger Wunsch im selben Zimmer", wo(e, "yusuf") === wo(e, "tala"));
ok("Grund gegenseitig", e.zimmer.flatMap((z) => z.belegung).find((b) => b.id === "yusuf")?.grund === "wunsch_gegenseitig");
ok("Frauen zusammen, nicht mit Männern", wo(e, "ayse") === wo(e, "zeynep") && wo(e, "ayse") !== wo(e, "ali"));
ok("niemand ohne Zimmer", e.ohneZimmer.length === 0);

// einseitig erfüllt, wenn das Ziel niemanden wünscht; nicht, wenn es jemand anderen wünscht
e = planen([p("a", "m", { wuensche: ["b"] }), p("b", "m"), p("c", "m", { wuensche: ["d"] }), p("d", "m", { wuensche: ["e"] }), p("e", "m", { wuensche: ["d"] }), p("f", "m")], zimmer(4), new Set());
ok("einseitig erfüllt", wo(e, "a") === wo(e, "b"));
ok("d und e gegenseitig zusammen", wo(e, "d") === wo(e, "e"));
ok("c nicht zu d (d wünscht e)", wo(e, "c") !== wo(e, "d") && e.hinweise.some((h) => h.personId === "c"));

// anderes Geschlecht nicht eingeplant, Hinweis
e = planen([p("a", "m", { wuensche: ["b"] }), p("b", "w")], zimmer(2), new Set());
ok("anderes Geschlecht getrennt mit Hinweis", wo(e, "a") !== wo(e, "b") && e.hinweise.some((h) => h.text.includes("anderes Geschlecht")));

// Handzuteilung bleibt, Wunschpartner kommt dazu
e = planen([p("a", "m", { zimmerId: "z3", quelle: "manual" }), p("b", "m", { wuensche: ["a"] }), p("c", "m")], zimmer(3), new Set());
ok("fest bleibt fest", wo(e, "a") === "z3" && e.zimmer.find((z) => z.id === "z3")!.belegung.find((b) => b.id === "a")!.grund === "fest");
ok("Wunschpartner zum Festen", wo(e, "b") === "z3");
ok("Vorschlags-Zuteilungen zählen nicht als fest", planen([p("a", "m", { zimmerId: "z2", quelle: "auto" }), p("b", "m")], zimmer(2), new Set()).zimmer.some((z) => z.belegung.length === 2));

// Durchmischen: wer schon zusammen war, kommt nicht wieder zusammen, wenn es anders geht
const verlauf = new Set(["a|b", "b|a"]);
e = planen([p("a", "m"), p("b", "m"), p("c", "m"), p("d", "m")], zimmer(2), verlauf);
ok("frühere Zimmerpartner getrennt", wo(e, "a") !== wo(e, "b") && e.wiederholungen.length === 0);
// …außer sie wünschen es sich
e = planen([p("a", "m", { wuensche: ["b"] }), p("b", "m", { wuensche: ["a"] })], zimmer(2), verlauf);
ok("Wunsch schlägt Durchmischung, als Wiederholung markiert", wo(e, "a") === wo(e, "b") && e.wiederholungen.length === 1);

// Regionen mischen
e = planen([p("a", "m", { region: "Köln" }), p("b", "m", { region: "Köln" }), p("c", "m", { region: "Berlin" }), p("d", "m", { region: "Berlin" })], zimmer(2), new Set());
ok("verschiedene Regionen im Zimmer", e.zimmer.every((z) => new Set(z.belegung.map((b) => ({ a: "Köln", b: "Köln", c: "Berlin", d: "Berlin" } as Record<string, string>)[b.id])).size === z.belegung.length));

// ohne Nacht kein Zimmer; zu wenig Betten → Hinweis
e = planen([p("a", "m", { nights: [] }), p("b", "m"), p("c", "m"), p("d", "m")], zimmer(1), new Set());
ok("ohne Übernachtung kein Zimmer", !wo(e, "a"));
ok("zu wenig Betten gemeldet", e.ohneZimmer.length === 1 && e.hinweise.some((h) => h.text.includes("kein Bett")));

// Einzelzimmer
e = planen([p("a", "w", { einzelzimmer: true }), p("b", "w"), p("c", "w")], [...zimmer(1), { id: "e1", label: "E1", capacity: 1 }], new Set());
ok("Einzelzimmer-Wunsch erfüllt", wo(e, "a") === "e1" && wo(e, "b") === wo(e, "c"));

// deterministisch
const pers = Array.from({ length: 30 }, (_, i) => p(`p${i}`, i % 2 ? "m" : "w", { region: `R${i % 5}` }));
ok("gleiche Angaben, gleicher Vorschlag", JSON.stringify(planen(pers, zimmer(16), new Set())) === JSON.stringify(planen([...pers].reverse(), zimmer(16), new Set())));

// Beschriftete Zimmer: „Männer“-Zimmer zuerst in der Liste, trotzdem kommen Frauen nur in „Frauen“-Zimmer
const beschriftet = [
  { id: "m1", label: "01", capacity: 2, vorgabe: "m" as const }, { id: "m2", label: "02", capacity: 2, vorgabe: "m" as const },
  { id: "w1", label: "03", capacity: 2, vorgabe: "w" as const }, { id: "w2", label: "04", capacity: 2, vorgabe: "w" as const },
];
e = planen([p("f1", "w"), p("f2", "w"), p("f3", "w", { wuensche: ["f4"] }), p("f4", "w", { wuensche: ["f3"] }), p("m1x", "m"), p("m2x", "m")], beschriftet, new Set());
ok("Frauen nur in Frauen-Zimmern", ["f1", "f2", "f3", "f4"].every((id) => ["w1", "w2"].includes(wo(e, id) ?? "")));
ok("Männer nur in Männer-Zimmern", ["m1x", "m2x"].every((id) => ["m1", "m2"].includes(wo(e, id) ?? "")));
e = planen([p("f1", "w"), p("f2", "w"), p("f3", "w")], [{ id: "m1", label: "01", capacity: 2, vorgabe: "m" as const }, { id: "w1", label: "02", capacity: 2, vorgabe: "w" as const }], new Set());
ok("kein Frauen-Bett frei: ohne Zimmer statt ins Männer-Zimmer", e.ohneZimmer.length === 1 && !e.zimmer.find((z) => z.id === "m1")!.belegung.length);

console.log(fehler ? `${fehler} Fehler` : "alle ok");
process.exit(fehler ? 1 : 0);
