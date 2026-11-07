import { Fehlerseite, nichtGefunden } from "@/components/Fehlerseite";

/** 404 für Druckseiten (Namensschilder, Tagesordnung, Zimmerliste). */
export default function NichtGefunden() {
  return <Fehlerseite code="404" {...nichtGefunden} verweise={[{ href: "/team/", label: "Team-Bereich" }, { href: "/", label: "Zur Startseite" }]} />;
}
