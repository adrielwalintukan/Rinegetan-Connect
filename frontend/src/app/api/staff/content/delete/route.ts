import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveAdmin, StaffAccessError } from "@/lib/staff/server";
import { executePermanentDelete } from "@/lib/staff/content-mutations";
import { triggerPublicRevalidation } from "@/lib/public/queries";
import { publicErrorMessage } from "@/lib/api/errors";

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

    triggerPublicRevalidation(entityType);

    return Response.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return Response.json(
        { error: error.code },
        { status: error.code === "not_authenticated" ? 401 : 403 }
      );
    }
    console.error("content/delete failed:", error);
    return Response.json({ error: publicErrorMessage(error) }, { status: 400 });
  }
}
