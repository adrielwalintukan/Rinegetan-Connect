export { loadAuditLogs, formatAuditTimestamp } from "./audit.mjs";

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes?: Record<string, unknown> | null;
  occurred_at: string;
}
