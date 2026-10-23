/** Aktueller Zeitpunkt für Server-Komponenten, die pro Anfrage neu rendern. */
export function jetztMs(): number {
  return Date.now();
}

const ZEITZONE = "Europe/Berlin";

/** "2026-11-14" + "10:00" in Berliner Zeit → ISO-Zeitpunkt (Sommer-/Winterzeit wird berücksichtigt). */
export function berlinerZeit(tag: string, uhrzeit: string): string {
  const [j, m, d] = tag.split("-").map(Number);
  const [h, min] = uhrzeit.split(":").map(Number);
  const alsUtc = Date.UTC(j, m - 1, d, h, min);
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: ZEITZONE, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
  }).formatToParts(new Date(alsUtc));
  const wert = (typ: string) => Number(teile.find((t) => t.type === typ)?.value);
  const angezeigt = Date.UTC(wert("year"), wert("month") - 1, wert("day"), wert("hour"), wert("minute"));
  return new Date(alsUtc - (angezeigt - alsUtc)).toISOString();
}
