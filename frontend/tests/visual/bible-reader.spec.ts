import { randomUUID } from 'node:crypto';
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { fixture, loopback } from '../helpers/local-course-fixture.mjs';

type Local = Awaited<ReturnType<typeof fixture>>;
const key='rinegetan:bible-learning:v1';
const test=base.extend<{local:Local}>({local:async({baseURL,browser},provide)=>{
  const local=await fixture(baseURL!);
  try {
    // SQL fixture changes bypass invalidation; use the actual CMS before any public request.
    const staff=await browser.newContext({baseURL});
    try {
      await local.login(staff,'admin');
      const response=await staff.request.post('/api/staff/courses',{data:{entity:'courses',action:'status',id:local.course,status:'published'}});
      expect(response.status()).toBe(200);
    } finally { await staff.close(); }
    await provide(local);
  } finally { local.cleanup(); }
}});
async function blockExternal(context:BrowserContext) {
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    return ['127.0.0.1','localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
}
test.beforeEach(async({context})=>{await blockExternal(context);});
function seed(local:Local, long=false) {
  const ids=[randomUUID(),randomUUID(),randomUUID()];
  const slug=`browser-${local.suffix}`;
  const title=long ? 'Pelajaran '+ 'Panjang'.repeat(26) : 'Lesson tujuh';
  local.execute(`begin; select set_config('request.jwt.claim.sub','${local.editor}',true);
    update public.courses set status='published',summary='Ringkasan pembaca sintetis.' where id='${local.course}';
    insert into public.course_lessons(id,course_id,title,slug,summary,body,position,status) values
    ('${ids[0]}','${local.course}','Lesson dua','lesson-dua','Ringkasan dua','Paragraf pertama.\nBaris kedua.\n\n<script>window.readerInjected=true</script>\n**Markdown biasa**',2,'published'),
    ('${ids[1]}','${local.course}','${title}','lesson-tujuh','Ringkasan tujuh','${long?'https://example.invalid/'+ 'long'.repeat(100):'Isi tujuh.'}',7,'published'),
    ('${ids[2]}','${local.course}','Lesson dua puluh','lesson-dua-puluh','Ringkasan dua puluh','Isi dua puluh.',20,'published'); commit;`);
  return {ids,slug,title,url:`/pelajari-alkitab/${slug}`};
}
async function openLesson(page:Page,url:string) {
  await page.goto(url);loopback(page.url());
  await expect(page.getByRole('button',{name:'Tandai selesai',exact:true})).toBeEnabled();
}
async function mutate(page:Page,local:Local,entity:'courses'|'course_lessons',action:'status'|'delete'|'save',id:string,extra:Record<string,unknown>={}) {
  await local.login(page.context(),'admin');
  const response=await page.request.post('/api/staff/courses',{data:{entity,action,id,...extra}});
  expect(response.status()).toBe(200);
  const result=await response.json(); expect(result.success).toBe(true);return result;
}
test('anonymous online flow persists only IDs, manual completion/bookmark, sparse navigation and local resume',async({page,local,browser,baseURL})=>{
  const data=seed(local);let progressWrites=0;
  page.on('request',request=>{if(request.method()!=='GET' && request.method()!=='HEAD')progressWrites++;});
  await page.goto('/pelajari-alkitab');await page.getByRole('link',{name:`Course browser ${local.suffix}`,exact:true}).click();
  await expect(page.getByText('0 dari 3 pelajaran selesai')).toBeVisible();
  await page.getByRole('link',{name:'2. Lesson dua',exact:true}).click();
  await expect(page.getByRole('button',{name:'Tandai selesai',exact:true})).toHaveAttribute('aria-pressed','false');
  await expect(page.getByTestId('lesson-body')).toContainText('<script>window.readerInjected=true</script>');
  expect(await page.evaluate(()=>Reflect.get(window,'readerInjected'))).toBeUndefined();
  await page.getByRole('button',{name:'Tandai selesai',exact:true}).click();await page.getByRole('button',{name:'Simpan bookmark',exact:true}).click();
  await page.reload();await expect(page.getByRole('button',{name:'Batalkan selesai',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Batalkan bookmark',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('link',{name:'Kembali ke course',exact:true}).click();await expect(page.getByText('1 dari 3 pelajaran selesai')).toBeVisible();
  const completedRow=page.getByRole('listitem').filter({has:page.getByRole('link',{name:'2. Lesson dua',exact:true})});await expect(completedRow).toContainText('Selesai');await expect(completedRow).toContainText('Bookmark tersimpan');
  await page.getByRole('link',{name:'Lanjut belajar',exact:true}).click();
  await page.getByRole('button',{name:'Batalkan selesai',exact:true}).click();await page.getByRole('button',{name:'Batalkan bookmark',exact:true}).click();
  await page.reload();await expect(page.getByRole('button',{name:'Tandai selesai',exact:true})).toHaveAttribute('aria-pressed','false');await expect(page.getByRole('button',{name:'Simpan bookmark',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.getByRole('link',{name:'Berikutnya: Lesson tujuh',exact:true}).click();await expect(page.getByRole('link',{name:'Sebelumnya: Lesson dua',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Berikutnya: Lesson dua puluh',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Kembali ke course',exact:true}).click();await expect(page.getByRole('link',{name:'Lanjut belajar',exact:true})).toHaveAttribute('href',data.url+'/lesson-tujuh');
  const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);
  expect(stored).toEqual({version:1,courses:{[local.course]:{completedLessonIds:[],bookmarkedLessonIds:[],lastLessonId:data.ids[1]}}});
  await page.evaluate(({k,id,completed})=>localStorage.setItem(k,JSON.stringify({version:1,courses:{[id]:{completedLessonIds:[completed],bookmarkedLessonIds:[],lastLessonId:'99999999-9999-4999-8999-999999999999'}}})),{k:key,id:local.course,completed:data.ids[0]});
  await page.reload();await expect(page.getByRole('link',{name:'Mulai belajar',exact:true})).toHaveAttribute('href',data.url+'/lesson-tujuh');await expect(page.getByText('1 dari 3 pelajaran selesai')).toBeVisible();
  expect(progressWrites).toBe(0);
  const second=await browser.newContext({baseURL});await blockExternal(second);
  try{const other=await second.newPage();await other.goto(data.url);await expect(other.getByText('0 dari 3 pelajaran selesai')).toBeVisible();expect(await other.evaluate(k=>localStorage.getItem(k),key)).toBeNull();}finally{await second.close();}
});
for(const failure of ['getter','quota'] as const)test(`storage ${failure} stays readable and preserves ephemeral completion then bookmark`,async({page,context,local})=>{
  const data=seed(local);
  await context.addInitScript(({key,failure,courseId,otherLessonId})=>{
    if(failure==='getter')Object.defineProperty(window,'localStorage',{get(){throw new Error('synthetic storage unavailable');}});
    else {localStorage.setItem(key,JSON.stringify({version:1,courses:{[courseId]:{completedLessonIds:[otherLessonId],bookmarkedLessonIds:[],lastLessonId:otherLessonId}}}));const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('synthetic quota','QuotaExceededError');return original.call(this,k,v);};}
  },{key,failure,courseId:local.course,otherLessonId:data.ids[1]});
  await openLesson(page,data.url+'/lesson-dua');
  await expect(page.getByRole('status')).toContainText('tidak tersimpan secara persisten');
  await page.getByRole('button',{name:'Tandai selesai',exact:true}).click();
  await page.getByRole('button',{name:'Simpan bookmark',exact:true}).click();
  await expect(page.getByRole('button',{name:'Batalkan selesai',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Batalkan bookmark',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('lesson-body')).toBeVisible();
  if(failure==='quota')expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key)).toEqual({version:1,courses:{[local.course]:{completedLessonIds:[data.ids[1]],bookmarkedLessonIds:[],lastLessonId:data.ids[1]}}});
});
test('fresh browser requests and metadata obey real CMS revision, withdrawal, republish and deletion even with staff session',async({page,local})=>{
  const data=seed(local);const lessonUrl=data.url+'/lesson-dua';
  await page.goto('/pelajari-alkitab');await page.goto(data.url);await openLesson(page,lessonUrl);
  await mutate(page,local,'course_lessons','save',data.ids[0],{data:{title:'Revisi Published reader',slug:'lesson-dua',summary:'Ringkasan revisi publik',body:'Isi revisi Published terbaru.',position:2}});
  await page.reload();await expect(page.getByRole('heading',{level:1})).toHaveText('Revisi Published reader');await expect(page.getByTestId('lesson-body')).toHaveText('Isi revisi Published terbaru.');await expect(page).toHaveTitle(/Revisi Published reader/);await expect(page.locator('meta[name="description"]')).toHaveAttribute('content','Ringkasan revisi publik');
  for(const status of ['draft','archived']){
    await mutate(page,local,'course_lessons','status',data.ids[0],{status});
    await page.goto(lessonUrl);await expect(page.getByRole('heading',{level:1})).toHaveText('Materi tidak ditemukan');await expect(page).not.toHaveTitle(/Revisi Published reader/);
    await page.goto(data.url);await expect(page.getByRole('link',{name:'2. Revisi Published reader',exact:true})).toHaveCount(0);
    await mutate(page,local,'course_lessons','status',data.ids[0],{status:'published'});await openLesson(page,lessonUrl);
  }
  await mutate(page,local,'courses','save',local.course,{data:{title:'Judul course direvisi',slug:data.slug,summary:'Ringkasan course direvisi'}});
  await page.goto(data.url);await expect(page.getByRole('heading',{level:1})).toHaveText('Judul course direvisi');await expect(page).toHaveTitle(/Judul course direvisi/);
  await page.goto('/pelajari-alkitab');await expect(page.getByRole('link',{name:'Judul course direvisi',exact:true})).toBeVisible();
  for(const status of ['draft','archived']){
    await mutate(page,local,'courses','status',local.course,{status});await page.goto('/pelajari-alkitab');await expect(page.getByRole('link',{name:'Judul course direvisi',exact:true})).toHaveCount(0);
    await page.goto(data.url);await expect(page.getByRole('heading',{level:1})).toHaveText('Materi tidak ditemukan');await page.goto(lessonUrl);await expect(page.getByRole('heading',{level:1})).toHaveText('Materi tidak ditemukan');
    await mutate(page,local,'courses','status',local.course,{status:'published'});await openLesson(page,lessonUrl);
  }
  const other=randomUUID();local.execute(`begin; select set_config('request.jwt.claim.sub','${local.editor}',true);insert into public.courses(id,title,slug,status) values('${other}','Other public parent','other-${local.suffix}','published');commit;`);
  await page.goto(`/pelajari-alkitab/other-${local.suffix}/lesson-dua`);await expect(page.getByRole('heading',{level:1})).toHaveText('Materi tidak ditemukan');
  for(const id of data.ids)await mutate(page,local,'course_lessons','delete',id);
  await page.goto(lessonUrl);await expect(page.getByRole('heading',{level:1})).toHaveText('Materi tidak ditemukan');await page.goto(data.url);await expect(page.getByText('Belum ada pelajaran yang tersedia untuk course ini.')).toBeVisible();
  await mutate(page,local,'courses','delete',local.course);await page.goto(data.url);await expect(page.getByRole('heading',{level:1})).toHaveText('Materi tidak ditemukan');await page.goto('/pelajari-alkitab');await expect(page.getByRole('link',{name:'Judul course direvisi',exact:true})).toHaveCount(0);
});
test('controlled warning response follows one real CMS POST, closes saved modal and shows warning without a second mutation',async({page,local})=>{
  seed(local);await local.login(page.context(),'editor');await page.goto('/staff?tab=courses');
  const item=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:`Course browser ${local.suffix}`,exact:true})});
  await item.getByRole('button',{name:'Edit course',exact:true}).click();await page.getByRole('textbox',{name:'Ringkasan',exact:true}).fill('Satu revisi dengan warning browser.');
  const before=Number(local.execute(`select count(*) from public.audit_logs where entity_id='${local.course}' and actor_id='${local.editor}';`));
  let posts=0;
  await page.route('**/api/staff/courses',async route=>{posts++;const response=await route.fetch();expect(response.status()).toBe(200);const body=await response.json();await route.fulfill({response,json:{...body,warning:'Perubahan tersimpan, tetapi penyegaran tampilan publik belum berhasil. Silakan periksa kembali beberapa saat lagi.'}});},{times:1});
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/staff/courses'&&r.request().method()==='POST');await page.getByRole('button',{name:'Simpan materi',exact:true}).click();expect((await response).status()).toBe(200);
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('Perubahan tersimpan, tetapi penyegaran tampilan publik belum berhasil. Silakan periksa kembali beberapa saat lagi.',{exact:true})).toBeVisible();await expect(item).toContainText('Satu revisi dengan warning browser.');expect(posts).toBe(1);
  expect(Number(local.execute(`select count(*) from public.audit_logs where entity_id='${local.course}' and actor_id='${local.editor}';`))).toBe(before+1);
});
test('short course title keeps catalogue and lesson breadcrumb targets at least 44px',async({page,local})=>{
  const data=seed(local);
  local.execute(`begin; select set_config('request.jwt.claim.sub','${local.editor}',true);update public.courses set title='Doa' where id='${local.course}';commit;`);
  for(const width of [320,375,768,1024,1440]){
    await page.setViewportSize({width,height:900});await page.goto('/pelajari-alkitab');
    const catalogue=page.getByRole('main').getByRole('link',{name:'Doa',exact:true}).and(page.locator(`a[href="${data.url}"]`));
    await expect(catalogue).toBeVisible();const entry=await catalogue.boundingBox();
    expect.soft(entry!.width,`${width}px catalogue width`).toBeGreaterThanOrEqual(44);expect(entry!.height).toBeGreaterThanOrEqual(44);
    await openLesson(page,data.url+'/lesson-dua');
    const breadcrumb=page.getByRole('navigation',{name:'Jejak halaman'}).getByRole('link',{name:'Doa',exact:true});
    const trail=await breadcrumb.boundingBox();
    expect.soft(trail!.width,`${width}px breadcrumb width`).toBeGreaterThanOrEqual(44);expect(trail!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
for(const width of [320,375,768,1024,1440])test(`reader ${width}px: long text, touch targets, keyboard and CTA`,async({page,local},info)=>{
  const data=seed(local,true);await page.setViewportSize({width,height:900});await openLesson(page,data.url+'/lesson-tujuh');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  for(const control of await page.locator('#konten-utama a,#konten-utama button').all()){
    if(!await control.isVisible())continue;const box=await control.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button',{name:'Tandai selesai',exact:true}).focus();await page.keyboard.press('Space');await expect(page.getByRole('button',{name:'Batalkan selesai',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Simpan bookmark',exact:true})).toBeFocused();
  await page.evaluate(()=>window.scrollTo(0,0));await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
  await page.screenshot({path:info.outputPath(`reader-${width}.png`),fullPage:true});
  if(width<1280){await page.getByTestId('mobile-menu-button').click();await expect(page.getByTestId('mobile-cta-pelajari-alkitab')).toHaveAttribute('href','/pelajari-alkitab');await page.getByTestId('mobile-cta-pelajari-alkitab').click();await expect(page.getByTestId('mobile-menu')).toHaveCount(0);}else await expect(page.getByTestId('nav-cta-pelajari-alkitab')).toHaveAttribute('href','/pelajari-alkitab');
  await page.goto('/');await expect(page.getByTestId('hero-cta-pelajari-alkitab')).toHaveAttribute('href','/pelajari-alkitab');
});
