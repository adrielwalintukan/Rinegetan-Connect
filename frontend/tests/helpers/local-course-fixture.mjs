import { spawnSync, spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// Support repository-root and frontend commands; settings() validates project identity before use.
const frontend = resolve(process.cwd(), existsSync(resolve(process.cwd(), 'supabase/config.toml')) ? 'frontend' : '.');
const root = resolve(frontend, '..');
const container = 'supabase_db_Rinegetan-Connect';
// Podman locally on Windows; CI sets CONTAINER_RUNTIME=docker on Linux runners.
const runtime = process.env.CONTAINER_RUNTIME || 'podman';
let localSettings;
export function loopback(value) {
  const url = new URL(value);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !['http:', 'postgresql:'].includes(url.protocol)) throw new Error('E2E requires loopback targets.');
  return url;
}
function run(command, args, input) {
  const result = spawnSync(command, args, { cwd: root, encoding:'utf8', input, windowsHide:true, maxBuffer:8*1024*1024 });
  if (result.status !== 0) throw new Error('Local fixture command failed (details suppressed).');
  return result.stdout;
}
export function settings() {
  if (localSettings) return localSettings;
  if (!/^project_id = "Rinegetan-Connect"$/m.test(readFileSync(resolve(root,'supabase/config.toml'),'utf8'))) throw new Error('Unexpected local project.');
  const status = JSON.parse(run(process.execPath, [resolve(frontend,'node_modules/supabase/dist/supabase.js'),'--workdir',root,'status','-o','json']));
  loopback(status.API_URL); loopback(status.DB_URL);
  if (new URL(status.API_URL).port !== '54321' || new URL(status.DB_URL).port !== '54322' || !status.JWT_SECRET || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) throw new Error('Unexpected local test settings.');
  const state = run(runtime,['inspect','--format','{{.Name}}|{{.State.Status}}',container]).trim();
  if (state.replace(/^\//,'') !== `${container}|running`) throw new Error('Local project database is not running.');
  localSettings = Object.freeze(status);
  return localSettings;
}
function sql(statement) {
  return run(runtime,['exec','-i',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],statement).trim();
}
export async function fixture(origin) {
  loopback(origin);
  const config = settings();
  const health = await fetch(`${config.API_URL}/auth/v1/health`, {headers:{apikey:config.ANON_KEY}});
  if (!health.ok) throw new Error('Local Auth unavailable.');
  const admin = randomUUID(), editor = randomUUID(), course = randomUUID(), suffix = randomUUID().slice(0,8);
  sql(`begin;
    insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,reauthentication_token,raw_app_meta_data,raw_user_meta_data) values
      ('${admin}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p3-admin-${suffix}@example.invalid','',now(),now(),now(),'','','','','','','{"provider":"email","providers":["email"]}','{}'),
      ('${editor}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p3-editor-${suffix}@example.invalid','',now(),now(),now(),'','','','','','','{"provider":"email","providers":["email"]}','{}');
    insert into public.profiles(id,display_name,is_active) values ('${admin}','Synthetic browser Admin',true),('${editor}','Synthetic browser Editor',true);
    insert into public.staff_roles(user_id,role) values ('${admin}','admin'),('${editor}','editor');
    insert into public.courses(id,title,slug,summary) values ('${course}','Course browser ${suffix}','browser-${suffix}','Ringkasan sintetis untuk pemeriksaan browser.'); commit;`);
  return {
    suffix, course, admin, editor, api:config.API_URL,
    execute: statement => sql(statement),
    async login(context, role) {
      const id = role === 'admin' ? admin : editor;
      const now = Math.floor(Date.now()/1000);
      const user = { id, aud:'authenticated', role:'authenticated', email:`p3-${role}-${suffix}@example.invalid`, app_metadata:{provider:'email',providers:['email']}, user_metadata:{}, created_at:new Date().toISOString() };
      const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      // Historical iat avoids local PostgREST worker clock jitter; expiry remains real and bounded.
      const unsigned = `${encoded({alg:'HS256',typ:'JWT'})}.${encoded({sub:id,aud:'authenticated',role:'authenticated',email:user.email,iss:`${config.API_URL}/auth/v1`,iat:1,exp:now+3600,app_metadata:user.app_metadata,user_metadata:{},aal:'aal1'})}`;
      const access = `${unsigned}.${createHmac('sha256',config.JWT_SECRET).update(unsigned).digest('base64url')}`;
      const session = { access_token:access,refresh_token:'synthetic-local-only',expires_in:3600,expires_at:now+3600,token_type:'bearer',user };
      await context.addCookies([{name:'sb-127-auth-token',value:`base64-${encoded(session)}`,url:origin,httpOnly:false,sameSite:'Lax'}]);
    },
    publicRows: async (courseId = course) => {
      const response = await fetch(`${config.API_URL}/rest/v1/course_lessons?course_id=eq.${courseId}&select=id`,{headers:{apikey:config.ANON_KEY}});
      if (!response.ok) throw new Error('Local public query failed.');
      return response.json();
    },
    cleanup() {
      sql(`begin; create temp table p3_browser_entities on commit drop as select id from public.courses where id='${course}' or created_by in ('${admin}','${editor}') union select id from public.course_lessons where course_id='${course}' or created_by in ('${admin}','${editor}'); delete from public.course_lessons where course_id='${course}' or created_by in ('${admin}','${editor}'); delete from public.courses where id='${course}' or created_by in ('${admin}','${editor}'); delete from public.audit_logs where actor_id in ('${admin}','${editor}') or entity_id='${course}' or entity_id in (select id from p3_browser_entities) or changes->>'course_id'='${course}'; delete from auth.users where id in ('${admin}','${editor}'); commit;`);
    }
  };
}
export function startLocalApp(mode = 'start') {
  const config = settings();
  // Local CLI service key (loopback only, verified above) and Cloudflare's public always-pass Turnstile test keys.
  const env = {...process.env, NEXT_PUBLIC_SUPABASE_URL:config.API_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:config.ANON_KEY, SUPABASE_URL:config.API_URL, SUPABASE_SECRET_KEY:config.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:'1x00000000000000000000AA', TURNSTILE_SECRET_KEY:'1x0000000000000000000000000000000AA', NEXT_TELEMETRY_DISABLED:'1'};
  if (mode === 'quality') run(process.execPath,[resolve(frontend,'node_modules/supabase/dist/supabase.js'),'--workdir',root,'stop']);
  const child = mode === 'quality' ? spawn('npm.cmd',['run','test:all'],{cwd:frontend,env,stdio:'inherit',windowsHide:true,shell:true}) : spawn(process.execPath,[resolve(frontend,'node_modules/next/dist/bin/next'),mode,...(mode==='build'?[]:['--hostname','127.0.0.1','--port','3412'])],{cwd:frontend,env,stdio:'inherit',windowsHide:true});
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
  child.on('exit',code=>process.exit(code??1));
}
