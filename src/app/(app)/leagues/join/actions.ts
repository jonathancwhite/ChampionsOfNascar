"use server";

import { redirect } from "next/navigation";

import { getOrCreateCurrentUser } from "@/lib/auth";
import { joinLeague } from "@/lib/leagues";

export type JoinLeagueState = {
  error?: string;
};

/**
 * Server action backing the join-by-code form (NASCAR-030). On success (valid
 * code, or already a member) it redirects to the league; otherwise it returns a
 * friendly error. Auth is enforced here as well as in middleware.
 */
export async function joinLeagueAction(
  _prevState: JoinLeagueState,
  formData: FormData,
): Promise<JoinLeagueState> {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    return { error: "You must be signed in to join a league." };
  }

  const result = await joinLeague(user.id, String(formData.get("code") ?? ""));
  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/leagues/${result.leagueId}`);
}
