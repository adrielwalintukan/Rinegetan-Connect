import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  StaffAccessError,
  requireActiveAdmin,
} from "@/lib/staff/server";
import { parseInviteEditorPayload } from "@/lib/staff/validation";

const statusForStaffAccessError = (error: unknown) => {
  if (error instanceof StaffAccessError) {
    return error.code === "not_authenticated" ? 401 : 403;
  }

  return null;
};

const errorCode = (error: unknown) =>
  error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;

export async function POST(request: Request) {
  try {
    const payload = parseInviteEditorPayload(await request.json());
    const client = await createServerSupabaseClient();
    await requireActiveAdmin(client);

    const adminClient = createSupabaseAdminClient();
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(payload.email);

    if (inviteError || !inviteData.user) {
      return Response.json({ error: "invite_failed" }, { status: 502 });
    }

    const { data: provisionedUserId, error: provisionError } = await client.rpc(
      "provision_invited_editor",
      {
        p_target_user_id: inviteData.user.id,
        p_display_name: payload.displayName,
      },
    );

    if (provisionError || !provisionedUserId) {
      await adminClient.auth.admin.deleteUser(inviteData.user.id);

      if (provisionError?.message === "target_already_staff") {
        return Response.json({ error: "staff_conflict" }, { status: 409 });
      }

      return Response.json({ error: "provision_failed" }, { status: 502 });
    }

    return Response.json(
      { userId: provisionedUserId },
      { status: 201 },
    );
  } catch (error) {
    const accessStatus = statusForStaffAccessError(error);
    if (accessStatus) {
      return Response.json(
        { error: accessStatus === 401 ? "unauthenticated" : "forbidden" },
        { status: accessStatus },
      );
    }

    if (errorCode(error) === "validation_error" || error instanceof SyntaxError) {
      return Response.json({ error: "validation_error" }, { status: 400 });
    }

    return Response.json({ error: "invite_failed" }, { status: 502 });
  }
}
