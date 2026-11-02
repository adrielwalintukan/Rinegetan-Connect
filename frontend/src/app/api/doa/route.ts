// frontend/src/app/api/doa/route.ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { postPublicForm } from "@/lib/forms/public-form-route";
import { submitPrayerRequest } from "@/lib/forms/prayer-request";

export const runtime = "nodejs";

export function POST(request: Request): Promise<Response> {
  return postPublicForm(request, { table: "prayer_requests", submit: submitPrayerRequest, createAdmin: createSupabaseAdminClient });
}
