import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createPreviewServer} from './preview-server.mjs';
import {buildProjectPreview} from '../public/project-preview.mjs';
const root=resolve(import.meta.dirname,'..'),mobile=resolve(process.env.MOBILE_SOURCE||root+'/../mobile-app-dev');
const server=createPreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const course=JSON.parse(await readFile(mobile+'/course.json','utf8'));
 async function check(source,projectId,step){
  await page.goto('about:blank');await page.evaluate(()=>{window.messages=[];window.addEventListener('message',e=>window.messages.push(e.data));});
  await page.setContent(buildProjectPreview(source,{token:'smoke',projectId,step,check:true}));
  await page.waitForFunction(()=>window.messages.some(m=>m.kind==='project-checks'));
  const results=await page.evaluate(()=>window.messages.find(m=>m.kind==='project-checks').results);
  assert.ok(results.length>0&&results.every(r=>r.pass),step+': '+JSON.stringify(results));
 }
 for(const width of [1280,375]){
  await page.setViewportSize({width,height:900});
  for(const step of course.projects.find(p=>p.id==='bracket-challenge').steps){
   const source=await readFile(mobile+'/projects/bracket-challenge/checkpoints/'+step.id+'.html','utf8');
   assert.ok((await readFile(mobile+'/'+step.markdown,'utf8')).includes('```html\n'+source+'```'),'Full lesson snapshot: '+step.id);
   await check(source,'bracket-challenge',step.id);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),step.id+' overflow');
  }
 }
 console.log('Ten cumulative bracket checkpoints pass at desktop and phone widths.');
 const component=await readFile(mobile+'/projects/component-studio/example.html','utf8');
 await check(component,'component-studio','build');
 const two=component.replace('const card = document.querySelector(\'[data-component="event-card"]\');','document.querySelectorAll(\'[data-component="event-card"]\').forEach(function (card) {').replace('  </script>','    });\n  </script>').replace('  </main>',component.match(/    <section[\s\S]*?<\/section>/)[0].replaceAll('event-title','event-title-two')+'\n  </main>');
 await check(two,'component-studio','integrate');
 console.log('Component toggling and two independent instances pass.');
 const base='http://127.0.0.1:'+server.address().port+'/playground/';
 await page.goto(base+'#/course/tsi-math/diagnostic');
 await page.getByRole('heading',{name:'Find your math starting point',exact:true}).waitFor();
 await page.getByRole('button',{name:'Find my prep plan',exact:true}).click();assert.match(await page.locator('#diagnostic-status').textContent(),/every question/);
 const data=JSON.parse(await readFile(root+'/public/data/tsi-math/content/diagnostic-v1.json','utf8'));
 for(const item of data.items)await page.locator('#'+item.id).fill(String(item.answer));
 await page.getByRole('button',{name:'Find my prep plan',exact:true}).click();assert.match(await page.locator('#diagnostic-results').textContent(),/First attempt: 24\/24. Latest: 24\/24/);
 await page.locator('#foundations-1').fill('0');await page.getByRole('button',{name:'Find my prep plan',exact:true}).click();assert.match(await page.locator('#diagnostic-results').textContent(),/First attempt: 24\/24. Latest: 23\/24/);
 await page.reload();await page.locator('#diagnostic-results h2').waitFor();assert.match(await page.locator('#diagnostic-results').textContent(),/Latest: 23\/24/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await mkdir(root+'/artifacts',{recursive:true});await page.screenshot({path:root+'/artifacts/math-diagnostic-phone.png',fullPage:true});
 console.log('Diagnostic incomplete, correct, retry, reload, and phone layout pass.');
}finally{await browser?.close();server.close();}
