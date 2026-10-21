begin;
select no_plan();
insert into auth.users(id,email) values ('74000000-0000-4000-8000-000000000001','p3-whitespace@example.invalid');
insert into public.profiles(id,display_name,is_active) values ('74000000-0000-4000-8000-000000000001','Synthetic whitespace Editor',true);
insert into public.staff_roles(user_id,role) values ('74000000-0000-4000-8000-000000000001','editor');
set local role authenticated;
select set_config('request.jwt.claim.sub','74000000-0000-4000-8000-000000000001',true);
insert into public.courses(id,title,slug) values ('74000000-0000-4000-8000-000000000002','Whitespace parent','whitespace-parent');

-- ECMAScript String.trim whitespace, explicitly enumerated without locale classes.
-- U+0085 and U+200B are deliberately NOT whitespace in that contract.
select throws_ok(format('insert into public.courses(title,slug,status) values (%L,%L,''published'')',value,'course-white-'||n), '23514', null, 'Editor course rejects whitespace-only title U+'||to_hex(code))
from (select code,chr(code) as value,row_number() over () as n from unnest(array[9,10,11,12,13,32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288,65279]) code) valueset;
select throws_ok(format('insert into public.course_lessons(course_id,title,slug,body,position,status) values (''74000000-0000-4000-8000-000000000002'',%L,%L,''Body'',%s,''published'')',chr(code),'lesson-white-'||code,code), '23514', null, 'Editor lesson rejects whitespace-only title U+'||to_hex(code))
from unnest(array[9,10,11,12,13,32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288,65279]) code;
select throws_ok(format('insert into public.courses(title,slug,summary) values (%L,%L,%L)',case when field='title' then value else 'Valid' end,'padded-'||n,case when field='summary' then value else '' end), '23514', null, 'Editor course rejects padded '||field||' '||n)
from (select field,value,row_number() over () as n from unnest(array['title','summary']) field cross join unnest(array[E'\tText',E'Text\n',chr(160)||'Text','Text'||chr(65279)]) value) valueset;
select throws_ok(format('insert into public.course_lessons(course_id,title,slug,summary,position) values (''74000000-0000-4000-8000-000000000002'',%L,%L,%L,%s)',case when field='title' then value else 'Valid' end,'padded-'||n,case when field='summary' then value else '' end,100+n), '23514', null, 'Editor lesson rejects padded '||field||' '||n)
from (select field,value,row_number() over () as n from unnest(array['title','summary']) field cross join unnest(array[E'\tText',E'Text\n',chr(160)||'Text','Text'||chr(65279)]) value) valueset;
select lives_ok($$ insert into public.courses(title,slug,summary) values (U&'A\0009B\00A0C','interior-whitespace',U&'\0085edge\200B') $$,'Editor course allows interior whitespace and non-trim Unicode');
select lives_ok($$ insert into public.course_lessons(course_id,title,slug,summary,position) values ('74000000-0000-4000-8000-000000000002',U&'\0085edge\200B','interior-whitespace',U&'A\000AB\00A0C',1) $$,'Editor lesson allows interior whitespace and non-trim Unicode');
select lives_ok($$ insert into public.course_lessons(course_id,title,slug,body,position,status) values ('74000000-0000-4000-8000-000000000002',repeat('a',199)||'📖','unicode-limit',repeat('a',49999)||'📖',2,'published') $$,'Editor lesson accepts code point title/body limits');
select throws_ok(format('insert into public.course_lessons(course_id,title,slug,body,position,status) values (''74000000-0000-4000-8000-000000000002'',''Published body'',%L,%L,%s,''published'')','body-white-'||code,chr(code),100000+code), '23514', null, 'Editor Published lesson rejects whitespace-only body U+'||to_hex(code))
from unnest(array[9,10,11,12,13,32,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288,65279]) code;
select throws_ok($$ update public.course_lessons set body=chr(65279) where course_id='74000000-0000-4000-8000-000000000002' and slug='unicode-limit' $$,'23514',null,'Editor Published revision rejects BOM-only body');
select lives_ok($$ insert into public.course_lessons(course_id,title,slug,body,position,status) values ('74000000-0000-4000-8000-000000000002','Non-trim body','nel-body',chr(133),3,'published') $$,'Editor Published body permits non-trim U+0085');
select lives_ok($$ insert into public.course_lessons(course_id,title,slug,body,position,status) values ('74000000-0000-4000-8000-000000000002','Non-trim body','zwsp-body',chr(8203),4,'published') $$,'Editor Published body permits non-trim U+200B');
select * from finish();
rollback;
