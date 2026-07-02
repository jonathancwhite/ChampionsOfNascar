"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { LeagueRole } from "@/generated/prisma/enums";
import { requireLeagueRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  deleteLeagueDeniedMessage,
  isDeleteConfirmationValid,
} from "@/lib/league-delete";
import { deleteLeague, updateLeagueSettings } from "@/lib/leagues";
import { adjustRaceCount } from "@/lib/schedule";

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

  const numberOfRacesRaw = String(formData.get("numberOfRaces") ?? "");
  const parsedCount = Number(numberOfRacesRaw);
  if (numberOfRacesRaw !== "" && !Number.isInteger(parsedCount)) {
    return {
      fieldErrors: { numberOfRaces: "Enter a whole number." },
    };
  }

  const current = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { numberOfRaces: true },
  });
  if (!current) {
    return { error: "League not found." };
  }

  if (numberOfRacesRaw !== "" && parsedCount !== current.numberOfRaces) {
    const adjust = await adjustRaceCount(prisma, leagueId, parsedCount);
    if (!adjust.ok) {
      return { fieldErrors: { numberOfRaces: adjust.error } };
    }
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
  revalidatePath(`/leagues/${leagueId}/manage/schedule`);
  return { ok: true };
}

export type DeleteLeagueState = { error?: string };

/**
 * Permanently delete a league (NASCAR-087). Requires ADMIN, a typed name match,
 * then hard-deletes with cascade. Redirects to the dashboard on success.
 */
export async function deleteLeagueAction(
  leagueId: string,
  confirmName: string,
): Promise<DeleteLeagueState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return { error: deleteLeagueDeniedMessage(authz.reason) };
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true },
  });
  if (!league) {
    return { error: "League not found." };
  }

  if (!isDeleteConfirmationValid(confirmName, league.name)) {
    return { error: "League name doesn't match." };
  }

  const result = await deleteLeague(leagueId);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
