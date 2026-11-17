import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=resolve(process.argv[2]||'review/playground');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(!pathname.startsWith('/playground/')){res.writeHead(404).end();return}
    const fragment=pathname.slice('/playground/'.length);
    const destination=resolve(root,fragment.endsWith('/')?fragment+'index.html':fragment);
    if(!destination.startsWith(root+sep)){res.writeHead(403).end();return}
    const data=await readFile(destination);
    res.writeHead(200,{'Content-Type':mime[extname(destination)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
  }catch{res.writeHead(404).end()}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage(),errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{
    if(/supabase\.co/.test(request.url()) && !['GET','HEAD'].includes(request.method()))
      writes.push(request.method()+' '+request.url());
  });
  await context.route('https://**/*',route=>route.abort());
  await page.goto(origin+'/playground/integration/',{waitUntil:'domcontentloaded'});
  await page.locator('.cs1-integration-notice').waitFor({timeout:25000});
  assert.match(await page.locator('.cs1-integration-notice').innerText(),/read-only integration test/);
  assert.equal(await page.getByRole('button',{name:'Teacher dashboard'}).count(),0);
  await page.goto(origin+'/playground/integration/#/playgrounds/computer-science-1/lessons/'+encodeURIComponent('01-how-programs-work/01-first-message'));
  await page.locator('.lesson-screen').waitFor({timeout:25000});
  assert.equal(await page.locator('.lesson-header button.completion-toggle').count(),0);
  await page.goto(origin+'/playground/integration/#/grades');
  await page.getByRole('heading',{name:'Grades',exact:true}).waitFor({timeout:25000});
  assert.match(await page.locator('.grades-preview-note').innerText(),/Sign in on the current Playground/);
  await page.goto(origin+'/playground/integration/#/teacher');
  await page.getByRole('heading',{name:'Not enabled in this test build'}).waitFor();
  assert.deepEqual(writes,[]);
  assert.deepEqual(errors,[]);
  console.log('CS1 read-only guest integration routes and account safety verified');
  await context.close();
}finally{await browser?.close();await new Promise(done=>server.close(done))}
