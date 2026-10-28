import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const auditEntry = {
  id: "audit-1", actor_id: null, action: "content.updated", entity_type: "announcements",
  entity_id: "content-1", changes: { status: { from: "draft", to: "published" } },
  occurred_at: "2026-10-18T17:05:00+00:00",
};

// Execute the real TSX with only network/framework boundaries replaced; no build or production access.
function loadTsx(path, boundaries = {}) {
  const filename = resolve(root, path);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const testModule = { exports: {} };
  new Function("require", "module", "exports", output)((id) => {
    if (id in boundaries) return boundaries[id];
    if (id.startsWith("@/lib/staff/audit")) return require(resolve(root, "src/lib/staff/audit.mjs"));
    if (id === "@/lib/courses/queries") return require(resolve(root, "src/lib/courses/queries.mjs"));
    if (id === "@/lib/courses/import-actions") return require(resolve(root, "src/lib/courses/import-actions.mjs"));
    if (id === "@/lib/forms/study-interest-admin") return require(resolve(root, "src/lib/forms/study-interest-admin.mjs"));
    return require(id);
  }, testModule, testModule.exports);
  return testModule.exports;
}

function database({ error = null, throws = false } = {}) {
  const queries = [];
  return {
    queries,
    from(table) {
      const query = { table };
      queries.push(query);
      const builder = {
        select(columns) { query.columns = columns; return builder; },
        order(column, options) { query.order = [column, options]; return builder; },
        range() { return builder; },
        limit(limit) {
          query.limit = limit;
          if (throws) return Promise.reject(new Error("internal database connection details"));
          return Promise.resolve(error ? { data: null, error } : { data: [auditEntry], error: null });
        },
        then(onValue) { return Promise.resolve({ data: [], error: null }).then(onValue); },
      };
      return builder;
    },
  };
}

async function pageResult(role = "admin", db = database(), tab = "audit") {
  const { default: StaffHomePage } = loadTsx("src/app/staff/(protected)/page.tsx", {
    "@/lib/supabase/server": { createServerSupabaseClient: async () => db },
    "@/lib/staff/server": { requireActiveStaff: async () => ({ role, user: { id: "staff-1", email: "staff@example.test" } }) },
    "@/components/staff/StaffDashboard": { StaffDashboard: () => null },
    "@/lib/public/queries": { getSiteSectionMedia: async () => ({}) },
  });
  return StaffHomePage({ searchParams: Promise.resolve({ tab }) });
}

function loadViewer() {
  return loadTsx("src/components/staff/AuditLogViewer.tsx", {
    "@/lib/schedule-wita": require(resolve(root, "src/lib/schedule-wita.mjs")),
  });
}

function viewer(props) {
  return renderToStaticMarkup(React.createElement(loadViewer().AuditLogViewer, props));
}

function dashboard(role, initialTab) {
  const nullComponent = () => null;
  const { StaffDashboard } = loadTsx("src/components/staff/StaffDashboard.tsx", {
    "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "./CourseManager": { CourseManager: nullComponent },
    "./ContentFilterBar": { ContentFilterBar: nullComponent },
    "./ContentTable": { ContentTable: nullComponent },
    "./ContentMutationDialog": { ContentMutationDialog: nullComponent },
    "./DeleteConfirmationDialog": { DeleteConfirmationDialog: nullComponent },
    "./AuditLogViewer": loadViewer(),
    "./MediaManager": { MediaManager: nullComponent },
    "./SectionMediaManager": { SectionMediaManager: nullComponent },
    "./StaffManager": { StaffManager: nullComponent },
    "./StudyInterestManager": { StudyInterestManager: nullComponent },
    "@/components/identity/AdventistSymbol": { AdventistSymbol: nullComponent },
    "@/lib/api/errors": require(resolve(root, "src/lib/api/errors.mjs")),
  });
  return renderToStaticMarkup(React.createElement(StaffDashboard, {
    userEmail: "staff@example.test", currentUserId: "staff-1", role, initialTab,
    initialAnnouncements: [], initialEvents: [], initialSchedules: [], initialDepartments: [], initialAuditLogs: [auditEntry],
  }));
}

test("audit page queries the actual occurred_at column newest first with a bounded result", async () => {
  const db = database();
  const result = await pageResult("admin", db);
  assert.deepEqual(db.queries.find((query) => query.table === "audit_logs"), {
    table: "audit_logs", columns: "*", order: ["occurred_at", { ascending: false }], limit: 50,
  });
  assert.deepEqual(result.props.initialAuditLogs, [auditEntry]);
});

test("editor audit URL never queries audit data and falls back to content", async () => {
  const db = database();
  const result = await pageResult("editor", db);
  assert.equal(db.queries.some((query) => query.table === "audit_logs"), false);
  assert.deepEqual(result.props.initialAuditLogs, []);
  assert.equal(result.props.initialTab, "announcements");
});

test("audit query failure reaches the UI as a friendly error, separate from an empty list", async () => {
  const result = await pageResult("admin", database({ error: { code: "42703", message: "private schema details" } }));
  assert.deepEqual(result.props.initialAuditLogs, []);
  assert.match(result.props.auditLogsError || "", /gagal|tidak dapat/i);
  const markup = viewer({ logs: result.props.initialAuditLogs, error: result.props.auditLogsError });
  assert.match(markup, /role="alert"/);
  assert.doesNotMatch(markup, /Belum ada riwayat|private schema|42703/);
});

test("audit transport rejection also becomes a friendly audit error", async () => {
  const result = await pageResult("admin", database({ throws: true }));
  assert.match(result.props.auditLogsError || "", /gagal|tidak dapat/i);
  assert.doesNotMatch(result.props.auditLogsError, /internal|database/);
});

test("audit renders the occurred_at instant in WITA, including the next local day", () => {
  const markup = viewer({ logs: [auditEntry] });
  assert.match(markup, /19 Oktober 2026/);
  assert.match(markup, /01[.:]05 WITA/);
  assert.doesNotMatch(markup, /17:05 WITA/);
});

test("audit timezone conversion honors explicit offsets and invalid timestamps remain readable", () => {
  const markup = viewer({ logs: [
    { ...auditEntry, occurred_at: "2026-10-19T01:05:00+08:00" },
    { ...auditEntry, id: "audit-invalid", occurred_at: "invalid" },
  ] });
  assert.match(markup, /19 Oktober 2026/);
  assert.match(markup, /01[.:]05 WITA/);
  assert.match(markup, /Waktu tidak tersedia/);
  assert.doesNotMatch(markup, /Invalid Date|NaN/);
});

test("editor dashboard has no audit tab or audit content even with an initial audit selection", () => {
  const markup = dashboard("editor", "audit");
  assert.doesNotMatch(markup, /Log Audit|Linimasa Mutasi|content.updated/);
  assert.match(markup, /Tambah Pengumuman/);
});

test("admin dashboard retains access to the audit tab and real occurred_at entries", () => {
  const markup = dashboard("admin", "audit");
  assert.match(markup, /Log Audit/);
  assert.match(markup, /19 Oktober 2026/);
});


test("editor ignores audit selections from both browser URL and local storage", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { search: "?tab=audit" } } });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => "audit" } });
    const markup = dashboard("editor", undefined);
    assert.doesNotMatch(markup, /Log Audit|Linimasa Mutasi|content.updated/);
    assert.match(markup, /Tambah Pengumuman/);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete globalThis.window;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete globalThis.localStorage;
  }
});
