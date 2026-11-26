import test, { after, before } from 'node:test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { preview } from 'vite';

let browser, server, address;
before(async () => {
  if (process.env.RUNSTATE_VERIFY_LIVE === '1') address='https://manley-codes.github.io/runstate-preview/';
  else {
    server=await preview({configFile:false,base:'/runstate-preview/',build:{outDir:'dist'},preview:{host:'127.0.0.1',port:0}});
    address=`http://127.0.0.1:${server.httpServer.address().port}/runstate-preview/`;
  }
  browser=await chromium.launch(process.platform==='win32'?{channel:'chrome'}:{});
});
after(async()=>{await browser?.close();await server?.close();});

const places=[
  ['Memorial Park','Seymour Lieberman Trail','CC BY 2.0'],
  ['Hermann Park','Marvin Taylor Trail','Public domain'],
  ['Buffalo Bayou Park','Trails along the bayou','CC BY-SA 4.0'],
  ['Terry Hershey Park','Wooded trails along Buffalo Bayou','Public domain'],
];
async function capture(page,name){
  if(!process.env.RUNSTATE_PREVIEW_RECEIPTS)return;
  const dir=path.resolve(process.env.RUNSTATE_PREVIEW_RECEIPTS);await mkdir(dir,{recursive:true});
  await page.locator('.phone-frame').screenshot({path:path.join(dir,`${name}.png`)});
}
async function changeBackground(page,label){
  await page.getByRole('button',{name:'Run settings',exact:true}).click();
  const settings=page.getByRole('dialog');
  await settings.getByRole('button',{name:label,exact:true}).click();
  await expect(settings.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-pressed','true');
  await settings.getByRole('button',{name:'Done',exact:true}).click();
}
async function position(page){
  return page.locator('.rs-trail-track').evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);
}
async function decodedImages(locator){
  await expect.poll(()=>locator.evaluateAll(images=>images.length>0&&images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
}

for(const [device,viewport] of Object.entries({phone:{width:360,height:740},desktop:{width:1280,height:900}})){
  test(`${device}: four public trails, credits, safe navigation and original background`,async t=>{
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});t.after(()=>page.close());
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(address+'#start');
    await expect(page.locator('.rs-trail-background')).toHaveCount(0);
    await capture(page,device+'-hermann-start');
    await page.locator('.rs-start-trails-pill').click();
    const dialog=page.getByRole('dialog',{name:'Houston trails',exact:true});
    await expect(dialog.getByRole('heading',{name:'Houston trails',exact:true})).toBeVisible();
    await expect(dialog.locator('.rs-trail-list>button')).toHaveCount(4);
    await decodedImages(dialog.locator('.rs-trail-list img'));
    await capture(page,device+'-trails-browser');
    for(const [name,description,license] of places){
      await dialog.locator('.rs-trail-list').getByRole('button',{name:new RegExp(name)}).click();
      await expect(dialog.getByRole('heading',{name,exact:true})).toBeVisible();
      await expect(dialog.getByRole('button',{name:'Back to Houston trails',exact:true})).toBeFocused();
      await expect(dialog.getByRole('heading',{name:description,exact:true})).toBeVisible();
      await decodedImages(dialog.locator('.rs-trail-detail img'));
      await expect(dialog.getByRole('link',{name:'Original photograph',exact:true})).toHaveAttribute('href',/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      await expect(dialog.getByRole('link',{name:license,exact:true})).toHaveAttribute('href',/^https:\/\//);
      await expect(dialog.getByRole('link',{name:'OpenStreetMap contributors',exact:true})).toHaveAttribute('href','https://www.openstreetmap.org/copyright');
      await expect(dialog.getByRole('link',{name:'Visit park website ↗',exact:true})).toHaveAttribute('rel',/noreferrer/);
      await expect(dialog.getByRole('button',{name:/plan/i})).toHaveCount(0);
      if(name==='Buffalo Bayou Park'){
        await expect(dialog.locator('.rs-trail-credits')).toContainText('This photo and display crop remain under CC BY-SA 4.0');
        await capture(page,device+'-trail-detail');
      }
      await dialog.getByRole('button',{name:'Back to Houston trails',exact:true}).click();
      await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeFocused();
    }
    await expect(dialog.getByRole('link',{name:'More places around Houston ↗',exact:true})).toHaveAttribute('href','https://www.visithoustontexas.com/blog/post/healthy-in-houston/');
    await dialog.getByRole('button',{name:'Close',exact:true}).click();
    await expect(page.locator('.rs-start-trails-pill')).toBeFocused();
    await changeBackground(page,'Houston trails');
    await expect(page.locator('.rs-trail-background')).toBeVisible();
    await decodedImages(page.locator('.rs-trail-band img'));
    const still=await position(page);await page.waitForTimeout(450);expect(await position(page)).toBe(still);
    await expect(page.locator('.rs-trail-background')).toHaveAttribute('aria-hidden','true');
    await expect(page.locator('.rs-trail-background button')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Start',exact:true})).toBeEnabled();
    await capture(page,device+'-trails-start');
    await changeBackground(page,'Hermann Park');
    await expect(page.locator('.rs-trail-background')).toHaveCount(0);
    await expect(page.locator('.rs-start-trails-pill')).toBeVisible();
    await expect(page.locator('[data-screen="start"]')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });

  test(`${device}: smooth movement, sheet pause, pointer drag and reduced motion`,async t=>{
    const page=await browser.newPage({viewport,reducedMotion:'no-preference'});t.after(()=>page.close());
    await page.addInitScript(()=>localStorage.setItem('runstate-public-background','trails'));
    await page.goto(address+'#start');
    await expect(page.locator('.rs-trail-background')).toBeVisible();
    await page.waitForTimeout(250);
    const start=await position(page);await page.waitForTimeout(550);const moved=await position(page);
    expect(start-moved).toBeGreaterThan(.5);expect(start-moved).toBeLessThan(6);
    const samples=await page.locator('.rs-trail-track').evaluate(el=>new Promise(resolve=>{
      const positions=[];const step=()=>{positions.push(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);if(positions.length<16)requestAnimationFrame(step);else resolve(positions);};requestAnimationFrame(step);
    }));
    expect(new Set(samples.map(value=>value.toFixed(4))).size).toBeGreaterThan(8);
    await page.locator('.rs-start-trails-pill').click();
    await page.waitForTimeout(100);const held=await position(page);await page.waitForTimeout(400);expect(await position(page)).toBe(held);
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
    await expect.poll(()=>position(page)).toBeLessThan(held-.1);
    await page.emulateMedia({reducedMotion:'reduce'});
    const reduced=await position(page);await page.waitForTimeout(450);expect(await position(page)).toBe(reduced);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(()=>position(page)).toBeLessThan(reduced-.1);
    const bg=page.locator('.rs-trail-background'),bounds=await bg.boundingBox();
    const size=await bg.evaluate(el=>({height:el.clientHeight,width:el.clientWidth}));
    const x=bounds.x+bounds.width*(130/size.width),y=bounds.y+bounds.height*(350/size.height);
    const beforeDrag=await position(page);
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-bounds.height*(60/size.height),{steps:12});await page.mouse.up();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const afterDrag=await position(page);expect(beforeDrag-afterDrag).toBeGreaterThan(40);
    await page.waitForTimeout(450);expect(await position(page)).toBe(afterDrag);
    await page.mouse.click(x,y);
    await expect(page.getByRole('dialog',{name:'Houston trails',exact:true})).toBeVisible();
    await expect(page.locator('.rs-trail-detail-photo')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}
