// frontend/src/lib/notifications/centre.mjs
// P5-003: the copy and the pure decisions behind the preference centre.
//
// The component stays thin so the wording, the blocked-state reasons and the request
// bodies are all testable without a browser. Nothing here holds a contact detail: the
// identity is the device (owner decision 2026-11-17).

import { CATEGORIES, normalizePreferences } from "./preferences.mjs";

const OPTIONS = [
  {
    id: "pengumuman",
    label: "Pengumuman Gereja",
    description: "Kabar jemaat, perubahan jadwal, dan informasi penting lainnya.",
  },
  {
    id: "ibadah",
    label: "Ibadah & Kegiatan",
    description: "Pengingat ibadah Sabat dan kegiatan jemaat yang akan datang.",
  },
  {
    id: "pelajari-alkitab",
    label: "Pelajari Alkitab",
    description: "Materi dan kelas belajar Alkitab yang baru dibuka.",
  },
  {
    id: "sekolah-sabat",
    label: "Sekolah Sabat",
    description: "Pelajaran Sekolah Sabat yang baru tersedia.",
  },
];

/** The four categories in the fixed church order, with their labels. */
export function categoryOptions() {
  return OPTIONS.filter((option) => CATEGORIES.includes(option.id));
}

export const centreCopy = {
  heading: "Notifikasi",
  intro: "Pilih kabar yang ingin Anda terima dari jemaat.",
  noAccount: "Anda tidak perlu akun dan tidak perlu menuliskan email atau nomor telepon.",
  identity: "Notifikasi terikat pada perangkat ini, jadi tidak ada data pribadi yang disimpan.",
  permission:
    "Browser akan meminta izin notifikasi. Bila izin ditolak, Anda dapat mengizinkannya lagi lewat pengaturan situs di browser.",
  stopAllHint: "Berhenti berlangganan akan menghentikan semua notifikasi untuk perangkat ini.",
  save: "Simpan pilihan",
  saving: "Menyimpan…",
  stopAll: "Berhenti berlangganan semua",
};

/**
 * Whether this browser can subscribe at all, and why not when it cannot.
 * @param {{ hasPushManager: boolean, hasVapidKey: boolean }} state
 */
export function canSubscribe({ hasPushManager, hasVapidKey }) {
  if (!hasPushManager) {
    return {
      ok: false,
      reason: "Browser ini belum mendukung notifikasi. Coba buka situs ini dengan browser lain.",
    };
  }
  if (!hasVapidKey) {
    return {
      ok: false,
      reason: "Layanan notifikasi belum tersedia saat ini. Silakan coba lagi nanti.",
    };
  }
  return { ok: true, reason: "" };
}

/**
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} subscription
 * @param {Record<string, boolean>} prefs
 */
export function toSubscribeBody(subscription, prefs) {
  const normalized = normalizePreferences(prefs);
  const categories = CATEGORIES.filter((category) => normalized[category]);
  if (categories.length === 0) {
    throw new Error("Pilih minimal satu kategori sebelum menyimpan.");
  }
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    categories,
  };
}

/** @param {string} endpoint */
export function toStopBody(endpoint) {
  return { endpoint };
}

/** @param {Record<string, boolean>} prefs */
export function summaryText(prefs) {
  const normalized = normalizePreferences(prefs);
  const count = CATEGORIES.filter((category) => normalized[category]).length;
  if (count === 0) return "Belum ada kategori yang dipilih.";
  return `${count} kategori dipilih.`;
}
