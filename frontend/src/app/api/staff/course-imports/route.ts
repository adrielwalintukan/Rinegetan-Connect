import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { parseCourseImport, CourseImportError } from "@/lib/courses/imports";
import { createCourseImport, importFailure } from "@/lib/courses/import-actions";
import { publicErrorMessage } from "@/lib/api/errors";

function staffError(error: StaffAccessError): Response {
  return Response.json(
    { error: error.code === "not_authenticated" ? "Sesi berakhir. Silakan masuk kembali." : "Hanya staf aktif yang dapat mengelola materi." },
    { status: error.code === "not_authenticated" ? 401 : 403 },
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = parseCourseImport(await request.text());
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    return Response.json({ success: true, data: await createCourseImport(client, payload, staff.role) });
  } catch (error) {
    if (error instanceof StaffAccessError) return staffError(error);
    const failure = importFailure(error);
    return Response.json({ error: publicErrorMessage(failure) }, { status: failure instanceof CourseImportError ? failure.status : 500 });
  }
}
