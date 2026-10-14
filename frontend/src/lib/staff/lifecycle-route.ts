import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StaffAccessError, requireActiveAdmin } from "@/lib/staff/server";
import { parseDeactivatePayload } from "@/lib/staff/validation";

// RPC exception messages → [HTTP status, public error code]
const RPC_ERRORS: Record<string, [number, string]> = {
  validation_error: [400, "validation_error"],
  target_not_editor: [404, "not_found"],
  target_not_inactive_editor: [409, "not_inactive"],
  cannot_delete_self: [409, "cannot_delete_self"],
  not_admin: [403, "forbidden"],
};

/** Shared handler for admin-only staff lifecycle RPCs that take { userId, reason }. */
export async function runStaffLifecycleRpc(
  request: Request,
  rpc: "reactivate_staff" | "delete_staff",
  failureCode: string,
) {
  try {
    const payload = parseDeactivatePayload(await request.json());
    const client = await createServerSupabaseClient();
    await requireActiveAdmin(client);

    const { error } = await client.rpc(rpc, {
      p_target_user_id: payload.userId,
      p_reason: payload.reason,
    });

    if (error) {
      const [status, code] = RPC_ERRORS[error.message] ?? [502, failureCode];
      if (status === 502) console.error(`${rpc} failed:`, error);
      return Response.json({ error: code }, { status });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      const status = error.code === "not_authenticated" ? 401 : 403;
      return Response.json({ error: status === 401 ? "unauthenticated" : "forbidden" }, { status });
    }
    if (error instanceof SyntaxError || (error as { code?: string })?.code === "validation_error") {
      return Response.json({ error: "validation_error" }, { status: 400 });
    }
    console.error(`${rpc} failed:`, error);
    return Response.json({ error: failureCode }, { status: 502 });
  }
}
