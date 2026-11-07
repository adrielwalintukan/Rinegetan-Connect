import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff } from "@/lib/staff/server";
import { PublicFormError } from "@/lib/forms/public-form";
import { purgeExpiredPastoralData } from "@/lib/forms/pastoral-admin";
import { staffAccessResponse } from "@/lib/courses/import-actions";
import { GENERIC_ERROR_MESSAGE, publicErrorMessage } from "@/lib/api/errors";

// Deletes every pastoral row past the retention cut-off. The body is ignored; the JSON content type
// is still required, as on the PATCH routes, so a cross-site form post cannot trigger it.
export async function POST(request: Request): Promise<Response> {
  try {
    if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
      return Response.json({ error: "Format permintaan tidak valid." }, { status: 415 });
    }
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    return Response.json({ success: true, data: await purgeExpiredPastoralData(client, staff.role) });
  } catch (error) {
    const denied = staffAccessResponse(error);
    if (denied) return denied;
    if (error instanceof PublicFormError) return Response.json({ error: publicErrorMessage(error) }, { status: error.status });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
