import { normalizeQuarterly } from "./adventech.mjs";

const classes = [
  ["kindergarten", "Kindergarten"], ["primary", "Primary"], ["powerpoint", "PowerPoint"],
  ["cornerstone", "Cornerstone"], ["adult", "Dewasa"],
];

// ponytail: explicit mappings only; add other classes when their Indonesian source is verified.
export function selectSabbathCatalog(entries) {
  if (!Array.isArray(entries)) return [];
  return classes.flatMap(([classId, label]) => {
    const matches = entries.filter((entry) => entry?.classId === classId);
    if (matches.length !== 1) return [];
    try {
      return [{ classId, label, quarterly: normalizeQuarterly(matches[0].payload) }];
    } catch {
      return [];
    }
  });
}

function sourceDate(value) {
  if (typeof value !== "string" || !/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;
  const [day, month, year] = value.split("/");
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

export function selectActiveAdultQuarter(entries, now) {
  if (!Array.isArray(entries) || !Number.isFinite(now?.valueOf())) return null;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Makassar" }).format(now);
  const matches = entries.filter((q) => {
    const start = sourceDate(q?.start_date), end = sourceDate(q?.end_date);
    return q?.lang === "in" && /^\d{4}-0[1-4]$/.test(q.id) && q.index === `in-${q.id}` &&
      !q.quarterly_group && start && end && start <= today && today <= end;
  });
  return matches.length === 1 ? matches[0] : null;
}
