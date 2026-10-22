import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { parseCourseMutation, executeCourseMutation, CourseMutationError } from "@/lib/courses/mutations";
import { publicErrorMessage } from "@/lib/api/errors";
import { invalidateCourseReader } from "@/lib/courses/revalidation";

export async function POST(request: Request): Promise<Response> {
  try {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json({ error: "Format permintaan tidak valid." }, { status: 400 });
    }
    const mutation = parseCourseMutation(input);
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    const data = await executeCourseMutation(client, mutation, staff.role);
    try {
      invalidateCourseReader({ revalidateTag, revalidatePath });
    } catch {
      return Response.json({ success: true, data, warning: "Perubahan tersimpan, tetapi penyegaran tampilan publik belum berhasil. Silakan periksa kembali beberapa saat lagi." });
    }
    return Response.json({ success: true, data });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return Response.json(
        { error: error.code === "not_authenticated" ? "Sesi berakhir. Silakan masuk kembali." : "Hanya staf aktif yang dapat mengelola materi." },
        { status: error.code === "not_authenticated" ? 401 : 403 },
      );
    }
    return Response.json(
      { error: publicErrorMessage(error) },
      { status: error instanceof CourseMutationError ? error.status : 500 },
    );
  }
}
