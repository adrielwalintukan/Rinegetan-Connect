import sanitizeHtml from "sanitize-html";

function text(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Invalid reader metadata");
  return value.trim();
}

function date(value) {
  if (typeof value !== "string" || !/^\d{2}\/\d{2}\/\d{4}$/.test(value)) throw new Error("Invalid reader date");
  const [day, month, year] = value.split("/").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day));
  if (result.getUTCFullYear() !== year || result.getUTCMonth() !== month - 1 || result.getUTCDate() !== day) throw new Error("Invalid reader date");
  return result.getTime();
}

export function normalizeReaderLesson(payload, quarterly, lessonId) {
  const parent = quarterly?.lessons?.find(item => item.id === lessonId);
  const lesson = payload?.lesson;
  if (!parent || !/^\d{2}$/.test(lessonId) || quarterly.index !== `in-${quarterly.id}` ||
      lesson?.id !== lessonId || lesson.index !== parent.index || text(lesson.title) !== parent.title ||
      !Array.isArray(payload.days) || !payload.days.length) throw new Error("Invalid reader lesson");
  const start = date(lesson.start_date), end = date(lesson.end_date);
  if (start > end) throw new Error("Invalid reader period");
  let previous = -Infinity;
  const ids = new Set();
  const days = payload.days.map(day => {
    const id = text(day?.id), index = `${parent.index}-${id}`, time = date(day.date);
    if (!/^\d{2}$/.test(id) || ids.has(id) || day.index !== index || time < start || time > end || time <= previous ||
        day.read_path !== `in/quarterlies/${quarterly.id}/lessons/${lessonId}/days/${id}/read`) throw new Error("Invalid reader day");
    ids.add(id); previous = time;
    return { id, index, title: text(day.title), date: day.date };
  });
  return { id: lessonId, index: parent.index, title: parent.title, startDate: lesson.start_date, endDate: lesson.end_date, days };
}

const CONTENT_TAGS = ["p", "h2", "h3", "h4", "em", "strong", "ul", "ol", "li", "blockquote", "code", "br", "sup", "sub", "a",
  "table", "thead", "tbody", "tr", "th", "td", "button"];
const VERSE_TAGS = CONTENT_TAGS.filter(tag => tag !== "button");
const STRIP = { allowedTags: [], allowedAttributes: {} };

// Adventech ships the verse text of a day alongside its content; only what is already readable stays.
function normalizeVerses(payload) {
  const entries = Array.isArray(payload?.bible) ? payload.bible : payload?.bible ? [payload.bible] : [];
  const verses = {};
  for (const entry of entries) {
    if (!entry?.verses || typeof entry.verses !== "object" || Array.isArray(entry.verses)) continue;
    for (const [reference, value] of Object.entries(entry.verses)) {
      if (typeof value !== "string") continue;
      const html = sanitizeHtml(value, { allowedTags: VERSE_TAGS, allowedAttributes: {}, allowProtocolRelative: false,
        nonTextTags: ["script", "style", "textarea", "option", "iframe", "svg", "math"] }).trim();
      if (sanitizeHtml(html, STRIP).replace(/&(?:nbsp|#160);/g, " ").trim()) verses[reference] = html;
    }
  }
  return verses;
}

export function normalizeReaderDay(payload, lesson, dayId) {
  const parent = lesson?.days?.find(item => item.id === dayId);
  if (!parent || payload?.id !== dayId || payload.index !== parent.index || payload.date !== parent.date ||
      text(payload.title) !== parent.title) throw new Error("Invalid reader day");
  const verses = normalizeVerses(payload);
  const html = sanitizeHtml(text(payload.content), {
    allowedTags: CONTENT_TAGS,
    allowedAttributes: { a: ["href", "rel"], button: ["type", "data-verse"], th: ["scope", "colspan", "rowspan"], td: ["colspan", "rowspan"] },
    allowedSchemes: ["https"], allowProtocolRelative: false,
    nonTextTags: ["script", "style", "textarea", "option", "iframe", "svg", "math"],
    // Post-transform view: a verse reference is already a button here, so keep anything carrying data-verse.
    exclusiveFilter: frame => frame.tag === "a" && !frame.attribs.href && !frame.attribs["data-verse"] ? "excludeTag" : false,
    transformTags: {
      h1: "h2",
      h2: "h2",
      h3: "h2",
      h4: "h3",
      a: (_tag, attributes) => {
        if (typeof verses[attributes.verse] === "string") {
          return { tagName: "button", attribs: { type: "button", "data-verse": attributes.verse } };
        }
        try {
          const url = new URL(attributes.href);
          if (url.protocol === "https:" && !url.username && !url.password) {
            return { tagName: "a", attribs: { href: url.href, rel: "noopener noreferrer" } };
          }
        } catch { /* Verse references without verse text remain readable text. */ }
        return { tagName: "a", attribs: {} };
      },
    },
  });
  if (!sanitizeHtml(html, STRIP).replace(/&(?:nbsp|#160);/g, " ").trim()) throw new Error("Empty reader content");
  return { ...parent, html, verses };
}
