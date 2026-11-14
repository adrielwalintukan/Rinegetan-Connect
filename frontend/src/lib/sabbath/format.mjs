const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Render an Adventech `dd/mm/yyyy` date as an Indonesian weekday and date.
 * Invalid input is returned verbatim so unverified source text never becomes a false date.
 * @param {unknown} value
 */
export function formatSabbathDate(value) {
  if (typeof value !== "string" || !/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return value;
  }
  return `${WEEKDAYS[date.getUTCDay()]}, ${day} ${MONTHS[month - 1]} ${year}`;
}
