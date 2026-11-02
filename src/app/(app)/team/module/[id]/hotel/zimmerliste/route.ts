import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";

/** Alte Druckliste: führt zur Zimmerliste im SES-Design (mit Buchung je Zimmer und „kommt … dazu“). */
export async function GET(_: Request, { params }: RouteContext<"/team/module/[id]/hotel/zimmerliste">) {
  await requireStaff("orga");
  const { id } = await params;
  redirect(`/team/module/${id}/zimmerliste/`);
}
