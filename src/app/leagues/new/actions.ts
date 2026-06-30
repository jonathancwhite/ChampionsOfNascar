"use server";

import { redirect } from "next/navigation";

import { getOrCreateCurrentUser } from "@/lib/auth";
import { createLeague } from "@/lib/leagues";

export type CreateLeagueState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Server action backing the create-league form (NASCAR-020). On success it
 * redirects to the new league page; on failure it returns an error state for
 * `useActionState` to render. Auth is enforced here as well as in middleware.
 */
export async function createLeagueAction(
  _prevState: CreateLeagueState,
  formData: FormData,
): Promise<CreateLeagueState> {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    return { error: "You must be signed in to create a league." };
  }

  const result = await createLeague(user.id, {
    name: String(formData.get("name") ?? ""),
    series: String(formData.get("series") ?? ""),
    numberOfRaces: String(formData.get("numberOfRaces") ?? ""),
    lapsPercent: String(formData.get("lapsPercent") ?? ""),
    reminderLeadDays: String(formData.get("reminderLeadDays") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  // Outside the try path above; redirect throws NEXT_REDIRECT by design.
  redirect(`/leagues/${result.leagueId}`);
}
