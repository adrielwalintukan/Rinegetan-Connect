import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { fixture, loopback } from '../helpers/local-course-fixture.mjs';
type LocalFixture = Awaited<ReturnType<typeof fixture>>;
const test = base.extend<{ local: LocalFixture }>({
  local: async ({ baseURL }, provide) => {
    loopback(baseURL!);
    const local = await fixture(baseURL!);
    try { await provide(local); } finally { local.cleanup(); }
  },
});
async function open(page: Page, local: LocalFixture, role: 'admin' | 'editor') {
  await local.login(page.context(), role);
  await page.goto('/staff?tab=courses');
  loopback(page.url());
  await expect(page.getByRole('button', { name:'Tambah Course',exact:true })).toBeVisible();
}
// The dialog moves focus to Judul one tick after opening; typing before that can land in Judul instead of the target field.
async function openForm(button: Locator) {
  await button.click();
  await expect(button.page().getByRole('dialog').getByLabel('Judul',{exact:true})).toBeFocused();
}
const card = (page: Page, title: string) => page.getByRole('listitem').filter({ has:page.getByRole('heading',{name:title,exact:true}) });
test('delayed refresh blocks reopening until the acknowledged revision reaches the form', async ({page,local}) => {
  await open(page,local,'editor');
  const item=card(page,`Course browser ${local.suffix}`);
  await openForm(item.getByRole('button',{name:'Edit course',exact:true}));
  await page.getByRole('textbox',{name:'Ringkasan',exact:true}).fill('Revisi pertama tersimpan.');
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let delivered!:()=>void; const fulfilled=new Promise<void>(resolve=>{delivered=resolve;});
  let intercepted!:()=>void;
  const started=new Promise<void>(resolve=>{intercepted=resolve;});
  await page.route('**/staff?**',async route=>{
    if(route.request().headers()['rsc']!=='1') return route.continue();
    const response=await route.fetch(); intercepted(); await gate; await route.fulfill({response}); delivered();
  });
  try {
    await submit(page); await started;
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const edit=item.getByRole('button',{name:'Edit course',exact:true});
    await expect(edit).toBeDisabled();
    await edit.evaluate(button=>(button as HTMLButtonElement).click());
    await expect(page.getByRole('dialog')).toHaveCount(0);
    release(); await expect(edit).toBeEnabled();
    await openForm(edit);
    await expect(page.getByRole('textbox',{name:'Ringkasan',exact:true})).toHaveValue('Revisi pertama tersimpan.');
    await page.getByLabel('Judul',{exact:true}).fill(`Revisi kedua ${local.suffix}`);
    await submit(page);
    await expect(card(page,`Revisi kedua ${local.suffix}`)).toContainText('Revisi pertama tersimpan.');
  } finally { release(); await fulfilled; await page.unroute('**/staff?**'); }
});
test('Unicode text boundaries preserve supplementary characters and explain overflow without saving', async ({page,local}) => {
  await open(page,local,'editor');
  await card(page,`Course browser ${local.suffix}`).getByRole('button',{name:'Kelola lesson'}).click();
  await openForm(page.getByRole('button',{name:'Tambah Lesson',exact:true}));
  await page.getByLabel('Slug',{exact:true}).fill(`unicode-${local.suffix}`);
  const fields=[['Judul',199,'Judul'],['Ringkasan',499,'Ringkasan'],['Isi lesson',49999,'Isi lesson']] as const;
  for(const [name,count] of fields) {
    const input=page.getByRole('textbox',{name,exact:true});
    await input.fill('a'.repeat(count)); await input.press('End'); await page.keyboard.insertText('📖');
    await expect(input).toHaveValue('a'.repeat(count)+'📖');
  }
  const saved=await submit(page);
  expect(Array.from(saved.data.title)).toHaveLength(200); expect(Array.from(saved.data.summary)).toHaveLength(500); expect(Array.from(saved.data.body)).toHaveLength(50000);
  await openForm(page.getByRole('button',{name:'Edit lesson',exact:true}));
  let requests=0; const countRequest=(request: import('@playwright/test').Request)=>{if(new URL(request.url()).pathname==='/api/staff/courses') requests++;};
  page.on('request',countRequest);
  for(const [name,count,label] of fields) {
    const input=page.getByRole('textbox',{name,exact:true});
    await input.focus(); await input.press('Control+End'); await page.keyboard.insertText('b');
    await expect(input).toHaveValue('a'.repeat(count)+'📖b');
    await page.getByRole('button',{name:'Simpan materi',exact:true}).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(label);
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/maksimal|melebihi/i);
    expect(requests).toBe(0);
    await input.fill('a'.repeat(count)+'📖');
  }
  page.off('request',countRequest);
});
test('catalog pagination reaches courses and a small parent beyond a thousand global lessons', async ({page,local}) => {
  local.execute(`begin; select set_config('request.jwt.claim.sub','${local.editor}',true);
    insert into public.courses(title,slug) select 'Catalogue ${local.suffix} '||n,'catalogue-${local.suffix}-'||n from generate_series(1,1001) n;
    insert into public.course_lessons(course_id,title,slug,position) select id,'Other parent lesson','other-parent',1 from public.courses where created_by='${local.editor}';
    insert into public.course_lessons(course_id,title,slug,position) values('${local.course}','Reachable late lesson','late-lesson',1002); commit;`);
  expect(local.execute(`select count(*) from public.courses where created_by='${local.editor}' and slug like 'catalogue-${local.suffix}-%';`)).toBe('1001');
  expect(local.execute(`select count(*) from public.course_lessons where created_by='${local.editor}';`)).toBe('1002');
  await open(page,local,'editor');
  await page.getByPlaceholder('Cari judul atau slug...').fill(`Course browser ${local.suffix}`);
  const parent=card(page,`Course browser ${local.suffix}`); await expect(parent).toBeVisible();
  await parent.getByRole('button',{name:'Kelola lesson'}).click();
  await expect(card(page,'1002. Reachable late lesson')).toBeVisible();
  await page.getByRole('button',{name:'Kembali ke daftar course'}).click();
  await page.getByPlaceholder('Cari judul atau slug...').fill(`Catalogue ${local.suffix} 1001`);
  await expect(card(page,`Catalogue ${local.suffix} 1001`)).toBeVisible();
});
async function submit(page: Page, expectedStatus = 200) {
  const response = page.waitForResponse(res => new URL(res.url()).pathname === '/api/staff/courses' && res.request().method() === 'POST');
  await page.getByRole('button',{name:'Simpan materi',exact:true}).click();
  const res = await response; expect(res.status()).toBe(expectedStatus);
  return res.json();
}
async function status(page: Page, item: Locator, label: string) {
  await item.locator('button[aria-haspopup="listbox"]').click();
  const response = page.waitForResponse(res => new URL(res.url()).pathname === '/api/staff/courses' && res.request().method() === 'POST');
  await item.getByRole('option',{name:label,exact:true}).click();
  expect((await response).status()).toBe(200);
  await expect(item.getByRole('listbox')).toHaveCount(0);
  await expect(item).toContainText(label === 'Terbitkan' ? 'Terbit' : label === 'Arsipkan' ? 'Arsip' : 'Draft');
}
async function fillCourse(page: Page, title: string, slug: string) {
  await page.getByLabel('Judul',{exact:true}).fill(title);
  await page.getByLabel('Slug',{exact:true}).fill(slug);
  await page.getByRole('textbox',{name:'Ringkasan',exact:true}).fill('Ringkasan sintetis.');
}
async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth, width: document.documentElement.scrollWidth,
    overflowing: Array.from(document.querySelectorAll('section[aria-label="Pengelola Course dan Lesson"] *')).filter(node => node.getBoundingClientRect().right > window.innerWidth || (node.scrollWidth > node.clientWidth && getComputedStyle(node).overflowX === 'visible')).map(node => ({tag:node.tagName,className:node.className,right:Math.round(node.getBoundingClientRect().right),client:node.clientWidth,scroll:node.scrollWidth})).slice(0,8),
  }));
  expect(overflow.width, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport);
}
async function targets(scope: Locator) {
  for (const control of await scope.locator('button, input:not([type="hidden"]), textarea, [role="option"]').all()) {
    if (!await control.isVisible()) continue;
    const box = await control.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44); expect(box?.height).toBeGreaterThanOrEqual(44);
  }
}
async function errorFocusWrap(page: Page, dialog: Locator, lastName: string, closeName: string) {
  const panel=dialog.locator(':scope > div');
  const last=dialog.getByRole('button',{name:lastName,exact:true});
  const first=dialog.getByRole('button',{name:closeName,exact:true});
  await expect(last).toBeEnabled();
  await expect(panel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  expect(await dialog.evaluate(node=>node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Tab'); await expect(first).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(last).toBeFocused();
  await panel.focus(); await page.keyboard.press('Tab'); await expect(first).toBeFocused();
}
for (const role of ['admin','editor'] as const) test(`${role}: real draft, lesson ordering, publish, published edit and parent visibility`, async ({ page, local }) => {
  await open(page,local,role);
  const title=`Course alur ${local.suffix}`;
  await openForm(page.getByRole('button',{name:'Tambah Course',exact:true}));
  await expect(page.getByLabel('Judul',{exact:true})).toBeFocused();
  await fillCourse(page,title,`alur-${local.suffix}`);
  const created = await submit(page);
  const courseId=created.data.id;
  expect(created.data.status).toBe('draft');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const parent=card(page,title); await expect(parent).toBeVisible();
  if(role==='editor') await expect(page.getByRole('button',{name:'Hapus course',exact:true})).toHaveCount(0);
  await parent.getByRole('button',{name:'Kelola lesson'}).click();
  await expect(page.getByRole('status')).toContainText('Course induk belum Published');
  const lessonTitle=`Lesson alur ${local.suffix}`;
  await openForm(page.getByRole('button',{name:'Tambah Lesson',exact:true}));
  await fillCourse(page,lessonTitle,`lesson-${local.suffix}`);
  await page.getByLabel('Nomor urut',{exact:true}).fill('3');
  await page.getByRole('textbox',{name:'Isi lesson',exact:true}).fill('Paragraf pertama.\n\n<script>window.p3Injected=true</script>');
  const first=await submit(page); expect(first.data.position).toBe(3); expect(first.data.status).toBe('draft');
  let lesson=card(page,`3. ${lessonTitle}`); await expect(lesson).toBeVisible();
  await status(page,lesson,'Terbitkan');
  await expect.poll(() => local.publicRows(courseId)).toEqual([]);
  await openForm(lesson.getByRole('button',{name:'Edit lesson',exact:true}));
  await expect(page.getByText('Perubahan langsung berlaku',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Slug',{exact:true})).toBeDisabled();
  await page.getByLabel('Nomor urut',{exact:true}).fill('5');
  await page.getByRole('textbox',{name:'Isi lesson',exact:true}).fill('Revisi Published.\n\nParagraf kedua.');
  const revised=await submit(page); expect(revised.data.status).toBe('published'); expect(revised.data.position).toBe(5);
  lesson=card(page,`5. ${lessonTitle}`); await expect(lesson).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as {p3Injected?:boolean}).p3Injected)).toBeUndefined();
  await openForm(page.getByRole('button',{name:'Tambah Lesson',exact:true}));
  await fillCourse(page,'Konflik urutan',`konflik-${local.suffix}`);
  await page.getByLabel('Nomor urut',{exact:true}).fill('5');
  await page.getByRole('textbox',{name:'Isi lesson',exact:true}).fill('Isi konflik tetap tersimpan.');
  await submit(page,409);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/urut|digunakan/i);
  await expect(page.getByRole('textbox',{name:'Isi lesson',exact:true})).toHaveValue('Isi konflik tetap tersimpan.');
  await page.getByRole('button',{name:'Batal',exact:true}).click();
  await page.getByRole('button',{name:'Lanjutkan edit',exact:true}).click();
  await page.getByLabel('Nomor urut',{exact:true}).fill('1');
  await submit(page);
  await expect(page.getByRole('listitem').getByRole('heading')).toHaveText(['1. Konflik urutan', `5. ${lessonTitle}`]);
  await page.getByRole('button',{name:'Kembali ke daftar course'}).click();
  await status(page,parent,'Terbitkan');
  await expect.poll(async () => (await local.publicRows(courseId)).length).toBe(1);
  await openForm(parent.getByRole('button',{name:'Edit course',exact:true}));
  await expect(page.getByLabel('Slug',{exact:true})).toBeDisabled();
  await page.getByRole('textbox',{name:'Ringkasan',exact:true}).fill('Revisi course Published langsung berlaku.');
  const parentRevision=await submit(page); expect(parentRevision.data.status).toBe('published');
  await expect(parent).toContainText('Revisi course Published langsung berlaku.');
  await status(page,parent,'Arsipkan');
  await expect.poll(() => local.publicRows(courseId)).toEqual([]);
  await status(page,parent,'Pulihkan ke Draft');
  await expect(parent).toContainText('Draft');
  await status(page,parent,'Terbitkan');
  await page.reload(); await expect(parent).toBeVisible();
  await expect.poll(async () => (await local.publicRows(courseId)).length).toBe(1);
  if(role==='editor') {
    const denied=await page.request.post('/api/staff/courses',{data:{entity:'courses',action:'delete',id:courseId}});
    expect(denied.status()).toBe(403);
  }
});
test('network failure retains form, dirty discard is explicit, and repeated submit is blocked', async ({page,local}) => {
  await open(page,local,'editor');
  await openForm(page.getByRole('button',{name:'Tambah Course',exact:true}));
  await fillCourse(page,`Gagal ${local.suffix}`,`gagal-${local.suffix}`);
  await page.route('**/api/staff/courses',route=>route.abort('failed'),{times:1});
  await page.getByRole('button',{name:'Simpan materi',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Tidak dapat terhubung');
  await expect(page.getByLabel('Judul',{exact:true})).toHaveValue(`Gagal ${local.suffix}`);
  await errorFocusWrap(page,page.getByRole('dialog'),'Simpan materi','Tutup form');
  await page.getByRole('button',{name:'Batal',exact:true}).click();
  await expect(page.getByText('Buang perubahan yang belum disimpan?')).toBeVisible();
  await expect(page.getByRole('button',{name:'Lanjutkan edit'})).toBeFocused();
  await page.getByRole('button',{name:'Lanjutkan edit'}).click();
  let release!:()=>void; const gate=new Promise<void>(resolve=>{release=resolve;}); let requests=0;
  await page.route('**/api/staff/courses',async route=>{requests++;await gate;await route.continue();},{times:1});
  const pending=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/staff/courses');
  await page.getByRole('button',{name:'Simpan materi',exact:true}).click();
  await expect(page.getByRole('button',{name:'Menyimpan...',exact:true})).toBeDisabled();
  await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog').evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Enter'); expect(requests).toBe(1); release();
  expect((await pending).status()).toBe(200); await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('missing record fails safely without losing the edit', async ({page,local}) => {
  await open(page,local,'admin'); const item=card(page,`Course browser ${local.suffix}`);
  await openForm(item.getByRole('button',{name:'Edit course',exact:true}));
  await page.getByRole('textbox',{name:'Ringkasan',exact:true}).fill('Revisi record yang hilang.');
  local.execute(`delete from public.courses where id='${local.course}';`);
  await submit(page,404);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/tidak ditemukan|tidak tersedia/i);
  await expect(page.getByRole('textbox',{name:'Ringkasan',exact:true})).toHaveValue('Revisi record yang hilang.');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'Buang perubahan'}).click();
  await page.reload(); await expect(item).toHaveCount(0);
  // The row is already gone; cleanup must still remove audit for its known UUID.
  local.cleanup();
  expect(local.execute(`select count(*) from public.audit_logs where entity_id='${local.course}';`)).toBe('0');
});
test('admin delete confirmation enforces relation, target size, focus and final deletion', async ({page,local}) => {
  await page.setViewportSize({width:320,height:720}); await open(page,local,'admin');
  const item=card(page,`Course browser ${local.suffix}`);
  local.execute(`insert into public.course_lessons(course_id,title,slug,body,position) values('${local.course}','Lesson penghalang','penghalang','Isi sintetis',1);`);
  await page.reload(); await expect(item).toBeVisible();
  await item.getByRole('button',{name:'Hapus course',exact:true}).click();
  const dialog=page.getByRole('dialog'); await targets(dialog); await noOverflow(page);
  await expect(dialog.getByRole('button',{name:'Tutup konfirmasi hapus'})).toBeFocused();
  await dialog.getByRole('button',{name:'Konfirmasi Hapus Permanen'}).focus(); await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button',{name:'Tutup konfirmasi hapus'})).toBeFocused();
  const rejected=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/staff/courses');
  await dialog.getByRole('button',{name:'Konfirmasi Hapus Permanen'}).click(); expect((await rejected).status()).toBe(409);
  await expect(dialog.getByRole('alert')).toContainText(/lesson|terkait/i);
  await errorFocusWrap(page,dialog,'Konfirmasi Hapus Permanen','Tutup konfirmasi hapus');
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
  await expect(item.getByRole('button',{name:'Hapus course',exact:true})).toBeFocused();
  await item.getByRole('button',{name:'Kelola lesson'}).click();
  await page.getByRole('button',{name:'Hapus lesson',exact:true}).click();
  const deleted=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/staff/courses');
  await page.getByRole('button',{name:'Konfirmasi Hapus Permanen'}).click(); expect((await deleted).status()).toBe(200);
  await expect(page.getByText('Belum ada lesson dalam course ini.')).toBeVisible();
  await page.getByRole('button',{name:'Kembali ke daftar course'}).click();
  await item.getByRole('button',{name:'Hapus course',exact:true}).click();
  const deletedParent=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/staff/courses');
  await page.getByRole('button',{name:'Konfirmasi Hapus Permanen'}).click(); expect((await deletedParent).status()).toBe(200);
  await expect(item).toHaveCount(0);
});
for (const width of [320,375,768,1024,1440]) test(`responsive ${width}px: long text, 44px controls, bottom sheet and keyboard`, async ({page,local},testInfo) => {
  const longTitle='Judul ' + 'Panjang'.repeat(25);
  local.execute(`update public.courses set title='${longTitle}',slug='${'a'.repeat(220)}',summary='${'Ringkasan'.repeat(55)}' where id='${local.course}';`);
  await page.setViewportSize({width,height:900}); await open(page,local,'admin');
  await noOverflow(page); await targets(page.getByRole('region',{name:'Pengelola Course dan Lesson'}));
  const item=card(page,longTitle); await openForm(item.getByRole('button',{name:'Edit course',exact:true}));
  await expect(page.getByLabel('Judul',{exact:true})).toBeFocused();
  await targets(page.getByRole('dialog')); await noOverflow(page);
  await page.getByRole('button',{name:'Simpan materi',exact:true}).focus(); await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Tutup form'})).toBeFocused();
  if(width<640) { const box=await page.getByRole('dialog').locator(':scope > div').boundingBox(); expect(Math.round(box!.y+box!.height)).toBe(900); }
  await page.getByRole('textbox',{name:'Ringkasan',exact:true}).fill('Paragraf satu.\n\nParagraf dua. <script>teks</script>');
  await page.screenshot({path:testInfo.outputPath(`staff-courses-${width}.png`),fullPage:true});
  await page.keyboard.press('Escape'); await expect(page.getByRole('button',{name:'Buang perubahan'})).toBeVisible();
  await page.getByRole('button',{name:'Buang perubahan'}).click();
  await expect(item.getByRole('button',{name:'Edit course',exact:true})).toBeFocused();
});

test('status dropdown supports keyboard selection, Escape preserves parent modal, Tab leaves options', async ({page,local}) => {
  await open(page,local,'editor');
  const item=card(page,`Course browser ${local.suffix}`);
  const trigger=item.locator('button[aria-haspopup="listbox"]');
  await trigger.focus(); await page.keyboard.press('ArrowDown');
  await expect(item.getByRole('option',{name:'Jadikan Draft',exact:true})).toBeFocused();
  await page.keyboard.press('End');
  await expect(item.getByRole('option',{name:'Arsipkan',exact:true})).toBeFocused();
  await page.keyboard.press('Home');
  await expect(item.getByRole('option',{name:'Jadikan Draft',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(item.getByRole('option',{name:'Terbitkan',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(item.getByRole('option',{name:'Jadikan Draft',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(item.getByRole('option',{name:'Terbitkan',exact:true})).toBeFocused();
  await targets(item.getByRole('listbox'));
  const response=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/staff/courses');
  await page.keyboard.press('Enter'); expect((await response).status()).toBe(200);
  await expect(trigger).toBeFocused(); await expect(item).toContainText('Terbit');
  await trigger.click(); await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused(); await expect(item.getByRole('listbox')).toHaveCount(0);
  await trigger.click(); await page.keyboard.press('Tab');
  await expect(item.getByRole('listbox')).toHaveCount(0);
  // Exercise the same shared dropdown inside the existing generic CMS modal.
  await page.getByRole('button',{name:'Pengumuman',exact:true}).click();
  await page.getByRole('button',{name:'Tambah Pengumuman',exact:true}).click();
  const modal=page.getByRole('dialog');
  await modal.locator('button[aria-haspopup="listbox"]').last().click();
  await expect(modal.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).toBeVisible(); await expect(modal.getByRole('listbox')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(modal).toHaveCount(0);
});

const importFile = (suffix: string, slug: string) => ({
  name: `${slug}.json`, mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({
    format: 'rinegetan-course-import/1', language: 'id',
    source: { name: 'Sumber sintetis', url: 'https://contoh.invalid/seri', rights_holder: 'Pemegang sintetis' },
    license: { name: 'Izin sintetis', notes: 'Hanya untuk uji lokal.' },
    course: { title: `Impor ${slug} ${suffix}`, slug: `${slug}-${suffix}`, summary: 'Ringkasan impor sintetis.' },
    lessons: [
      { position: 1, title: 'Lesson impor satu', slug: 'satu', summary: '', body: 'Paragraf pertama.\n\nParagraf kedua.' },
      { position: 2, title: 'Lesson impor dua', slug: 'dua', summary: '', body: 'Isi kedua.' },
    ],
  })),
});
async function uploadImport(page: Page, file: ReturnType<typeof importFile>, title?: string) {
  await page.getByRole('button', { name:'Impor JSON', exact:true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Berkas JSON')).toBeFocused();
  await dialog.getByLabel('Berkas JSON').setInputFiles(file);
  await dialog.getByRole('button', { name:'Unggah untuk ditinjau', exact:true }).click();
  if (title) { await expect(dialog).toHaveCount(0); await expect(importItem(page, title)).toBeVisible(); }
}
const importItem = (page: Page, title: string) => page.getByRole('region', { name:'Impor course' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name:title, exact:true }) });
const noPageOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

test('course import: Editor stages, Admin rejects and approves into Draft, public stays hidden', async ({ page, local, playwright, baseURL }) => {
  try {
    await open(page, local, 'editor');
    // Invalid file shows a field error and creates nothing.
    const bad = importFile(local.suffix, 'invalid');
    bad.buffer = Buffer.from(bad.buffer.toString().replace('"language":"id"', '"language":"en"'));
    await uploadImport(page, bad);
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('language');
    await page.getByRole('dialog').getByRole('button', { name:'Batal', exact:true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(local.execute(`select count(*) from public.course_imports where course_slug = 'invalid-${local.suffix}'`)).toBe('0');

    await uploadImport(page, importFile(local.suffix, 'tolak'), `Impor tolak ${local.suffix}`);
    await uploadImport(page, importFile(local.suffix, 'terima'), `Impor terima ${local.suffix}`);
    const accepted = importItem(page, `Impor terima ${local.suffix}`);
    await expect(accepted).toContainText('Menunggu persetujuan');
    await expect(accepted.getByRole('button', { name:'Setujui' })).toHaveCount(0);
    await expect(accepted.getByRole('button', { name:'Tolak' })).toHaveCount(0);
    await accepted.getByRole('button', { name:'Lihat preview' }).click();
    await expect(accepted.getByRole('heading', { name:'2. Lesson impor dua' })).toBeVisible();
    await expect(accepted.getByText('Paragraf kedua.')).toBeVisible();

    await page.context().clearCookies();
    await open(page, local, 'admin');
    const rejected = importItem(page, `Impor tolak ${local.suffix}`);
    await rejected.getByRole('button', { name:'Tolak', exact:true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name:'Tolak impor', exact:true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Alasan penolakan wajib diisi');
    // Keyboard only: textarea -> Batal -> Tolak impor -> Enter.
    await dialog.getByLabel('Alasan penolakan').focus();
    await page.keyboard.type('Izin belum lengkap.');
    await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name:'Batal', exact:true })).toBeFocused();
    await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name:'Tolak impor', exact:true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(rejected).toContainText('Alasan penolakan: Izin belum lengkap.');
    await expect(page.getByRole('heading', { name:'Impor course', exact:true })).toBeFocused();

    const approve = importItem(page, `Impor terima ${local.suffix}`);
    await approve.getByRole('button', { name:'Setujui', exact:true }).click();
    await page.getByRole('dialog').getByRole('button', { name:'Setujui dan buat Draft', exact:true }).click();
    await expect(approve).toContainText('Disetujui');
    await expect(page.getByRole('heading', { name:'Impor course', exact:true })).toBeFocused();
    // The import item shares the course title; the course card comes after the panel.
    await expect(card(page, `Impor terima ${local.suffix}`).last()).toContainText('Draft');
    await expect(approve).not.toContainText('Diunggah dan disetujui oleh orang yang sama');

    // Anonymous visitor (no staff cookies) must not see the Draft course.
    const anonymous = await playwright.request.newContext({ baseURL });
    try {
      const response = await anonymous.get(`/pelajari-alkitab/terima-${local.suffix}`);
      expect(response.status()).toBe(404);
      expect(await response.text()).not.toContain(`Impor terima ${local.suffix}`);
    } finally { await anonymous.dispose(); }

    await page.setViewportSize({ width: 320, height: 800 });
    await expect(page.getByRole('region', { name:'Impor course' })).toBeVisible();
    await noPageOverflow(page);
    await approve.getByRole('button', { name:'Lihat preview' }).click();
    await expect(approve.getByRole('heading', { name:'2. Lesson impor dua' })).toBeVisible();
    await noPageOverflow(page);
  } finally {
    local.execute(`begin;
      delete from public.course_lessons where course_id in (select id from public.courses where slug like '%-${local.suffix}');
      delete from public.course_imports where course_slug like '%-${local.suffix}';
      delete from public.courses where slug like '%-${local.suffix}'; commit;`);
  }
});
test('study interest: visitor submits with consent, Admin handles, Editor cannot see', async ({ page, local, playwright, baseURL }) => {
  const name = `Peminat ${local.suffix}`;
  const lead = () => local.execute(`select count(*) from public.study_interest_leads where name = '${name}'`);
  try {
    await page.goto('/pelajari-alkitab#ingin-belajar');
    const section = page.getByRole('region', { name:'Ingin belajar bersama?' });
    await expect(section).toBeVisible();
    await section.getByLabel('Nama', { exact:true }).fill(name);
    await section.getByLabel('Nomor WhatsApp atau email').fill(`peminat-${local.suffix}@example.invalid`);
    await section.getByLabel('Pesan (opsional)').fill('Ingin belajar bersama keluarga.');
    // Consent is unchecked by default and required.
    await expect(section.getByRole('checkbox')).not.toBeChecked();
    await section.getByRole('button', { name:'Kirim', exact:true }).click();
    await expect(section.getByRole('alert')).toBeFocused();
    await expect(section).toContainText('Centang persetujuan untuk melanjutkan.');
    expect(lead()).toBe('0');

    await section.getByRole('checkbox').check();
    // Cloudflare's always-pass test key fills the hidden response field once solved.
    await expect(section.locator('input[name="cf-turnstile-response"]')).not.toHaveValue('', { timeout:30_000 });
    await section.getByRole('button', { name:'Kirim', exact:true }).click();
    await expect(section.getByRole('status')).toContainText('Terima kasih. Tim kami akan menghubungi Anda.');
    expect(lead()).toBe('1');
    const id = local.execute(`select id from public.study_interest_leads where name = '${name}'`);

    await page.setViewportSize({ width: 320, height: 800 });
    await noPageOverflow(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    // Editor: no tab, and the status route refuses.
    await local.login(page.context(), 'editor');
    await page.goto('/staff?tab=interest');
    await expect(page.getByRole('button', { name:'Minat belajar' })).toHaveCount(0);
    await expect(page.getByText(name)).toHaveCount(0);
    const refused = await page.request.patch(`/api/staff/study-interest/${id}`, { data:{ status:'closed' } });
    expect(refused.status()).toBe(403);

    // Anonymous visitors cannot change status either.
    const anonymous = await playwright.request.newContext({ baseURL });
    try { expect((await anonymous.patch(`/api/staff/study-interest/${id}`, { data:{ status:'closed' } })).status()).toBe(401); }
    finally { await anonymous.dispose(); }

    // Admin: sees the lead and marks it contacted.
    await page.context().clearCookies();
    await local.login(page.context(), 'admin');
    await page.goto('/staff?tab=interest');
    const item = page.getByRole('listitem').filter({ hasText:name });
    await expect(item).toContainText(`peminat-${local.suffix}@example.invalid`);
    await expect(item).toContainText('Ingin belajar bersama keluarga.');
    await item.getByLabel('Status').selectOption('contacted');
    await expect.poll(() => local.execute(`select status from public.study_interest_leads where id = '${id}'`)).toBe('contacted');
    await page.setViewportSize({ width: 320, height: 800 });
    await noPageOverflow(page);
  } finally {
    local.execute(`begin;
      delete from public.audit_logs where entity_type = 'study_interest_leads' and entity_id in (select id from public.study_interest_leads where name = '${name}');
      delete from public.study_interest_leads where name = '${name}';
      delete from public.form_rate_events where created_at > now() - interval '1 hour'; commit;`);
  }
});
