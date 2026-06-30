import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";

import { serverEnv } from "@/lib/env";
import {
  anonymizeUserByClerkId,
  mapWebhookUser,
  upsertLocalUser,
} from "@/lib/users";

// Clerk → DB user sync (NASCAR-011). This route is public (excluded from the
// auth middleware) but authenticated by the Svix signature: an unsigned or
// tampered request is rejected before it can touch the database.
export async function POST(req: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  // Verify against the raw body — re-serializing JSON would change bytes and
  // break the signature.
  const body = await req.text();

  let event: WebhookEvent;
  try {
    event = new Webhook(serverEnv.CLERK_WEBHOOK_SECRET).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "user.created":
    case "user.updated":
      await upsertLocalUser(mapWebhookUser(event.data));
      break;
    case "user.deleted":
      // `data.id` is optional on the deleted payload; skip if absent.
      if (event.data.id) {
        await anonymizeUserByClerkId(event.data.id);
      }
      break;
    default:
      // Other event types are intentionally ignored.
      break;
  }

  return new Response("ok", { status: 200 });
}
