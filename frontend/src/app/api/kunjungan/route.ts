// frontend/src/app/api/kunjungan/route.ts
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { postPublicForm } from "@/lib/forms/public-form-route";
import { submitVisit } from "@/lib/forms/visit";

export const runtime = "nodejs";

export function POST(request: Request): Promise<Response> {
  return postPublicForm(request, { table: "visitor_submissions", submit: submitVisit, createAdmin: createSupabaseAdminClient });
}
