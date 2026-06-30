"use server";

import { revalidatePath } from "next/cache";

import { LeagueRole } from "@/generated/prisma/enums";
import { requireLeagueRole } from "@/lib/auth";
import { updateLeagueSettings } from "@/lib/leagues";

export type ManageLeagueState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Server action for the admin settings form (NASCAR-022). Re-checks ADMIN
 * authorization here — never trust the client — then validates and persists.
 * On success it revalidates the overview so the change shows immediately.
 */
export async function updateLeagueSettingsAction(
  _prevState: ManageLeagueState,
  formData: FormData,
): Promise<ManageLeagueState> {
  const leagueId = String(formData.get("leagueId") ?? "");

  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "You don't have permission to manage this league.",
    };
  }

  const result = await updateLeagueSettings(leagueId, {
    name: String(formData.get("name") ?? ""),
    lapsPercent: String(formData.get("lapsPercent") ?? ""),
    reminderLeadDays: String(formData.get("reminderLeadDays") ?? ""),
    timezone: String(formData.get("timezone") ?? ""),
    status: String(formData.get("status") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath(`/leagues/${leagueId}/manage`);
  return { ok: true };
}
