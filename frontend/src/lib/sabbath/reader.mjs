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

export function normalizeReaderDay(payload, lesson, dayId) {
  const parent = lesson?.days?.find(item => item.id === dayId);
  if (!parent || payload?.id !== dayId || payload.index !== parent.index || payload.date !== parent.date ||
      text(payload.title) !== parent.title) throw new Error("Invalid reader day");
  const html = sanitizeHtml(text(payload.content), {
    allowedTags: ["p", "h2", "h3", "h4", "em", "strong", "ul", "ol", "li", "blockquote", "code", "br", "sup", "sub", "a",
      "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: { a: ["href", "rel"], th: ["scope", "colspan", "rowspan"], td: ["colspan", "rowspan"] },
    allowedSchemes: ["https"], allowProtocolRelative: false,
    nonTextTags: ["script", "style", "textarea", "option", "iframe", "svg", "math"],
    exclusiveFilter: frame => frame.tag === "a" && !frame.attribs.href ? "excludeTag" : false,
    transformTags: {
      h1: "h2",
      h2: "h2",
      h3: "h2",
      h4: "h3",
      a: (_tag, attributes) => {
        try {
          const url = new URL(attributes.href);
          if (url.protocol === "https:" && !url.username && !url.password) {
            return { tagName: "a", attribs: { href: url.href, rel: "noopener noreferrer" } };
          }
        } catch { /* Verse references without URLs remain readable text. */ }
        return { tagName: "a", attribs: {} };
      },
    },
  });
  if (!sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&(?:nbsp|#160);/g, " ").trim()) throw new Error("Empty reader content");
  return { ...parent, html };
}
