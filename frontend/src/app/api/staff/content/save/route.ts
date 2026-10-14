import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActiveStaff, StaffAccessError } from "@/lib/staff/server";
import { executeSaveContent } from "@/lib/staff/content-mutations";
import { triggerPublicRevalidation } from "@/lib/public/queries";
import { publicErrorMessage } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, id, data } = body;

    if (!entityType || !data || typeof data !== "object") {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }

    const client = await createServerSupabaseClient();
    const staff = await requireActiveStaff(client);

    const saved = await executeSaveContent(client, {
      role: staff.role,
      entityType,
      id: id || null,
      data,
    });

    triggerPublicRevalidation(entityType);

    return Response.json({ success: true, data: saved }, { status: 200 });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return Response.json(
        { error: error.code },
        { status: error.code === "not_authenticated" ? 401 : 403 }
      );
    }
    console.error("content/save failed:", error);
    return Response.json({ error: publicErrorMessage(error) }, { status: 400 });
  }
}
