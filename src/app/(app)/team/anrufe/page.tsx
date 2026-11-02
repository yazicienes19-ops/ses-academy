import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";

/** Die Anrufliste ist jetzt Teil von „Teilnehmende“; alte Links und Lesezeichen führen mit ihren Filtern dorthin. */
export default async function Anrufe({ searchParams }: PageProps<"/team/anrufe">) {
  await requireStaff("orga");
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = new URLSearchParams({ gruppe: "alle" });
  if (s("modul")) q.set("modul", s("modul"));
  if (["offen", "nachfassen", "erreicht"].includes(s("filter"))) q.set("kontakt", s("filter"));
  if (s("filter") === "uebernachtung") q.set("uebernachtung", "offen");
  if (s("uebernachtung")) q.set("uebernachtung", s("uebernachtung"));
  if (s("sorumlu")) q.set("verantwortlich", s("sorumlu"));
  if (s("region")) q.set("region", s("region"));
  if (s("suche")) q.set("q", s("suche"));
  redirect(`/team/teilnehmende/?${q}`);
}
