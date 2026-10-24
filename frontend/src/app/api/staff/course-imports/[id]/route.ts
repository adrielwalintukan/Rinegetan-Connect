import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff } from "@/lib/staff/server";
import { CourseImportError } from "@/lib/courses/imports";
import { decideCourseImport, importFailure, importId, loadCourseImportPayload, parseCourseImportDecision, staffAccessResponse } from "@/lib/courses/import-actions";
import { publicErrorMessage } from "@/lib/api/errors";

type Context = { params: Promise<{ id: string }> };
function failure(error: unknown): Response {
  const denied = staffAccessResponse(error);
  if (denied) return denied;
  const mapped = importFailure(error);
  return Response.json({ error: publicErrorMessage(mapped) }, { status: mapped instanceof CourseImportError ? mapped.status : 500 });
}

export async function GET(_request: Request, context: Context): Promise<Response> {
  try {
    const id = importId((await context.params).id);
    const client = await createServerSupabaseClient();
    await requireActiveStaff(client);
    return Response.json({ success: true, data: await loadCourseImportPayload(client, id) });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, context: Context): Promise<Response> {
  try {
    const id = importId((await context.params).id);
    let input: unknown;
    try { input = await request.json(); } catch { return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 }); }
    const decision = parseCourseImportDecision(input);
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    return Response.json({ success: true, data: await decideCourseImport(client, id, decision, staff.role) });
  } catch (error) { return failure(error); }
}
