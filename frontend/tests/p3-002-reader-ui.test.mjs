import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { createClient } from '@supabase/supabase-js';
import { tsxLoader } from './helpers/load-tsx.mjs';
const base='src/app/(public)/pelajari-alkitab/';
const course={id:'11111111-1111-4111-8111-111111111111',title:'Public <script>title</script>',slug:'public-course',summary:'Public summary',published_at:'2026-10-22',updated_at:'2026-10-22'};
const lessons=[2,7,20].map((position,i)=>({...course,id:`22222222-2222-4222-8222-22222222222${i}`,course_id:course.id,title:`Lesson ${position}`,slug:`lesson-${position}`,position,body:'First line\nsecond line\n\n<script>window.injected=true</script>\n**plain Markdown**'}));
function setup({courses=[course],rows=lessons,error=false}={}){
 let connected=false; const requests=[];
 // Keep the real anonymous factory/query builder; replace only its network transport.
 const fetch=async(input)=>{
   assert.ok(connected,'connection must precede every query');const url=new URL(input);const table=url.pathname.split('/').at(-1);const columns=url.searchParams.get('select');
   assert.doesNotMatch(columns,/\*|created_by|updated_by/);requests.push([table,columns]);
   if(error)return new Response(JSON.stringify({message:'PRIVATE_ERROR'}),{status:500,headers:{'Content-Type':'application/json'}});
   const filters=[...url.searchParams].filter(([,value])=>value.startsWith('eq.'));
   const start=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||500);
   const data=(table==='courses'?courses:rows).filter(row=>filters.every(([key,value])=>key==='status'||row[key]===value.slice(3))).slice(start,start+limit).map(row=>Object.fromEntries(columns.split(',').map(column=>[column,row[column]])));
   return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 };
 const load=tsxLoader({'@supabase/supabase-js':{createClient:(url,key,options)=>createClient(url,key,{...options,db:{retry:false},global:{...options.global,fetch}})},'next/server':{connection:async()=>{connected=true;}},'next/navigation':{notFound(){throw new Error('NOT_FOUND');}},'next/link':{__esModule:true,default:({children,prefetch,...props})=>{void prefetch;return React.createElement('a',props,children);}}});
 return {load,requests};
}
process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='synthetic-node-boundary';
const props=(courseSlug=course.slug,lessonSlug='lesson-7')=>({params:Promise.resolve({courseSlug,lessonSlug})});
test('catalogue and empty course render actual public rows, neutral progress and valid empties',async()=>{
 let {load}=setup({courses:[]});assert.match(render(await load(base+'page.tsx').default()),/Belum ada materi/);
 ({load}=setup({rows:[]}));const html=render(await load(base+'[courseSlug]/page.tsx').default(props()));assert.match(html,/Belum ada pelajaran/);assert.doesNotMatch(html,/Lanjut belajar|Mulai belajar/);
 ({load}=setup());const content=render(await load(base+'[courseSlug]/page.tsx').default(props()));assert.match(content,/Lesson 2/);assert.match(content,/Lesson 7/);assert.match(content,/Lesson 20/);assert.match(content,/browser/);assert.doesNotMatch(content,/First line/);
});
test('actual lesson escapes HTML and Markdown, retains paragraphs/newlines and sparse neighbors',async()=>{
 const {load,requests}=setup();const content=render(await load(base+'[courseSlug]/[lessonSlug]/page.tsx').default(props()));
 assert.match(content,/&lt;script&gt;window.injected=true&lt;\/script&gt;/);assert.match(content,/\*\*plain Markdown\*\*/);assert.match(content,/First line\nsecond line/);assert.match(content,/<p[^>]*>First line/);assert.doesNotMatch(content,/<script>|<strong>plain Markdown/);assert.match(content,/href="\/pelajari-alkitab\/public-course\/lesson-2"/);assert.match(content,/href="\/pelajari-alkitab\/public-course\/lesson-20"/);assert.equal(requests.filter(([,columns])=>columns.includes('body')).length,1);
});
test('missing parent, missing lesson and mismatched relationship are not found, never private metadata',async()=>{
 for(const [courses,rows] of [[[],lessons],[[course],[]],[[course],lessons.map(l=>({...l,course_id:'other'}))]]){
 const {load}=setup({courses,rows});const page=load(base+'[courseSlug]/[lessonSlug]/page.tsx');await assert.rejects(page.default(props()),/NOT_FOUND/);await assert.rejects(page.generateMetadata(props()),/NOT_FOUND/);
 }
 const {load}=setup();const metadata=await load(base+'[courseSlug]/[lessonSlug]/page.tsx').generateMetadata(props());assert.match(metadata.title,/Lesson 7/);assert.equal(metadata.description,'Public summary');assert.doesNotMatch(JSON.stringify(metadata),/actor|created_by|PRIVATE/);
});
test('query failures propagate to safe error UI instead of legitimate empty content',async()=>{
 const {load}=setup({error:true});await assert.rejects(load(base+'page.tsx').default(),/Materi belum dapat dimuat/);
 const error=load(base+'error.tsx').default;const html=render(React.createElement(error,{error:new Error('PRIVATE_ERROR'),reset(){}}));assert.match(html,/role="alert"/);assert.match(html,/Coba lagi/);assert.doesNotMatch(html,/PRIVATE_ERROR|Belum ada materi/);
 assert.match(render(React.createElement(load(base+'not-found.tsx').default)),/tidak ditemukan/);
});
test('real catalogue reaches past 1000 rows',async()=>{
 const courses=Array.from({length:1002},(_,i)=>({...course,id:String(i),title:`Public ${i}`,slug:`public-${i}`}));const {load}=setup({courses});const html=render(await load(base+'page.tsx').default());assert.match(html,/Public 1001/);
});
test('desktop nav and Hero CTA point at reader while Bible card alone becomes available',()=>{
 const load=tsxLoader({'next/navigation':{usePathname:()=>'/','useRouter':()=>({})},'next/link':{__esModule:true,default:({children,prefetch,...props})=>{void prefetch;return React.createElement('a',props,children);}}});
 const nav=render(React.createElement(load('src/components/layout/GlobalNav.jsx').GlobalNav));assert.match(nav,/<a[^>]*href="\/pelajari-alkitab"[^>]*data-testid="nav-cta-pelajari-alkitab"/);
 const hero=render(React.createElement(load('src/components/sections/Hero.jsx').Hero));assert.match(hero,/<a[^>]*href="\/pelajari-alkitab"[^>]*data-testid="hero-cta-pelajari-alkitab"/);
 const digital=render(React.createElement(load('src/components/sections/DigitalMinistrySection.jsx').DigitalMinistrySection));assert.match(digital,/href="\/pelajari-alkitab"/);assert.equal((digital.match(/Segera hadir/g)||[]).length,2);
});
