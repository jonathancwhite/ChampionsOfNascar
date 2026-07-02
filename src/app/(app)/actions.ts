"use server";

import { revalidatePath } from "next/cache";

import { getOrCreateCurrentUser } from "@/lib/auth";
import { captureError } from "@/lib/logger";
import { validateDisplayName } from "@/lib/display-name";
import { updateUserDisplayName } from "@/lib/users";

export type UpdateDisplayNameState = {
  error?: string;
  success?: boolean;
};

/** Server action backing the first-login display name modal (NASCAR-086). */
export async function updateDisplayNameAction(
  _prevState: UpdateDisplayNameState,
  formData: FormData,
): Promise<UpdateDisplayNameState> {
  const user = await getOrCreateCurrentUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const validation = validateDisplayName(
    String(formData.get("displayName") ?? ""),
  );
  if (!validation.ok) {
    return { error: validation.error };
  }

  try {
    await updateUserDisplayName(user.id, user.clerkId, validation.name);
  } catch (error) {
    captureError(error, { event: "display_name.update" });
    return { error: "Could not save your name. Please try again." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return { success: true };
}
