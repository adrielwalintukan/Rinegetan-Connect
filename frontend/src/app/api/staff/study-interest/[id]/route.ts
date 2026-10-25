import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff } from "@/lib/staff/server";
import { StudyInterestError } from "@/lib/forms/study-interest";
import { parseLeadStatus, updateLeadStatus } from "@/lib/forms/study-interest-admin";
import { staffAccessResponse } from "@/lib/courses/import-actions";
import { GENERIC_ERROR_MESSAGE, publicErrorMessage } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
      return Response.json({ error: "Format permintaan tidak valid." }, { status: 415 });
    }
    let input: unknown;
    try { input = await request.json(); } catch { return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 }); }
    const status = parseLeadStatus(input);
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    return Response.json({ success: true, data: await updateLeadStatus(client, (await context.params).id, status, staff.role) });
  } catch (error) {
    const denied = staffAccessResponse(error);
    if (denied) return denied;
    if (error instanceof StudyInterestError) return Response.json({ error: publicErrorMessage(error) }, { status: error.status });
    return Response.json({ error: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
