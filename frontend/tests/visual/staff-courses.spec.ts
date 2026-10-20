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
const card = (page: Page, title: string) => page.getByRole('listitem').filter({ has:page.getByRole('heading',{name:title,exact:true}) });
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
  await page.getByRole('button',{name:'Tambah Course',exact:true}).click();
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
  await page.getByRole('button',{name:'Tambah Lesson',exact:true}).click();
  await fillCourse(page,lessonTitle,`lesson-${local.suffix}`);
  await page.getByLabel('Nomor urut',{exact:true}).fill('3');
  await page.getByRole('textbox',{name:'Isi lesson',exact:true}).fill('Paragraf pertama.\n\n<script>window.p3Injected=true</script>');
  const first=await submit(page); expect(first.data.position).toBe(3); expect(first.data.status).toBe('draft');
  let lesson=card(page,`3. ${lessonTitle}`); await expect(lesson).toBeVisible();
  await status(page,lesson,'Terbitkan');
  await expect.poll(() => local.publicRows(courseId)).toEqual([]);
  await lesson.getByRole('button',{name:'Edit lesson',exact:true}).click();
  await expect(page.getByText('Perubahan langsung berlaku',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Slug',{exact:true})).toBeDisabled();
  await page.getByLabel('Nomor urut',{exact:true}).fill('5');
  await page.getByRole('textbox',{name:'Isi lesson',exact:true}).fill('Revisi Published.\n\nParagraf kedua.');
  const revised=await submit(page); expect(revised.data.status).toBe('published'); expect(revised.data.position).toBe(5);
  lesson=card(page,`5. ${lessonTitle}`); await expect(lesson).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as {p3Injected?:boolean}).p3Injected)).toBeUndefined();
  await page.getByRole('button',{name:'Tambah Lesson',exact:true}).click();
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
  await parent.getByRole('button',{name:'Edit course',exact:true}).click();
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
  await page.getByRole('button',{name:'Tambah Course',exact:true}).click();
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
  await item.getByRole('button',{name:'Edit course',exact:true}).click();
  await page.getByRole('textbox',{name:'Ringkasan',exact:true}).fill('Revisi record yang hilang.');
  local.execute(`delete from public.courses where id='${local.course}';`);
  await submit(page,404);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(/tidak ditemukan|tidak tersedia/i);
  await expect(page.getByRole('textbox',{name:'Ringkasan',exact:true})).toHaveValue('Revisi record yang hilang.');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'Buang perubahan'}).click();
  await page.reload(); await expect(item).toHaveCount(0);
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
  const item=card(page,longTitle); await item.getByRole('button',{name:'Edit course',exact:true}).click();
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
