/** Read every staff-visible row with bounded requests and a deterministic unique order.
 * Failed pages discard the collection so incomplete data never looks successful.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {'courses' | 'course_lessons'} entity
 * @returns {Promise<{data: (import('../../types/courses').Course | import('../../types/courses').CourseLesson)[] | null, error: boolean}>}
 */
export async function loadCourseCollection(client, entity) {
  const rows = [];
  const pageSize = 500;
  try {
    for (let start = 0; ; start += pageSize) {
      let query = client.from(entity).select('*');
      query = entity === 'courses' ? query.order('created_at', { ascending: false })
        : query.order('course_id', { ascending: true }).order('position', { ascending: true });
      const { data, error } = await query.order('id', { ascending: true }).range(start, start + pageSize - 1);
      if (error || !data) return { data: null, error: true };
      rows.push(...data);
      if (data.length < pageSize) return { data: rows, error: false };
    }
  } catch { return { data: null, error: true }; }
}
