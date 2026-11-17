// frontend/src/app/api/notifikasi/langganan/route.ts
// P5-003: a device subscribes to the church notification categories.
//
// The browser sends the PushSubscription it already holds; the server stores it with
// the categories the jemaat ticked. There is no account, no email and no phone number,
// so this route must never accept one (owner decision 2026-11-17).
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicErrorMessage, GENERIC_ERROR_MESSAGE } from "@/lib/api/errors";
import { CONSENT_VERSION } from "@/lib/notifications/preferences";
import { SubscriptionError, parseSubscription } from "@/lib/notifications/subscription";
import { clientIp, hashFormIp, readFormBody } from "@/lib/forms/public-form";

export const runtime = "nodejs";

const TABLE = "notification_subscriptions";
const UPDATED = { success: true, message: "Preferensi notifikasi diperbarui." };
const CREATED = { success: true, message: "Notifikasi diaktifkan untuk perangkat ini." };

const unavailable = () => Response.json({ error: "Layanan notifikasi sementara tidak tersedia." }, { status: 503 });
const failed = () => Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await readFormBody(request);
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 400;
    return Response.json({ error: publicErrorMessage(error) }, { status });
  }

  let row: ReturnType<typeof parseSubscription>;
  try {
    row = parseSubscription(input, CONSENT_VERSION);
  } catch (error) {
    if (error instanceof SubscriptionError) {
      // The text goes through publicErrorMessage so this file never hands a raw
      // error message to the browser.
      return Response.json({ error: publicErrorMessage(error) }, { status: 400 });
    }
    throw error;
  }

  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return unavailable();
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return unavailable();
  }

  // Public endpoint: limit by hashed IP so a script cannot fill the table.
  const limited = Response.json({ error: "Terlalu banyak permintaan. Silakan coba lagi nanti." }, { status: 429 });
  const { data: allowed, error: rateError } = await admin.rpc("check_form_rate", {
    p_form: "notification_subscribe",
    p_ip_hash: hashFormIp(clientIp(request), key),
    p_limit: 10,
    p_window: "1 hour",
  });
  if (rateError) return failed();
  if (allowed !== true) return limited;

  const { error } = await admin.from(TABLE).insert(row);
  if (!error) {
    // The push keys are never echoed back.
    return Response.json(CREATED, { status: 201 });
  }

  // The endpoint is the identity, so a device that opts in again keeps one row and
  // just replaces the category set. Anything else is a real failure.
  if (error.code === "23505") {
    const { error: updateError } = await admin.rpc("update_notification_categories", {
      p_endpoint: row.endpoint,
      p_categories: row.categories,
      p_consent_version: row.consent_version,
    });
    if (!updateError) return Response.json(UPDATED, { status: 200 });
  }

  return failed();
}
