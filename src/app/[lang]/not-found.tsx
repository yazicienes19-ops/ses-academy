import { Fehlerseite, nichtGefunden } from "@/components/Fehlerseite";

/** 404 der öffentlichen Website (im Rahmen mit Kopf und Fuß). */
export default function NichtGefunden() {
  return <Fehlerseite code="404" {...nichtGefunden} verweise={[{ href: "/", label: "Zur Startseite" }, { href: "/bewerbung/", label: "Bewerbung" }]} />;
}
