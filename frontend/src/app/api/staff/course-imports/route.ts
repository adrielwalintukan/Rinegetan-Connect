import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff } from "@/lib/staff/server";
import { parseCourseImport, CourseImportError } from "@/lib/courses/imports";
import { createCourseImport, importFailure, readImportBody, staffAccessResponse } from "@/lib/courses/import-actions";
import { publicErrorMessage } from "@/lib/api/errors";

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = parseCourseImport(await readImportBody(request));
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    return Response.json({ success: true, data: await createCourseImport(client, payload, staff.role) });
  } catch (error) {
    const denied = staffAccessResponse(error);
    if (denied) return denied;
    const failure = importFailure(error);
    return Response.json({ error: publicErrorMessage(failure) }, { status: failure instanceof CourseImportError ? failure.status : 500 });
  }
}
