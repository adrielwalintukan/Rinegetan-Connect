import type { ContentStatus } from "./content";

export type MediaCategory =
  | "ibadah"
  | "pemuda"
  | "sekolah_sabat"
  | "sosial"
  | "fellowship"
  | "umum";

export type MediaProcessingState = "pending" | "ready" | "failed";

export type ConsentStatus = "pending" | "approved" | "rejected" | "revoked";

export type SubjectAgeGroup = "general" | "child";

export interface MediaAlbum {
  id: string;
  title: string;
  slug: string;
  category: MediaCategory;
  event_id?: string | null;
  department_id?: string | null;
  occurred_on: string;
  description?: string | null;
  cover_asset_id?: string | null;
  status: ContentStatus;
  public_download_enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface MediaAsset {
  id: string;
  storage_path: string;
  mime_type: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  alt_text: string;
  caption?: string | null;
  captured_at?: string | null;
  processing_state: MediaProcessingState;
  public_download_enabled: boolean;
  consent_status: ConsentStatus;
  consent_recorded_at?: string | null;
  consent_recorded_by?: string | null;
  subject_age_group: SubjectAgeGroup;
  hidden_at?: string | null;
  hidden_reason?: string | null;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface AlbumAsset {
  album_id: string;
  asset_id: string;
  position: number;
  is_cover: boolean;
  created_at: string;
  asset?: MediaAsset;
  album?: MediaAlbum;
}

export interface ConsentRecord {
  id: string;
  asset_id: string;
  consent_status: ConsentStatus;
  subject_age_group: SubjectAgeGroup;
  notes?: string | null;
  recorded_by?: string | null;
  recorded_at: string;
}
