export * from "./content-mutations.mjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentStatus } from "@/types/content";
import {
  SUPPORTED_ENTITIES,
  validateStatusTransition,
  validateDeletePayload,
  assertCanMutateStatus,
  assertCanDeletePermanently,
  sanitizeSavePayload,
} from "./content-mutations.mjs";
import { UserFacingError } from "@/lib/api/errors";

export type ContentEntityType =
  | "announcements"
  | "events"
  | "departments"
  | "schedules"
  | "media_assets";

export interface StatusMutationParams {
  role: string;
  entityType: ContentEntityType;
  id: string;
  newStatus: ContentStatus;
}

export interface DeleteMutationParams {
  role: string;
  entityType: ContentEntityType;
  id: string;
  reason: string;
}

export interface SaveMutationParams {
  role: string;
  entityType: ContentEntityType;
  id?: string | null;
  data: Record<string, unknown>;
}

export async function executeStatusChange(
  client: SupabaseClient,
  params: StatusMutationParams
) {
  assertCanMutateStatus(params.role);

  if (!SUPPORTED_ENTITIES.includes(params.entityType)) {
    throw new UserFacingError(`Entitas tidak valid: ${params.entityType}`);
  }

  if (!validateStatusTransition(null, params.newStatus)) {
    throw new UserFacingError(`Status tidak valid: ${params.newStatus}`);
  }

  const { data, error } = await client
    .from(params.entityType)
    .update({ status: params.newStatus })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function executePermanentDelete(
  client: SupabaseClient,
  params: DeleteMutationParams
) {
  assertCanDeletePermanently(params.role);

  if (!SUPPORTED_ENTITIES.includes(params.entityType)) {
    throw new UserFacingError(`Entitas tidak valid: ${params.entityType}`);
  }

  const validation = validateDeletePayload(params.reason);
  if (!validation.valid) {
    throw new UserFacingError(validation.message || "Alasan penghapusan tidak valid");
  }

  try {
    await client.rpc("set_audit_reason", { p_reason: validation.reason });
  } catch {
    // optional audit reason setting
  }

  const { error } = await client
    .from(params.entityType)
    .delete()
    .eq("id", params.id);

  if (error) {
    throw error;
  }

  return { success: true, deletedId: params.id };
}

export async function executeSaveContent(
  client: SupabaseClient,
  params: SaveMutationParams
) {
  assertCanMutateStatus(params.role);

  if (!SUPPORTED_ENTITIES.includes(params.entityType)) {
    throw new UserFacingError(`Entitas tidak valid: ${params.entityType}`);
  }

  const payload = sanitizeSavePayload(params.entityType, params.data);

  if (params.id) {
    const { data, error } = await client
      .from(params.entityType)
      .update(payload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  } else {
    const { data, error } = await client
      .from(params.entityType)
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  }
}

