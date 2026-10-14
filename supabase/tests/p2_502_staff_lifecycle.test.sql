begin;

select plan(12);

select ok(
  not has_function_privilege('anon', 'public.reactivate_staff(uuid,text)', 'execute')
  and has_function_privilege('authenticated', 'public.reactivate_staff(uuid,text)', 'execute'),
  'reactivate_staff is executable by authenticated only'
);
select ok(
  not has_function_privilege('anon', 'public.delete_staff(uuid,text)', 'execute')
  and has_function_privilege('authenticated', 'public.delete_staff(uuid,text)', 'execute'),
  'delete_staff is executable by authenticated only'
);

insert into auth.users (id, email) values
  ('b5020000-0000-4000-8000-00000000000a', 'admin-p2502@test.com'),
  ('b5020000-0000-4000-8000-00000000000e', 'editor-p2502@test.com'),
  ('b5020000-0000-4000-8000-00000000000f', 'editor2-p2502@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, is_active) values
  ('b5020000-0000-4000-8000-00000000000a', 'Admin P2-502', true),
  ('b5020000-0000-4000-8000-00000000000e', 'Editor Nonaktif', false),
  ('b5020000-0000-4000-8000-00000000000f', 'Editor Aktif', true);

insert into public.staff_roles (user_id, role) values
  ('b5020000-0000-4000-8000-00000000000a', 'admin'),
  ('b5020000-0000-4000-8000-00000000000e', 'editor'),
  ('b5020000-0000-4000-8000-00000000000f', 'editor');

-- An editor cannot manage staff.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b5020000-0000-4000-8000-00000000000f', true);
select throws_ok(
  $$ select public.reactivate_staff('b5020000-0000-4000-8000-00000000000e', 'Kembali bertugas') $$,
  'P0001', 'not_admin', 'editor cannot reactivate staff'
);
select throws_ok(
  $$ select public.delete_staff('b5020000-0000-4000-8000-00000000000e', 'Tidak aktif lagi') $$,
  'P0001', 'not_admin', 'editor cannot delete staff'
);

-- The admin manages editors.
select set_config('request.jwt.claim.sub', 'b5020000-0000-4000-8000-00000000000a', true);
select throws_ok(
  $$ select public.reactivate_staff('b5020000-0000-4000-8000-00000000000f', 'Sudah aktif') $$,
  'P0001', 'target_not_inactive_editor', 'an active editor cannot be reactivated'
);
select lives_ok(
  $$ select public.reactivate_staff('b5020000-0000-4000-8000-00000000000e', 'Kembali bertugas') $$,
  'admin reactivates an inactive editor'
);
select throws_ok(
  $$ select public.delete_staff('b5020000-0000-4000-8000-00000000000a', 'Hapus diri sendiri') $$,
  'P0001', 'cannot_delete_self', 'admin cannot delete self'
);
select throws_ok(
  $$ select public.delete_staff('b5020000-0000-4000-8000-00000000000f', 'abc') $$,
  'P0001', 'validation_error', 'deletion needs a reason of at least 5 characters'
);
select lives_ok(
  $$ select public.delete_staff('b5020000-0000-4000-8000-00000000000f', 'Tidak bertugas lagi') $$,
  'admin deletes an editor'
);

reset role;

select is(
  (select is_active from public.profiles where id = 'b5020000-0000-4000-8000-00000000000e'),
  true,
  'reactivated editor is active again'
);
select is(
  (select count(*)::int from auth.users where id = 'b5020000-0000-4000-8000-00000000000f')
  + (select count(*)::int from public.profiles where id = 'b5020000-0000-4000-8000-00000000000f'),
  0,
  'deleted editor has no auth user or profile left'
);
select is(
  (select string_agg(action, ',' order by action) from public.audit_logs
   where entity_id in ('b5020000-0000-4000-8000-00000000000e', 'b5020000-0000-4000-8000-00000000000f')),
  'staff.deleted,staff.reactivated',
  'reactivation and deletion are audited'
);

select * from finish();
rollback;
