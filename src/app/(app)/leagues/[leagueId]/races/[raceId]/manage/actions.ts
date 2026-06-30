"use server";

import { revalidatePath } from "next/cache";

import { LeagueRole } from "@/generated/prisma/enums";
import { requireLeagueRole } from "@/lib/auth";
import { setRaceParticipants, type ParticipantInput } from "@/lib/results";

export type ParticipantsState = { ok?: boolean; error?: string };

/**
 * Save a race's participant list (NASCAR-060). Re-checks ADMIN, then replaces
 * the participants (humans + AI). The list is locked once the race is completed
 * — the domain rejects that case.
 */
export async function setParticipantsAction(
  leagueId: string,
  raceId: string,
  input: ParticipantInput,
): Promise<ParticipantsState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "Only admins can manage participants.",
    };
  }

  const result = await setRaceParticipants(leagueId, raceId, input);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}/races/${raceId}`);
  revalidatePath(`/leagues/${leagueId}/races/${raceId}/manage`);
  return { ok: true };
}
