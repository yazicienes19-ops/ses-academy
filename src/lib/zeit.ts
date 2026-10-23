/** Aktueller Zeitpunkt für Server-Komponenten, die pro Anfrage neu rendern. */
export function jetztMs(): number {
  return Date.now();
}
