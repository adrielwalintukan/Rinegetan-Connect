import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function recordDownloadAudit(params: {
  action: "media.download_asset" | "media.download_album" | "media.download_category";
  entityType: "media_asset" | "media_album" | "media_category";
  entityId?: string | null;
  changes: Record<string, unknown>;
  actorId?: string | null;
}): Promise<void> {
  const client = getServiceSupabaseClient();
  if (!client) return;

  try {
    await client.from("audit_logs").insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      actor_id: params.actorId || null,
      changes: params.changes,
    });
  } catch (err) {
    console.error("Failed to record media download audit log:", err);
  }
}
