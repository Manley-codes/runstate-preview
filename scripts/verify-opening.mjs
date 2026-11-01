import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.woff2':'font/woff2'};
let browser,server,origin;
before(async()=>{
  server=createServer(async(request,response)=>{
    try {
      const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      if(!pathname.startsWith('/runstate-preview/'))throw new Error('Invalid mount');
      const name=pathname.slice('/runstate-preview/'.length)||'index.html';
      const target=path.resolve(dist,name);
      if(!target.startsWith(dist))throw new Error('Invalid path');
      const body=await readFile(target);
      response.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
      response.end(body);
    } catch {response.writeHead(404);response.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
  // Use the normal installed Chrome on Windows; CI can use Playwright's Chromium.
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chrome'}:{})});
});
after(async()=>{await browser?.close();await new Promise(resolve=>server?.close(resolve));});

async function open(t,options={}) {
  const context=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'no-preference',...options});
  t.after(()=>context.close());
  return context.newPage();
}
async function capture(page,name) {
  if(!process.env.RUNSTATE_OPENING_RECEIPTS)return;
  const directory=path.resolve(process.env.RUNSTATE_OPENING_RECEIPTS);
  await mkdir(directory,{recursive:true});
  await page.screenshot({path:path.join(directory,name),fullPage:true});
}
async function expectCompleteCover(page) {
  await page.waitForFunction(()=>{
    const cover=document.querySelector('.rs-opening-first-frame');
    return cover instanceof HTMLImageElement&&cover.complete&&cover.naturalWidth>0;
  });
  assert.match(await page.locator('.rs-opening-first-frame').getAttribute('src'),/^data:image\/webp;base64,/);
  assert.equal(await page.locator('.rs-opening-live').isVisible(),false,'Incomplete rows must never replace the complete cover');
}

test('one slow photo cannot expose a partial wall, then the complete rows move together',async t=>{
  const page=await open(t);
  let release;
  await page.route('**/media/opening/pick-06.webp',route=>{release=()=>route.continue();});
  await page.goto(`${origin}/runstate-preview/`,{waitUntil:'domcontentloaded'});
  await expectCompleteCover(page);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('.rs-opening-track img')).filter(image=>image.complete&&image.naturalWidth>0).length===64);
  await expectCompleteCover(page);
  await capture(page,'web-mobile-withheld-photo.png');
  await release();
  await page.locator('.rs-opening-live.is-ready').waitFor({state:'visible'});
  assert.equal(await page.locator('.rs-opening-track img').evaluateAll(images=>images.filter(image=>image.complete&&image.naturalWidth>0).length),66);
  const first=await page.locator('.rs-opening-track').evaluateAll(rows=>rows.map(row=>row.style.transform));
  await page.waitForTimeout(180);
  const next=await page.locator('.rs-opening-track').evaluateAll(rows=>rows.map(row=>row.style.transform));
  assert.ok(first.every((value,index)=>value&&value!==next[index]),`Every row must continue its original travel after the full-wall handoff: ${JSON.stringify({first,next})}`);
  await capture(page,'web-mobile-ready.png');
  await page.locator('.rs-opening-skip').click();
  await page.locator('.rs-start-screen').waitFor({state:'visible'});
});

test('a failed photo keeps the complete cover and the original automatic exit',async t=>{
  const page=await open(t);
  await page.route('**/media/opening/pick-06.webp',route=>route.abort('failed'));
  const started=Date.now();
  await page.goto(`${origin}/runstate-preview/`,{waitUntil:'domcontentloaded'});
  await expectCompleteCover(page);
  await page.waitForTimeout(250);
  await expectCompleteCover(page);
  await capture(page,'web-mobile-failed-photo.png');
  await page.locator('.rs-start-screen').waitFor({state:'visible',timeout:6500});
  assert.ok(Date.now()-started<6500,'Failure must not add an image-loading delay to the 4.8s opening');
});

test('Skip works while all moving photos are still loading',async t=>{
  const page=await open(t);
  await page.route('**/media/opening/*.webp',()=>{});
  await page.goto(`${origin}/runstate-preview/`,{waitUntil:'domcontentloaded'});
  await expectCompleteCover(page);
  await page.locator('.rs-opening-skip').click();
  await page.locator('.rs-start-screen').waitFor({state:'visible'});
  assert.equal(await page.locator('.rs-opening').count(),0);
});

test('reduced motion keeps complete rows stationary after readiness',async t=>{
  const page=await open(t,{reducedMotion:'reduce'});
  await page.goto(`${origin}/runstate-preview/`,{waitUntil:'domcontentloaded'});
  await page.locator('.rs-opening-live.is-ready').waitFor({state:'visible'});
  const first=await page.locator('.rs-opening-track').evaluateAll(rows=>rows.map(row=>row.style.transform));
  await page.waitForTimeout(180);
  const next=await page.locator('.rs-opening-track').evaluateAll(rows=>rows.map(row=>row.style.transform));
  assert.deepEqual(next,first);
  assert.ok(first.every(Boolean),'The initial row offsets must already be in place');
});
