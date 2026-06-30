"use server";

import { revalidatePath } from "next/cache";

import { LeagueRole } from "@/generated/prisma/enums";
import { getOrCreateCurrentUser, requireLeagueRole } from "@/lib/auth";
import { sendLeagueInvites, type SendInvitesResult } from "@/lib/invites";
import { regenerateJoinCode } from "@/lib/leagues";
import { checkRateLimit } from "@/lib/rate-limit";

export type InviteState = {
  error?: string;
  summary?: Extract<SendInvitesResult, { ok: true }>;
};

/**
 * Send league invite emails (NASCAR-031). Admin-only — re-checks authorization
 * server-side — then delegates to sendLeagueInvites and returns a summary the
 * form renders (sent / already invited / failed / invalid).
 */
export async function sendLeagueInvitesAction(
  _prevState: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const leagueId = String(formData.get("leagueId") ?? "");

  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "Only admins can send invites for this league.",
    };
  }

  // Throttle invite sending per admin to curb email spam (NASCAR-082).
  const throttle = await checkRateLimit(`invite:${authz.userId}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!throttle.allowed) {
    return {
      error: "You're sending invites too quickly. Please wait a minute.",
    };
  }

  const inviter = await getOrCreateCurrentUser();
  const inviterName = inviter?.displayName?.trim() || "A league admin";

  const result = await sendLeagueInvites(
    leagueId,
    inviterName,
    String(formData.get("emails") ?? ""),
  );

  if (!result.ok) {
    return { error: result.error };
  }
  return { summary: result };
}

export type RegenerateCodeState = { ok?: boolean; error?: string };

/**
 * Regenerate the league's join code (NASCAR-082). Admin-only; invalidates the
 * old code and shared links. Revalidates the overview so the new code shows.
 */
export async function regenerateJoinCodeAction(
  leagueId: string,
): Promise<RegenerateCodeState> {
  const authz = await requireLeagueRole(leagueId, LeagueRole.ADMIN);
  if (!authz.ok) {
    return {
      error:
        authz.reason === "unauthenticated"
          ? "You must be signed in."
          : "Only admins can regenerate the join code.",
    };
  }

  const result = await regenerateJoinCode(leagueId);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/leagues/${leagueId}`);
  return { ok: true };
}
