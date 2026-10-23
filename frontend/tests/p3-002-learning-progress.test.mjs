import assert from "node:assert/strict";
import test from "node:test";
import {
  LEARNING_STORAGE_KEY, createLearningState, readLearningState,
  writeLearningState, updateLearningState, getCourseLearning,
} from "../src/lib/courses/progress.mjs";

const courseId = "11111111-1111-4111-8111-111111111111";
const otherCourseId = "22222222-2222-4222-8222-222222222222";
const firstId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const secondId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const withdrawnId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const lessons = [{ id: firstId }, { id: secondId }];
const emptyCourse = { completedLessonIds: [], bookmarkedLessonIds: [], lastLessonId: null };

// Only the browser Storage boundary is replaced; the actual parser and transitions run.
function storageWith(raw = null) {
  const values = new Map(raw === null ? [] : [["rinegetan:bible-learning:v1", raw]]);
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

function readJson(value) {
  return readLearningState(storageWith(JSON.stringify(value)));
}

test("fresh states do not share mutable course records", () => {
  const first = createLearningState();
  first.courses[courseId] = { ...emptyCourse };
  assert.deepEqual(createLearningState(), { version: 1, courses: {} });
});

test("opening records only the last lesson and preserves manual completion and bookmarks", () => {
  const opened = updateLearningState(createLearningState(), courseId, firstId, "open");
  assert.deepEqual(opened, {
    version: 1, courses: { [courseId]: { completedLessonIds: [], bookmarkedLessonIds: [], lastLessonId: firstId } },
  });
  const completed = updateLearningState(opened, courseId, firstId, "toggle-completed");
  const bookmarked = updateLearningState(completed, courseId, firstId, "toggle-bookmark");
  const next = updateLearningState(bookmarked, courseId, secondId, "open");
  assert.deepEqual(next.courses[courseId], {
    completedLessonIds: [firstId], bookmarkedLessonIds: [firstId], lastLessonId: secondId,
  });
});

test("completion toggles independently of bookmarks and never changes the resume position", () => {
  const bookmarked = updateLearningState(createLearningState(), courseId, firstId, "toggle-bookmark");
  const completed = updateLearningState(bookmarked, courseId, firstId, "toggle-completed");
  assert.deepEqual(getCourseLearning(completed, courseId, lessons), {
    completedIds: [firstId], bookmarkedIds: [firstId], lastLessonId: null,
    continueLessonId: secondId, completedCount: 1, total: 2,
  });
  const undone = updateLearningState(completed, courseId, firstId, "toggle-completed");
  assert.deepEqual(undone.courses[courseId], {
    completedLessonIds: [], bookmarkedLessonIds: [firstId], lastLessonId: null,
  });
  const doneAgain = updateLearningState(undone, courseId, firstId, "toggle-completed");
  assert.deepEqual(doneAgain.courses[courseId].completedLessonIds, [firstId]);
});

test("removing a bookmark preserves completion and the last opened lesson", () => {
  const opened = updateLearningState(createLearningState(), courseId, secondId, "open");
  const done = updateLearningState(opened, courseId, firstId, "toggle-completed");
  const saved = updateLearningState(done, courseId, firstId, "toggle-bookmark");
  const unsaved = updateLearningState(saved, courseId, firstId, "toggle-bookmark");
  assert.deepEqual(unsaved.courses[courseId], {
    completedLessonIds: [firstId], bookmarkedLessonIds: [], lastLessonId: secondId,
  });
});

test("transitions leave frozen inputs and other courses unchanged", () => {
  const originalCourse = Object.freeze({
    completedLessonIds: Object.freeze([firstId]), bookmarkedLessonIds: Object.freeze([secondId]), lastLessonId: firstId,
  });
  const original = Object.freeze({ version: 1, courses: Object.freeze({ [courseId]: originalCourse, [otherCourseId]: originalCourse }) });
  for (const action of ["open", "toggle-completed", "toggle-bookmark"]) {
    const next = updateLearningState(original, courseId, secondId, action);
    assert.notEqual(next, original);
    assert.notEqual(next.courses, original.courses);
    assert.notEqual(next.courses[courseId], originalCourse);
    assert.deepEqual(next.courses[otherCourseId], originalCourse);
  }
  assert.deepEqual(originalCourse, { completedLessonIds: [firstId], bookmarkedLessonIds: [secondId], lastLessonId: firstId });
});

test("invalid course IDs, lesson IDs and actions leave state unchanged", () => {
  const state = createLearningState();
  for (const id of [null, 123, "", "__proto__", "constructor", "course-1", `${firstId}/lesson`, ` ${firstId}`, `${firstId}\n`, `${firstId}\r\n`, "gggggggg-gggg-4ggg-8ggg-gggggggggggg"]) {
    assert.equal(updateLearningState(state, id, firstId, "open"), state);
    assert.equal(updateLearningState(state, courseId, id, "toggle-completed"), state);
  }
  for (const action of [null, "complete", "toString", "__proto__", 1]) {
    assert.equal(updateLearningState(state, courseId, firstId, action), state);
  }
});

test("version 1 state roundtrips through the dedicated storage key", () => {
  const storage = storageWith();
  let state = updateLearningState(createLearningState(), courseId, firstId, "toggle-completed");
  state = updateLearningState(state, courseId, secondId, "toggle-bookmark");
  state = updateLearningState(state, courseId, secondId, "open");
  assert.equal(writeLearningState(storage, state), true);
  assert.deepEqual(JSON.parse(storage.getItem("rinegetan:bible-learning:v1")), {
    version: 1, courses: { [courseId]: { completedLessonIds: [firstId], bookmarkedLessonIds: [secondId], lastLessonId: secondId } },
  });
  assert.equal(storage.getItem(LEARNING_STORAGE_KEY), storage.getItem("rinegetan:bible-learning:v1"));
  const read = readLearningState(storage);
  assert.deepEqual(read, { state, persistent: true });
  read.state.courses[courseId].completedLessonIds.push(secondId);
  assert.deepEqual(state.courses[courseId].completedLessonIds, [firstId]);
});

test("reading filters invalid and duplicate IDs and rebuilds only allowlisted fields", () => {
  const read = readJson({
    version: 1, body: "synthetic material", email: "synthetic@example.test", url: "https://example.test/private",
    courses: {
      [courseId]: {
        completedLessonIds: [firstId, firstId, 2, null, "bad", { id: secondId }, secondId],
        bookmarkedLessonIds: [secondId, secondId, "__proto__", firstId], lastLessonId: withdrawnId,
        title: "Synthetic title", body: "Synthetic body", url: "https://example.test/lesson",
      },
      invalid: { ...emptyCourse },
      [otherCourseId]: { completedLessonIds: [], bookmarkedLessonIds: [], lastLessonId: "https://example.test" },
    },
  });
  assert.deepEqual(read, {
    persistent: true,
    state: { version: 1, courses: {
      [courseId]: { completedLessonIds: [firstId, secondId], bookmarkedLessonIds: [secondId, firstId], lastLessonId: withdrawnId },
      [otherCourseId]: { ...emptyCourse },
    } },
  });
});

test("malformed course entries are ignored without discarding valid courses", () => {
  for (const entry of [null, [], 1, "course", {}, { ...emptyCourse, completedLessonIds: {} }, { ...emptyCourse, bookmarkedLessonIds: "bad" }]) {
    assert.deepEqual(readJson({ version: 1, courses: { [courseId]: entry, [otherCourseId]: emptyCourse } }), {
      state: { version: 1, courses: { [otherCourseId]: emptyCourse } }, persistent: true,
    });
  }
  assert.equal(readJson({ version: 1, courses: { [courseId]: { ...emptyCourse, lastLessonId: 42 } } }).state.courses[courseId].lastLessonId, null);
});

test("prototype keys cannot become trusted courses or metadata on read or write", () => {
  const hostile = JSON.parse(`{"version":1,"__proto__":{"polluted":true},"courses":{"__proto__":{"polluted":true},"constructor":{},"${courseId}":{"completedLessonIds":["${firstId}"],"bookmarkedLessonIds":[],"lastLessonId":null,"__proto__":{"polluted":true}}}}`);
  const storage = storageWith(JSON.stringify(hostile));
  assert.deepEqual(readLearningState(storage), {
    state: { version: 1, courses: { [courseId]: { completedLessonIds: [firstId], bookmarkedLessonIds: [], lastLessonId: null } } }, persistent: true,
  });
  assert.equal(writeLearningState(storage, hostile), true);
  assert.deepEqual(JSON.parse(storage.getItem(LEARNING_STORAGE_KEY)), {
    version: 1, courses: { [courseId]: { completedLessonIds: [firstId], bookmarkedLessonIds: [], lastLessonId: null } },
  });
  assert.equal(Object.prototype.polluted, undefined);
});

test("writes sanitize and deduplicate IDs without persisting material, PII or URLs", () => {
  const storage = storageWith();
  const state = { version: 1, email: "synthetic@example.test", courses: {
    [courseId]: { completedLessonIds: [firstId, firstId, "invalid"], bookmarkedLessonIds: [secondId, secondId, {}], lastLessonId: "https://example.test", body: "Synthetic body" },
    "bad-course": emptyCourse,
  } };
  const before = structuredClone(state);
  assert.equal(writeLearningState(storage, state), true);
  assert.deepEqual(JSON.parse(storage.getItem(LEARNING_STORAGE_KEY)), {
    version: 1, courses: { [courseId]: { completedLessonIds: [firstId], bookmarkedLessonIds: [secondId], lastLessonId: null } },
  });
  assert.deepEqual(state, before);
});

test("corrupt JSON and unsupported top-level schemas recover empty while storage stays available", () => {
  for (const raw of ["{", "", "undefined", "null", "[]", "42", '"text"', "{}", '{"version":2,"courses":{}}', '{"version":"1","courses":{}}', '{"version":1}', '{"version":1,"courses":[]}', '{"version":1,"courses":null}']) {
    assert.deepEqual(readLearningState(storageWith(raw)), { state: { version: 1, courses: {} }, persistent: true });
  }
  assert.deepEqual(readLearningState(storageWith()), { state: { version: 1, courses: {} }, persistent: true });
});

test("unavailable or throwing storage reports nonpersistent reads and failed writes", () => {
  const blocked = { getItem() { throw new Error("synthetic read denied"); } };
  const quota = { setItem() { throw new Error("synthetic quota exceeded"); } };
  for (const storage of [null, blocked]) {
    assert.deepEqual(readLearningState(storage), { state: { version: 1, courses: {} }, persistent: false });
  }
  const state = updateLearningState(createLearningState(), courseId, firstId, "toggle-completed");
  assert.equal(writeLearningState(null, state), false);
  assert.equal(writeLearningState(quota, state), false);
  assert.equal(getCourseLearning(state, courseId, lessons).completedCount, 1);
});

test("course progress intersects visible lessons and excludes withdrawn links and counts", () => {
  const state = { version: 1, courses: { [courseId]: {
    completedLessonIds: [withdrawnId, firstId], bookmarkedLessonIds: [withdrawnId, secondId], lastLessonId: withdrawnId,
  } } };
  assert.deepEqual(getCourseLearning(state, courseId, lessons), {
    completedIds: [firstId], bookmarkedIds: [secondId], lastLessonId: null,
    continueLessonId: secondId, completedCount: 1, total: 2,
  });
  assert.deepEqual(state.courses[courseId].completedLessonIds, [withdrawnId, firstId]);
  const restored = getCourseLearning(state, courseId, [...lessons, { id: withdrawnId }]);
  assert.equal(restored.completedCount, 2);
  assert.equal(restored.continueLessonId, withdrawnId);
  assert.deepEqual(restored.bookmarkedIds, [secondId, withdrawnId]);
});

test("resume prefers the visible last lesson even when already completed", () => {
  const state = { version: 1, courses: { [courseId]: {
    completedLessonIds: [secondId], bookmarkedLessonIds: [], lastLessonId: secondId,
  } } };
  assert.equal(getCourseLearning(state, courseId, lessons).continueLessonId, secondId);
});

test("resume falls back in current lesson order, including all complete, new and empty courses", () => {
  const state = { version: 1, courses: { [courseId]: {
    completedLessonIds: [secondId], bookmarkedLessonIds: [], lastLessonId: withdrawnId,
  } } };
  assert.equal(getCourseLearning(state, courseId, [{ id: secondId }, { id: firstId }]).continueLessonId, firstId);
  const allDone = updateLearningState(state, courseId, firstId, "toggle-completed");
  assert.equal(getCourseLearning(allDone, courseId, [{ id: secondId }, { id: firstId }]).continueLessonId, secondId);
  assert.deepEqual(getCourseLearning(state, otherCourseId, lessons), {
    completedIds: [], bookmarkedIds: [], lastLessonId: null, continueLessonId: firstId, completedCount: 0, total: 2,
  });
  assert.deepEqual(getCourseLearning(state, courseId, []), {
    completedIds: [], bookmarkedIds: [], lastLessonId: null, continueLessonId: null, completedCount: 0, total: 0,
  });
});

test("progress returns fresh arrays and never double-counts duplicate lesson IDs", () => {
  const state = { version: 1, courses: { [courseId]: {
    completedLessonIds: [firstId, firstId], bookmarkedLessonIds: [secondId, secondId], lastLessonId: null,
  } } };
  const result = getCourseLearning(state, courseId, [...lessons, ...lessons]);
  assert.deepEqual(result, {
    completedIds: [firstId], bookmarkedIds: [secondId], lastLessonId: null, continueLessonId: secondId, completedCount: 1, total: 2,
  });
  result.completedIds.push(secondId);
  result.bookmarkedIds.length = 0;
  assert.deepEqual(state.courses[courseId].completedLessonIds, [firstId, firstId]);
  assert.deepEqual(state.courses[courseId].bookmarkedLessonIds, [secondId, secondId]);
});
