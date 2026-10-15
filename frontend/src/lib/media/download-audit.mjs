import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** @param {string} ip */
export function hashIp(ip) {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Records a public download. Never throws (a failed audit must not break the download),
 * but every failure is logged so a misconfiguration is visible instead of silent.
 * @param {{ action: string, entityType: string, entityId?: string | null, changes: Record<string, unknown>, actorId?: string | null }} params
 */
export async function recordDownloadAudit(params) {
  const client = getServiceSupabaseClient();
  if (!client) {
    console.error("Download audit skipped: SUPABASE_SECRET_KEY or Supabase URL is not configured.");
    return;
  }

  try {
    const { error } = await client.from("audit_logs").insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      actor_id: params.actorId || null,
      changes: params.changes,
    });
    if (error) console.error("Failed to record media download audit log:", error);
  } catch (err) {
    console.error("Failed to record media download audit log:", err);
  }
}
