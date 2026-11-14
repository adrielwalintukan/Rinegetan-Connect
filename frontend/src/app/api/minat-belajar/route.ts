// frontend/src/app/api/minat-belajar/route.ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicErrorMessage } from "@/lib/api/errors";
import { StudyInterestError, clientIp, hashFormIp, readFormBody, submitStudyInterest, verifyTurnstile } from "@/lib/forms/study-interest";

export const runtime = "nodejs";
const unavailable = () => Response.json({ error: "Formulir sementara tidak tersedia." }, { status: 503 });

export async function POST(request: Request): Promise<Response> {
  let input: unknown;
  try { input = await readFormBody(request); }
  catch (error) {
    if (error instanceof StudyInterestError) return Response.json({ error: publicErrorMessage(error) }, { status: error.status });
    throw error;
  }
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return unavailable();
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try { admin = createSupabaseAdminClient(); } catch { return unavailable(); }
  const result = await submitStudyInterest(input, {
    ipHash: hashFormIp(clientIp(request), key),
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
    verifyTurnstile: (token, secret) => verifyTurnstile(token, secret),
    checkRate: async (form, ipHash, limit) => {
      const { data, error } = await admin.rpc("check_form_rate", { p_form: form, p_ip_hash: ipHash, p_limit: limit, p_window: "1 hour" });
      if (error) throw error;
      return data === true;
    },
    insertLead: async (row) => {
      const { error } = await admin.from("study_interest_leads").insert(row);
      if (error) throw error;
    },
  });
  return Response.json(result.body, { status: result.status });
}
