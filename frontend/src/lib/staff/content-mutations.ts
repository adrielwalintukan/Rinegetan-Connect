export * from "./content-mutations.mjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentStatus } from "@/types/content";
import {
  SUPPORTED_ENTITIES,
  validateStatusTransition,
  validateDeletePayload,
  assertCanMutateStatus,
  assertCanDeletePermanently,
} from "./content-mutations.mjs";

export type ContentEntityType =
  | "announcements"
  | "events"
  | "departments"
  | "schedules";

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
    throw new Error(`Entitas tidak valid: ${params.entityType}`);
  }

  if (!validateStatusTransition(null, params.newStatus)) {
    throw new Error(`Status tidak valid: ${params.newStatus}`);
  }

  const { data, error } = await client
    .from(params.entityType)
    .update({ status: params.newStatus })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function executePermanentDelete(
  client: SupabaseClient,
  params: DeleteMutationParams
) {
  assertCanDeletePermanently(params.role);

  if (!SUPPORTED_ENTITIES.includes(params.entityType)) {
    throw new Error(`Entitas tidak valid: ${params.entityType}`);
  }

  const validation = validateDeletePayload(params.reason);
  if (!validation.valid) {
    throw new Error(validation.message || "Alasan penghapusan tidak valid");
  }

  const { error } = await client
    .from(params.entityType)
    .delete()
    .eq("id", params.id);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, deletedId: params.id };
}

export async function executeSaveContent(
  client: SupabaseClient,
  params: SaveMutationParams
) {
  assertCanMutateStatus(params.role);

  if (!SUPPORTED_ENTITIES.includes(params.entityType)) {
    throw new Error(`Entitas tidak valid: ${params.entityType}`);
  }

  if (params.id) {
    const { data, error } = await client
      .from(params.entityType)
      .update(params.data)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  } else {
    const { data, error } = await client
      .from(params.entityType)
      .insert(params.data)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}
