import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveAdmin, StaffAccessError } from "@/lib/staff/server";
import { executePermanentDelete } from "@/lib/staff/content-mutations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, id, reason } = body;

    if (!entityType || !id || !reason) {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }

    const client = await createServerSupabaseClient();
    // Enforce Admin only
    await requireActiveAdmin(client);

    const result = await executePermanentDelete(client, {
      role: "admin",
      entityType,
      id,
      reason,
    });

    return Response.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return Response.json(
        { error: error.code },
        { status: error.code === "not_authenticated" ? 401 : 403 }
      );
    }
    const message = error instanceof Error ? error.message : "Gagal menghapus konten";
    return Response.json({ error: message }, { status: 400 });
  }
}
