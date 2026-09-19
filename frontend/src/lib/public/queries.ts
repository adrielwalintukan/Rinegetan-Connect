import type { Announcement, EventItem, Department } from "@/types/content";
import type { Schedule, ResolvedOccurrence } from "@/types/schedule";
import type { MediaAlbum, MediaAsset } from "@/types/media";

export {
  getPublishedAnnouncements,
  getPublishedEvents,
  getPublishedSchedules,
  getPublishedDepartments,
  getPublicMediaAlbums,
  getPublicMediaAssets,
  getSiteSectionMedia,
  triggerPublicRevalidation,
} from "./queries.mjs";

export type SectionMediaKey = "home_hero" | "home_welcome" | "sekolah_sabat" | "tentang_kami";

export interface SectionMediaItem {
  section_key: SectionMediaKey;
  asset_id: string;
  image_url: string;
  alt_text: string;
  caption?: string | null;
}

export type SiteSectionMediaMap = Record<string, SectionMediaItem>;

export type PublicAnnouncementsResult = Announcement[];
export type PublicEventsResult = EventItem[];
export type PublicSchedulesResult = Schedule[] | ResolvedOccurrence[];
export type PublicDepartmentsResult = Department[];
export type PublicMediaAlbumItem = MediaAlbum & {
  photo_count: number;
  cover?: Partial<MediaAsset> | null;
};
export type PublicMediaAssetItem = MediaAsset & {
  album_assets?: Array<{
    album_id: string;
    position: number;
    is_cover: boolean;
    album?: Partial<MediaAlbum> | null;
  }>;
};
