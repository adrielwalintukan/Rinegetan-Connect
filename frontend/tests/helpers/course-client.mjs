export const id = "00000000-0000-4000-8000-000000000001";
export const course = { title: "Course uji", slug: "course-uji", summary: "Ringkasan" };
export const lesson = { ...course, course_id: id, body: "Paragraf satu.\n\nParagraf dua.", position: 2 };
// Only the Supabase network boundary is replaced; production guard and mutations run unchanged.
export function clientFor(result = {}, auth = {}) {
  const calls = [];
  const chain = {
    insert(payload) { calls.push(["insert", payload]); return this; },
    update(payload) { calls.push(["update", payload]); return this; },
    delete() { calls.push(["delete"]); return this; },
    eq(key, value) { calls.push(["eq", key, value]); return this; },
    select(columns) { calls.push(["select", columns]); return this; },
    async single() { calls.push(["single"]); if (result.throws) throw result.throws; return { data: null, error: null, ...result }; },
  };
  return {
    calls,
    auth: { async getUser() { return { data: { user: auth.user === null ? null : { id } }, error: auth.error || null }; } },
    from(table) {
      if (table === "staff_roles" || table === "profiles") return {
        select() { return this; }, eq() { return this; }, async maybeSingle() {
          return { data: table === "staff_roles" ? { role: auth.role === undefined ? "admin" : auth.role } : { is_active: auth.active === undefined ? true : auth.active }, error: auth.staffError || null };
        },
      };
      calls.push(["from", table]); return chain;
    },
  };
}
