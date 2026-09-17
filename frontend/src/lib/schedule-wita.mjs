/**
 * Utilities for Asia/Makassar (WITA, UTC+8) schedule recurrence resolution and formatting.
 */

export const WITA_TIMEZONE = "Asia/Makassar";

export const DAY_NAMES_ID = {
  0: "Minggu",
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabat (Sabtu)",
};

/**
 * Get Indonesian day name for a given day_of_week index (0 = Minggu ... 6 = Sabat).
 * @param {number} dayOfWeek
 * @returns {string}
 */
export function getDayNameId(dayOfWeek) {
  return DAY_NAMES_ID[dayOfWeek] ?? "";
}

/**
 * Normalizes time string to "HH.MM" with dot separator for Indonesian style.
 * @param {string} timeStr
 * @returns {string}
 */
export function formatTimeDigits(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const hours = (parts[0] || "0").padStart(2, "0");
  const minutes = (parts[1] || "00").padStart(2, "0");
  return `${hours}.${minutes}`;
}

/**
 * Normalizes time string to "HH:MM" with colon separator.
 * @param {string} timeStr
 * @returns {string}
 */
export function formatHHMM(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  const hours = (parts[0] || "0").padStart(2, "0");
  const minutes = (parts[1] || "00").padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Formats a time string into "HH.MM WITA".
 * @param {string} timeStr
 * @returns {string}
 */
export function formatWitaTime(timeStr) {
  if (!timeStr) return "";
  return `${formatTimeDigits(timeStr)} WITA`;
}

/**
 * Formats a time range into "HH.MM – HH.MM WITA".
 * @param {string} startStr
 * @param {string | null} [endStr]
 * @returns {string}
 */
export function formatWitaRange(startStr, endStr) {
  if (!startStr) return "";
  if (!endStr) return formatWitaTime(startStr);
  return `${formatTimeDigits(startStr)} – ${formatTimeDigits(endStr)} WITA`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into Indonesian locale format (e.g. "Sabtu, 19 September 2026").
 * @param {string} dateStr
 * @returns {string}
 */
export function formatWitaDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateUtc);
}

/**
 * Formats a Date object to YYYY-MM-DD.
 * @param {Date} date
 * @returns {string}
 */
function toDateKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Resolves recurring schedules and exceptions across a given date range.
 *
 * @param {Array<import("../types/schedule").Schedule>} schedules
 * @param {Array<import("../types/schedule").ScheduleException>} exceptions
 * @param {string} startDateStr - format YYYY-MM-DD
 * @param {string} endDateStr - format YYYY-MM-DD
 * @returns {Array<import("../types/schedule").ResolvedOccurrence>}
 */
export function resolveWeeklyOccurrences(schedules, exceptions, startDateStr, endDateStr) {
  const [startY, startM, startD] = startDateStr.split("-").map(Number);
  const [endY, endM, endD] = endDateStr.split("-").map(Number);

  const start = new Date(Date.UTC(startY, startM - 1, startD));
  const end = new Date(Date.UTC(endY, endM - 1, endD));

  const activeSchedules = (schedules || []).filter((s) => s.status === "published");
  const activeExceptions = (exceptions || []).filter((e) => e.status === "published");

  /** @type {Array<import("../types/schedule").ResolvedOccurrence>} */
  const occurrences = [];

  const current = new Date(start);

  while (current <= end) {
    const currentDateStr = toDateKey(current);
    const dayOfWeek = current.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // 1. Check matching master schedules for this day of the week
    const matchingSchedules = activeSchedules.filter((s) => s.day_of_week === dayOfWeek);

    for (const schedule of matchingSchedules) {
      // Find exception specifically for this schedule on this date
      const exception = activeExceptions.find(
        (e) => e.schedule_id === schedule.id && e.exception_date === currentDateStr
      );

      if (exception) {
        if (exception.action === "cancelled") {
          occurrences.push({
            date: currentDateStr,
            name: schedule.name,
            startTime: formatHHMM(schedule.start_time),
            endTime: schedule.end_time ? formatHHMM(schedule.end_time) : null,
            location: schedule.location,
            category: schedule.category,
            scheduleId: schedule.id,
            isCancelled: true,
            isOverridden: false,
            isAdded: false,
            reason: exception.reason || null,
          });
        } else if (exception.action === "override") {
          occurrences.push({
            date: currentDateStr,
            name: exception.custom_name || schedule.name,
            startTime: exception.custom_start_time
              ? formatHHMM(exception.custom_start_time)
              : formatHHMM(schedule.start_time),
            endTime: exception.custom_end_time
              ? formatHHMM(exception.custom_end_time)
              : schedule.end_time
              ? formatHHMM(schedule.end_time)
              : null,
            location: exception.custom_location || schedule.location,
            category: schedule.category,
            scheduleId: schedule.id,
            isCancelled: false,
            isOverridden: true,
            isAdded: false,
            reason: exception.reason || null,
          });
        }
      } else {
        // Normal occurrence without exceptions
        occurrences.push({
          date: currentDateStr,
          name: schedule.name,
          startTime: formatHHMM(schedule.start_time),
          endTime: schedule.end_time ? formatHHMM(schedule.end_time) : null,
          location: schedule.location,
          category: schedule.category,
          scheduleId: schedule.id,
          isCancelled: false,
          isOverridden: false,
          isAdded: false,
          reason: null,
        });
      }
    }

    // 2. Check for one-off added schedules on this date
    const addedExceptions = activeExceptions.filter(
      (e) => e.exception_date === currentDateStr && e.action === "added"
    );

    for (const added of addedExceptions) {
      occurrences.push({
        date: currentDateStr,
        name: added.custom_name || "Kegiatan Khusus",
        startTime: formatHHMM(added.custom_start_time || "00:00"),
        endTime: added.custom_end_time ? formatHHMM(added.custom_end_time) : null,
        location: added.custom_location || "Gereja GMAHK Rinegetan",
        category: "Ibadah",
        scheduleId: null,
        isCancelled: false,
        isOverridden: false,
        isAdded: true,
        reason: added.reason || null,
      });
    }

    // Move to next day
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Sort chronologically by date, then startTime
  return occurrences.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });
}
