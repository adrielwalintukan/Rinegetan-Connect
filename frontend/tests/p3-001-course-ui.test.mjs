import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { tsxLoader } from './helpers/load-tsx.mjs';
const load = tsxLoader({ 'next/navigation': { useRouter: () => ({ refresh() {} }) }, '@/components/ui/modal': { Modal: ({ children }) => React.createElement('div', { role: 'dialog' }, children), MODAL_BACKDROP: '' } });
const course = { id:'11111111-1111-4111-8111-111111111111', title:'Materi <script>alert(1)</script> ' + 'Panjang '.repeat(20), slug:'materi-uji', summary:'Ringkasan uji', status:'draft', published_at:null, created_at:'2026-10-19', updated_at:'2026-10-19', created_by:null, updated_by:null };
const lesson = { ...course, id:'22222222-2222-4222-8222-222222222222', course_id:course.id, title:'Lesson Uji', slug:'lesson-uji', body:'Paragraf pertama.\n\n<script>uji</script>', position:3 };
const html = (component, props) => renderToStaticMarkup(React.createElement(component, props));
for (const role of ['admin','editor']) test(`${role} has the dedicated Bible learning tab and course manager`, () => {
  const { StaffDashboard } = load('src/components/staff/StaffDashboard.tsx');
  const markup = html(StaffDashboard, { userEmail:'staff@example.test', currentUserId:'staff-test', role, initialTab:'courses', initialAnnouncements:[], initialEvents:[], initialSchedules:[], initialDepartments:[], initialAuditLogs:[], initialCourses:[course], initialCourseLessons:[lesson] });
  assert.match(markup, /Pelajari Alkitab/); assert.match(markup, /Tambah Course/); assert.match(markup, /Ringkasan uji/); assert.doesNotMatch(markup, /Tambah Pelajari Alkitab|<script>/);
  assert.equal(markup.includes('Hapus course'), role === 'admin');
});
test('empty and query failure states are visibly distinct and safe', () => {
  const { CourseManager } = load('src/components/staff/CourseManager.tsx');
  const props = { courses:[], lessons:[], role:'editor', onNotification() {} };
  assert.match(html(CourseManager, props), /Belum ada course/);
  const failure = html(CourseManager, { ...props, error:'Materi gagal dimuat. Silakan coba lagi.' });
  assert.match(failure, /role="alert"/); assert.doesNotMatch(failure, /Belum ada course/);
});
test('lesson form retains parent, paragraph text, position and locked published slug', () => {
  const { CourseMutationDialog } = load('src/components/staff/CourseMutationDialog.tsx');
  const markup = html(CourseMutationDialog, { kind:'lesson', courseId:course.id, courseTitle:course.title, initialData:{ ...lesson, status:'published', published_at:'2026-10-19' }, isOpen:true, isSaving:false, onClose(){}, async onSave(){} });
  assert.match(markup, /Perubahan langsung berlaku/); assert.match(markup, /Nomor urut/); assert.match(markup, /boleh bercelah/); assert.match(markup, /<input(?=[^>]*name="slug")(?=[^>]*disabled="")[^>]*>/); assert.match(markup, /&lt;script&gt;uji&lt;\/script&gt;/); assert.doesNotMatch(markup, /<script>|Status Awal/);
});
test('protected page reads course data through session and surfaces safe query errors', async () => {
  const queries=[];
  const db={from(table){ queries.push(table); const builder={select(){return builder;},order(){return builder;},range(){return builder;},limit(){return builder;},then(resolve){return Promise.resolve({data:[],error:table==='courses'?{message:'PRIVATE_SENTINEL'}:null}).then(resolve);}};return builder;}};
  const pageLoader=tsxLoader({ '@/lib/supabase/server':{createServerSupabaseClient:async()=>db}, '@/lib/staff/server':{requireActiveStaff:async()=>({role:'editor',user:{id:'staff-test',email:'staff@example.test'}})}, '@/components/staff/StaffDashboard':{StaffDashboard:()=>null}, '@/lib/public/queries':{getSiteSectionMedia:async()=>({})} });
  const result=await pageLoader('src/app/staff/(protected)/page.tsx').default({searchParams:Promise.resolve({tab:'courses'})});
  assert.ok(queries.includes('courses')); assert.ok(queries.includes('course_lessons')); assert.match(result.props.coursesError,/gagal|tidak dapat/i); assert.doesNotMatch(result.props.coursesError,/PRIVATE_SENTINEL/);
});
test('protected page reaches every course and lessons across parents beyond the API row cap', async () => {
  const courses=Array.from({length:1002},(_,i)=>({...course,id:String(i).padStart(8,'0')}));
  const lessons=Array.from({length:1502},(_,i)=>({...lesson,id:String(i).padStart(8,'0'),course_id:courses[i%1002].id,position:1+Math.floor(i/1002)}));
  for(const failure of [null,'error','throw']) {
    const orders=[];
    const db={from(table){let start=0,end=999; const order=[]; const builder={select(){return builder;},order(key,options){order.push([key,options.ascending]);return builder;},range(from,to){assert.ok(to-from<1000);start=from;end=to;return builder;},then(resolve,reject){
      const rows=table==='courses'?courses:table==='course_lessons'?lessons:[];
      orders.push([table,order]);
      if(table==='course_lessons'&&start>0&&failure) return (failure==='throw'?Promise.reject(new Error('PRIVATE_SENTINEL')):Promise.resolve({data:null,error:{message:'PRIVATE_SENTINEL'}})).then(resolve,reject);
      const sorted=[...rows].sort((a,b)=>{for(const [key,ascending] of order){if(a[key]<b[key])return ascending?-1:1;if(a[key]>b[key])return ascending?1:-1;}return 0;});
      return Promise.resolve({data:sorted.slice(start,end+1),error:null}).then(resolve,reject);
    }};return builder;}};
    const pageLoader=tsxLoader({'@/lib/supabase/server':{createServerSupabaseClient:async()=>db},'@/lib/staff/server':{requireActiveStaff:async()=>({role:'editor',user:{id:'staff-test'}})},'@/components/staff/StaffDashboard':{StaffDashboard:()=>null},'@/lib/public/queries':{getSiteSectionMedia:async()=>({})}});
    const result=await pageLoader('src/app/staff/(protected)/page.tsx').default({});
    if(failure){assert.match(result.props.coursesError,/gagal/i);assert.deepEqual(result.props.initialCourseLessons,[]);assert.doesNotMatch(result.props.coursesError,/PRIVATE_SENTINEL/);}
    else {assert.equal(result.props.initialCourses.length,1002);assert.equal(result.props.initialCourseLessons.length,1502);assert.equal(new Set(result.props.initialCourseLessons.map(row=>row.id)).size,1502);assert.equal(result.props.coursesError,null);}
    for(const [table,order] of orders.filter(([table])=>['courses','course_lessons'].includes(table))) assert.equal(order.at(-1)[0],'id',`${table} requires a unique tie-break`);
  }
});
import { fixture as browserFixture, loopback } from './helpers/local-course-fixture.mjs';
test('browser fixtures reject non-loopback targets before local commands or mutations', async () => {
  for (const target of ['https://example.invalid', 'http://192.0.2.1:3412', 'http://127.0.0.1.example.invalid']) {
    await assert.rejects(browserFixture(target), /requires loopback targets/);
  }
  assert.equal(loopback('http://127.0.0.1:3412').hostname, '127.0.0.1');
  assert.equal(loopback('http://localhost:54321').hostname, 'localhost');
});
