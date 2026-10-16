import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  StaffAccessError,
  requireActiveAdmin,
} from "@/lib/staff/server";
import { parseDeactivatePayload } from "@/lib/staff/validation";

const errorCode = (error: unknown) =>
  error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;

const statusForRpcError = (message: string | undefined) => {
  switch (message) {
    case "target_not_editor":
      return 404;
    case "cannot_deactivate_self":
      return 409;
    case "validation_error":
      return 400;
    default:
      return 502;
  }
};

export async function POST(request: Request) {
  try {
    const payload = parseDeactivatePayload(await request.json());
    const client = await createServerSupabaseClient();
    await requireActiveAdmin(client);

    const { error } = await client.rpc("deactivate_staff", {
      p_target_user_id: payload.userId,
      p_reason: payload.reason,
    });

    if (error) {
      return Response.json(
        { error: statusForRpcError(error.message) === 404 ? "not_found" : "deactivation_failed" },
        { status: statusForRpcError(error.message) },
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof StaffAccessError) {
      const status = error.code === "not_authenticated" ? 401 : 403;
      return Response.json(
        { error: status === 401 ? "unauthenticated" : "forbidden" },
        { status },
      );
    }

    if (errorCode(error) === "validation_error" || error instanceof SyntaxError) {
      return Response.json({ error: "validation_error" }, { status: 400 });
    }

    return Response.json({ error: "deactivation_failed" }, { status: 502 });
  }
}
