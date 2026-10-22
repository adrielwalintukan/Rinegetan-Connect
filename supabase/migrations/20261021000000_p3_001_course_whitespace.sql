-- LOCAL ONLY P3-001 follow-up. Keep the already-applied 19Oct migration intact.
-- Match ECMAScript String.trim's explicit whitespace set, independent of DB locale.
-- U+0085 (NEL) and U+200B (zero-width space) are not removed by String.trim.
-- Existing length/nonempty constraints remain authoritative; reject padded API input.
alter table public.courses
  add constraint courses_title_ecmascript_trim_check check (
    title = btrim(title, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
  ),
  add constraint courses_summary_ecmascript_trim_check check (
    summary = btrim(summary, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
  );
alter table public.course_lessons
  add constraint course_lessons_title_ecmascript_trim_check check (
    title = btrim(title, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
  ),
  add constraint course_lessons_summary_ecmascript_trim_check check (
    summary = btrim(summary, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
  );

-- Published lesson body follows the same nonblank String.trim contract.
-- Replace the locale class so BOM is blank and U+0085 remains non-trim text.
alter table public.course_lessons
  drop constraint course_lessons_published_body_check,
  add constraint course_lessons_published_body_check check (
    status <> 'published' or char_length(btrim(body, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')) > 0
  );
