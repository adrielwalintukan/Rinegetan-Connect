begin;
select no_plan();
select has_function('public', 'sabbath_cache_read', array['text'], 'cache read RPC exists');
select has_function('public', 'sabbath_cache_write', array['text','text','timestamp with time zone','text','jsonb'], 'cache write RPC exists');
select ok(not has_function_privilege('anon', 'public.sabbath_cache_read(text)', 'execute'), 'anonymous cannot execute read');
select ok(not has_function_privilege('anon', 'public.sabbath_cache_write(text,text,timestamp with time zone,text,jsonb)', 'execute'), 'anonymous cannot execute write');
select ok(not has_function_privilege('service_role', 'public.sabbath_cache_read(text)', 'execute'), 'service role cannot execute read');
select ok(not has_function_privilege('service_role', 'public.sabbath_cache_write(text,text,timestamp with time zone,text,jsonb)', 'execute'), 'service role cannot execute write');
select ok(not has_function_privilege('authenticated', 'private.sabbath_cache_rights_approved()', 'execute'), 'staff cannot execute the rights gate');

insert into auth.users (id, email) values
 ('9a000000-0000-4000-8000-00000000000a', 'p4001-admin@example.invalid'),
 ('9a000000-0000-4000-8000-00000000000e', 'p4001-editor@example.invalid'),
 ('9a000000-0000-4000-8000-00000000000f', 'p4001-inactive@example.invalid');
insert into public.profiles (id, display_name, is_active) values
 ('9a000000-0000-4000-8000-00000000000a', 'Synthetic Admin', true),
 ('9a000000-0000-4000-8000-00000000000e', 'Synthetic Editor', true),
 ('9a000000-0000-4000-8000-00000000000f', 'Synthetic Inactive', false);
insert into public.staff_roles (user_id, role) values
 ('9a000000-0000-4000-8000-00000000000a', 'admin'),
 ('9a000000-0000-4000-8000-00000000000e', 'editor'),
 ('9a000000-0000-4000-8000-00000000000f', 'admin');

set local role authenticated;
select set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-00000000000a', true);
select throws_ok($$select * from public.sabbath_cache_read('id-2026-01')$$, '42501', null, 'closed rights gate rejects admin read');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v1','2026-01-01',null,'{"synthetic":true}')$$, '42501', null, 'closed rights gate rejects admin write');
reset role;

-- Only this rolled-back test transaction opens the gate to exercise the database boundary.
create or replace function private.sabbath_cache_rights_approved() returns boolean
language sql stable set search_path = '' as $$ select true $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-00000000000e', true);
select throws_ok($$select * from public.sabbath_cache_read('id-2026-01')$$, '42501', null, 'editor denied even when rights are approved');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v1','2026-01-01',null,'{}')$$, '42501', null, 'editor cannot write');
select set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-00000000000f', true);
select throws_ok($$select * from public.sabbath_cache_read('id-2026-01')$$, '42501', null, 'inactive admin denied');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v1','2026-01-01',null,'{}')$$, '42501', null, 'inactive admin cannot write');
select set_config('request.jwt.claim.sub', '9a000000-0000-4000-8000-00000000000a', true);
select is(public.sabbath_cache_write('id-2026-01','v1','2026-01-02','e1',
  '{"id":"2026-01","index":"id-2026-01","language":"id","title":"Contoh","cover":"https://sabbath-school.adventech.io/synthetic-cover.jpg","credits":[{"name":"Sumber","value":"Contoh"}],"lessons":[{"id":"01","index":"id-2026-01-01","title":"Satu","position":1}]}'), true, 'active admin writes a synthetic snapshot');
select is((select source_version from public.sabbath_cache_read('id-2026-01')), 'v1', 'active admin reads stored version');
reset role;
select ok(private.sabbath_cache_payload_valid('id-2026-01', (select payload from private.sabbath_content_cache where source_id = 'id-2026-01') || '{"cover":"https://sabbath-school.adventech.io:443/synthetic-cover.jpg"}'), 'explicit default HTTPS port has the approved origin');
set local role authenticated;
select is(public.sabbath_cache_write('id-2026-01','older','2026-01-01',null,
  '{"id":"2026-01","index":"id-2026-01","language":"id","title":"Lama","cover":"https://sabbath-school.adventech.io/synthetic-cover.jpg","credits":[{"name":"Sumber","value":"Contoh"}],"lessons":[{"id":"01","index":"id-2026-01-01","title":"Satu","position":1}]}'), false, 'older snapshot cannot overwrite newer data');
select is((select source_version from public.sabbath_cache_read('id-2026-01')), 'v1', 'last valid snapshot remains intact');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','','2026-01-03',null,'{}')$$, '23514', null, 'invalid replacement is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,'{}')$$, '23514', null, 'incomplete metadata cannot replace valid data');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,'[]')$$, '23514', null, 'non-object replacement is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"language":"en"}')$$, '23514', null, 'wrong language is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"index":"another"}')$$, '23514', null, 'wrong source is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"id":"2026-02"}')$$, '23514', null, 'mismatched quarter ID cannot replace valid data');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"credits":[]}')$$, '23514', null, 'missing attribution is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"cover":"https://user@example.invalid/c"}')$$, '23514', null, 'asset URL containing credentials is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"cover":"https://other-host.example/c"}')$$, '23514', null, 'unapproved cover origin cannot replace valid data');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"cover":"https://localhost/c"}')$$, '23514', null, 'localhost cover is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"cover":"https://sabbath-school.adventech.io.evil.example/c"}')$$, '23514', null, 'cover hostname suffix cannot bypass origin check');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"cover":"https://sabbath-school.adventech.io:444/c"}')$$, '23514', null, 'non-default cover port is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"cover":"https://user@sabbath-school.adventech.io/c"}')$$, '23514', null, 'credentials on approved cover host are rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"cover":"https://sabbath-school.adventech.io:99999/c"}')$$, '23514', null, 'asset URL with invalid port is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"cover":"https://sabbath-school.adventech.io:invalid/c"}')$$, '23514', null, 'asset URL with non-numeric port is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || jsonb_build_object('title', chr(160)))$$, '23514', null, 'Unicode whitespace-only title is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01',chr(160),'2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')))$$, '23514', null, 'Unicode whitespace-only version is rejected');
select throws_ok($$select public.sabbath_cache_write('id-2026-01','v2','2026-01-03',null,(select payload from public.sabbath_cache_read('id-2026-01')) || '{"lessons":[{"id":"01","index":"a","title":"A","position":1},{"id":"01","index":"b","title":"B","position":2}]}')$$, '23514', null, 'duplicate lesson IDs are rejected');
select is((select source_version from public.sabbath_cache_read('id-2026-01')), 'v1', 'invalid replacement does not overwrite cache');
reset role;
select * from finish();
rollback;
