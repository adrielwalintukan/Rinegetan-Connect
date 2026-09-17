import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { executeStatusChange } from "@/lib/staff/content-mutations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, id, status } = body;

    if (!entityType || !id || !status) {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }

    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);

    const updated = await executeStatusChange(client, {
      role: staff.role,
      entityType,
      id,
      newStatus: status,
    });

    return Response.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return Response.json(
        { error: error.code },
        { status: error.code === "not_authenticated" ? 401 : 403 }
      );
    }
    const message = error instanceof Error ? error.message : "Gagal memperbarui status";
    return Response.json({ error: message }, { status: 400 });
  }
}
