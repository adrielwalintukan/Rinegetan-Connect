import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { parseAlbumDownloadPayload, setAlbumDownloadEnabled } from "@/lib/media/album-download";
import { UserFacingError, publicErrorMessage } from "@/lib/api/errors";
import { triggerPublicRevalidation } from "@/lib/public/queries";

export async function POST(request: Request) {
  try {
    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);
    const payload = parseAlbumDownloadPayload(await request.json());
    const { data, error } = await setAlbumDownloadEnabled(client, payload, staff.user.id);
    if (error || !data) {
      const missing = error?.code === "PGRST116" || !error;
      return Response.json(
        { error: missing ? "not_found" : "update_failed", message: missing ? "Album tidak ditemukan." : publicErrorMessage(error) },
        { status: missing ? 404 : 500 },
      );
    }
    await triggerPublicRevalidation("media_albums");
    return Response.json({ success: true, data });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return Response.json(
        { error: error.code, message: "Sesi Anda berakhir atau akun tidak memiliki akses staf." },
        { status: error.code === "not_authenticated" ? 401 : 403 },
      );
    }
    const invalid = error instanceof SyntaxError || error instanceof UserFacingError;
    return Response.json(
      { error: invalid ? "validation_error" : "server_error", message: publicErrorMessage(error) },
      { status: invalid ? 400 : 500 },
    );
  }
}
