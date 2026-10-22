/** @typedef {{ completedLessonIds: string[], bookmarkedLessonIds: string[], lastLessonId: string | null }} CourseLearningState */
/** @typedef {{ version: 1, courses: Record<string, CourseLearningState> }} LearningState */
/** @typedef {'open' | 'toggle-completed' | 'toggle-bookmark'} LearningAction */
/** @typedef {{ completedIds: string[], bookmarkedIds: string[], lastLessonId: string | null, continueLessonId: string | null, completedCount: number, total: number }} CourseLearning */

export const LEARNING_STORAGE_KEY = "rinegetan:bible-learning:v1";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** @param {unknown} value @returns {value is string} */
function isId(value) {
  return typeof value === "string" && uuid.test(value);
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @param {unknown[]} values @returns {string[]} */
function validIds(values) {
  return [...new Set(values.filter(isId))];
}

/** @returns {CourseLearningState} */
function emptyCourse() {
  return { completedLessonIds: [], bookmarkedLessonIds: [], lastLessonId: null };
}

/** @param {unknown} value @returns {CourseLearningState | null} */
function parseCourse(value) {
  if (!isRecord(value) || !Object.hasOwn(value, "completedLessonIds") || !Object.hasOwn(value, "bookmarkedLessonIds")
    || !Array.isArray(value.completedLessonIds) || !Array.isArray(value.bookmarkedLessonIds)) return null;
  return {
    completedLessonIds: validIds(value.completedLessonIds),
    bookmarkedLessonIds: validIds(value.bookmarkedLessonIds),
    lastLessonId: Object.hasOwn(value, "lastLessonId") && isId(value.lastLessonId) ? value.lastLessonId : null,
  };
}

/** @returns {LearningState} */
export function createLearningState() {
  return { version: 1, courses: {} };
}

/** Rebuild the allowlist so browser metadata can never enter trusted state or storage.
 * @param {unknown} value @returns {LearningState}
 */
function parseLearningState(value) {
  const state = createLearningState();
  if (!isRecord(value) || !Object.hasOwn(value, "version") || value.version !== 1
    || !Object.hasOwn(value, "courses") || !isRecord(value.courses)) return state;
  for (const [id, entry] of Object.entries(value.courses)) {
    if (!isId(id)) continue;
    const course = parseCourse(entry);
    if (course) state.courses[id] = course;
  }
  return state;
}

/** @param {Pick<Storage, 'getItem'> | null} storage
 * @returns {{ state: LearningState, persistent: boolean }}
 */
export function readLearningState(storage) {
  let raw;
  try {
    if (!storage) return { state: createLearningState(), persistent: false };
    raw = storage.getItem(LEARNING_STORAGE_KEY);
  } catch {
    return { state: createLearningState(), persistent: false };
  }
  try {
    return { state: parseLearningState(raw === null ? null : JSON.parse(raw)), persistent: true };
  } catch {
    return { state: createLearningState(), persistent: true };
  }
}

/** @param {Pick<Storage, 'setItem'> | null} storage @param {LearningState} state @returns {boolean} */
export function writeLearningState(storage, state) {
  try {
    if (!storage) return false;
    storage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(parseLearningState(state)));
    return true;
  } catch {
    return false;
  }
}

/** @param {LearningState} state @param {string} courseId @param {string} lessonId
 * @param {LearningAction} action @returns {LearningState}
 */
export function updateLearningState(state, courseId, lessonId, action) {
  if (!isId(courseId) || !isId(lessonId)
    || (action !== "open" && action !== "toggle-completed" && action !== "toggle-bookmark")) return state;
  const course = parseCourse(state.courses[courseId]) ?? emptyCourse();
  if (action === "open") course.lastLessonId = lessonId;
  else {
    const key = action === "toggle-completed" ? "completedLessonIds" : "bookmarkedLessonIds";
    course[key] = course[key].includes(lessonId)
      ? course[key].filter((id) => id !== lessonId) : [...course[key], lessonId];
  }
  return { version: 1, courses: { ...state.courses, [courseId]: course } };
}

/** @param {LearningState} state @param {string} courseId @param {readonly {id: string}[]} lessons
 * @returns {CourseLearning}
 */
export function getCourseLearning(state, courseId, lessons) {
  const ids = validIds(lessons.map((lesson) => lesson.id));
  const course = (isId(courseId) && Object.hasOwn(state.courses, courseId) && parseCourse(state.courses[courseId])) || emptyCourse();
  const completed = new Set(course.completedLessonIds);
  const bookmarked = new Set(course.bookmarkedLessonIds);
  const completedIds = ids.filter((id) => completed.has(id));
  const bookmarkedIds = ids.filter((id) => bookmarked.has(id));
  const lastLessonId = course.lastLessonId !== null && ids.includes(course.lastLessonId) ? course.lastLessonId : null;
  return {
    completedIds, bookmarkedIds, lastLessonId,
    continueLessonId: lastLessonId ?? ids.find((id) => !completed.has(id)) ?? ids[0] ?? null,
    completedCount: completedIds.length, total: ids.length,
  };
}
