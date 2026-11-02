// frontend/src/app/api/staff/visits/[id]/route.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff } from "@/lib/staff/server";
import { PublicFormError } from "@/lib/forms/public-form";
import { parsePastoralStatus, updatePastoralStatus } from "@/lib/forms/pastoral-admin";
import { staffAccessResponse } from "@/lib/courses/import-actions";
import { GENERIC_ERROR_MESSAGE, publicErrorMessage } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };
const TABLE = "visitor_submissions";

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
      return Response.json({ error: "Format permintaan tidak valid." }, { status: 415 });
    }
    // Authenticate before reading the body so anonymous callers cannot make the server parse it.
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    let input: unknown;
    try { input = await request.json(); } catch { return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 }); }
    const status = parsePastoralStatus(input, TABLE);
    return Response.json({ success: true, data: await updatePastoralStatus(client, TABLE, (await context.params).id, status, staff.role) });
  } catch (error) {
    const denied = staffAccessResponse(error);
    if (denied) return denied;
    if (error instanceof PublicFormError) return Response.json({ error: publicErrorMessage(error) }, { status: error.status });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
