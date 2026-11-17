// frontend/src/app/api/notifikasi/berhenti/route.ts
// P5-003: stop-all for this device.
//
// Stopping removes the subscription row instead of storing an empty category set:
// a subscription that receives nothing is not a subscription, and the consent log
// records the stop explicitly.
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicErrorMessage, GENERIC_ERROR_MESSAGE } from "@/lib/api/errors";
import { SubscriptionError, parseStopRequest } from "@/lib/notifications/subscription";
import { clientIp, hashFormIp, readFormBody } from "@/lib/forms/public-form";

export const runtime = "nodejs";

const unavailable = () => Response.json({ error: "Layanan notifikasi sementara tidak tersedia." }, { status: 503 });

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try {
    input = await readFormBody(request);
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 400;
    return Response.json({ error: publicErrorMessage(error) }, { status });
  }

  let endpoint: string;
  try {
    endpoint = parseStopRequest(input);
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

  const { data: allowed, error: rateError } = await admin.rpc("check_form_rate", {
    p_form: "notification_stop",
    p_ip_hash: hashFormIp(clientIp(request), key),
    p_limit: 10,
    p_window: "1 hour",
  });
  if (rateError) return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  if (allowed !== true) {
    return Response.json({ error: "Terlalu banyak permintaan. Silakan coba lagi nanti." }, { status: 429 });
  }

  const { error } = await admin.rpc("stop_notification_subscription", { p_endpoint: endpoint });
  if (error) return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });

  return Response.json({ success: true, message: "Notifikasi untuk perangkat ini sudah dihentikan." }, { status: 200 });
}
