// Daily reminder cron (NASCAR-052). Vercel Cron hits this with
// `Authorization: Bearer ${CRON_SECRET}`; it emails members for races whose
// local date is exactly the league's lead days out. Idempotent per (race,
// recipient), so running it more than once a day sends each reminder once.

import { isAuthorizedCron } from "@/lib/cron-auth";
import { serverEnv } from "@/lib/env";
import { sendRaceReminders } from "@/lib/race-notifications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isAuthorizedCron(
      request.headers.get("authorization"),
      serverEnv.CRON_SECRET,
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await sendRaceReminders(new Date());
  return Response.json({ ok: true, ...result });
}
