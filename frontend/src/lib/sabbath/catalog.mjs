import { normalizeQuarterly } from "./adventech.mjs";

const classes = [
  ["kindergarten", "Kindergarten"], ["primary", "Primary"], ["powerpoint", "PowerPoint"],
  ["cornerstone", "Cornerstone"], ["adult", "Dewasa"],
];

// ponytail: trusted class mappings only; connect verified upstream mappings after the rights gate is approved.
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
