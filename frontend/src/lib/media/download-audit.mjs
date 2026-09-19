import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function hashIp(ip) {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function recordDownloadAudit(params) {
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
