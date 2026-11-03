import { redirect } from "next/navigation";
import { getRolle } from "@/lib/auth";

/** Einheitlicher Einstieg nach dem Login: Kommission → Team-Bereich, Teilnehmende → „Mein Bereich“. */
export default async function Dashboard() {
  const rolle = await getRolle();
  redirect(rolle === "kommission" ? "/team/" : "/mein-bereich/");
}
