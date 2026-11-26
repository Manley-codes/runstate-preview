import test, {after, before} from 'node:test';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium, expect} from '@playwright/test';
import {preview} from 'vite';

let browser, server, address;
before(async()=>{
  if(process.env.RUNSTATE_VERIFY_LIVE==='1')address='https://manley-codes.github.io/runstate-preview/';
  else {
    server=await preview({configFile:false,base:'/runstate-preview/',build:{outDir:'dist'},preview:{host:'127.0.0.1',port:0}});
    address=`http://127.0.0.1:${server.httpServer.address().port}/runstate-preview/`;
  }
  browser=await chromium.launch(process.platform==='win32'?{channel:'chrome'}:{});
});
after(async()=>{await browser?.close();await server?.close();});

async function capture(page,name){
  if(!process.env.RUNSTATE_PREVIEW_RECEIPTS)return;
  const directory=path.resolve(process.env.RUNSTATE_PREVIEW_RECEIPTS);
  await mkdir(directory,{recursive:true});
  await page.locator('.phone-frame').screenshot({path:path.join(directory,name+'.png')});
}
async function openGoal(page){
  await page.locator('.rs-start-screen nav').getByRole('button',{name:/goal/i}).click();
  await expect(page.locator('.rs-goal-panel')).toBeVisible();
}
async function openShoes(page){
  await page.locator('.rs-start-shoes').click();
  await expect(page.getByRole('heading',{name:'Select Your Brand',exact:true})).toBeVisible();
}

for(const [device,viewport] of Object.entries({phone:{width:360,height:740},desktop:{width:1280,height:900}})){
  test(`${device}: current Start layout, retained scenery and navigation`,async t=>{
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    t.after(()=>page.close());
    await page.goto(address+'#start');
    await page.evaluate(()=>document.fonts.ready);
    const start=page.locator('.rs-start-run'),shoe=page.locator('.rs-start-shoes'),music=page.locator('.rs-start-music');
    const choices=page.locator('.rs-start-energy-choices');
    await expect(start).toBeVisible();await expect(shoe).toBeVisible();await expect(music).toBeVisible();
    await expect(choices.getByRole('button')).toHaveCount(3);
    const [a,b,c,d]=await Promise.all([start.boundingBox(),shoe.boundingBox(),music.boundingBox(),choices.boundingBox()]);
    expect(b.x+b.width/2).toBeLessThan(a.x+a.width/2);
    expect(c.x+c.width/2).toBeGreaterThan(a.x+a.width/2);
    expect(b.y+b.height/2).toBeLessThan(a.y);
    expect(c.y+c.height/2).toBeLessThan(a.y);
    expect(d.y).toBeGreaterThanOrEqual(a.y+a.height-3);
    // The three controls are icons; optional labels belong to accessible names only.
    for(const control of [start,shoe,music])await expect(control).toHaveText('');
    await expect(page.locator('.rs-start-footer-shape')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Plan this run',exact:true})).toHaveCount(0);
    const navigation=page.locator('.rs-start-screen nav');
    await expect(navigation.getByRole('button')).toHaveText(['Map','Goal','Run','Settings','Activity']);
    const navBox=await navigation.boundingBox();expect(navBox.y).toBeGreaterThan(d.y+d.height);
    await expect(page.getByRole('button',{name:/Houston trails/i})).toBeVisible();
    await capture(page,device+'-start-current');
    await navigation.getByRole('button',{name:'Log History',exact:true}).click();
    await expect(page.locator('.phone-screen')).toHaveAttribute('data-screen','history');
  });

  test(`${device}: Goal defaults, invalid values, saved targets and canceled drafts`,async t=>{
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    t.after(()=>page.close());
    await page.goto(address+'#start');
    await openGoal(page);
    const goal=page.locator('.rs-goal-panel');
    await expect(goal.getByRole('textbox',{name:'Distance goal',exact:true})).toHaveValue('3');
    await expect(goal.getByRole('combobox',{name:'Distance unit'})).toHaveValue('mi');
    await expect(goal.getByRole('button',{name:'Remove goal',exact:true})).toHaveCount(0);
    const distance=await goal.getByRole('button',{name:'Distance',exact:true}).boundingBox();
    const time=await goal.getByRole('button',{name:'Time',exact:true}).boundingBox();
    const entry=await goal.locator('.rs-goal-entry').boundingBox();
    expect(time.y).toBeGreaterThan(distance.y+distance.height);
    expect(Math.abs(distance.width-time.width)).toBeLessThan(2);
    expect(Math.abs(distance.width-entry.width)).toBeLessThan(2);
    expect(Math.abs(distance.height-time.height)).toBeLessThan(2);
    expect(Math.abs(distance.height-entry.height)).toBeLessThan(2);
    await capture(page,device+'-goal-distance');
    await goal.getByRole('textbox',{name:'Distance goal',exact:true}).fill('0');
    await expect(goal.getByRole('button',{name:'Save goal',exact:true})).toBeDisabled();
    await expect(goal.getByRole('textbox',{name:'Distance goal',exact:true})).toHaveAttribute('aria-invalid','true');
    await goal.getByRole('button',{name:'Time',exact:true}).click();
    const clock=goal.getByRole('textbox',{name:'Active time goal in hours and minutes',exact:true});
    await expect(clock).toHaveValue('00:30');
    await capture(page,device+'-goal-time');
    await clock.fill('00:99');
    await expect(goal.getByRole('button',{name:'Save goal',exact:true})).toBeDisabled();
    await clock.fill('00:30');
    await goal.getByRole('button',{name:'Save goal',exact:true}).click();
    await expect(goal).toHaveCount(0);
    await openGoal(page);
    await expect(goal.getByRole('button',{name:'Time',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(clock).toHaveValue('00:30');
    await clock.fill('01:00');
    await goal.getByRole('button',{name:'Close',exact:true}).click();
    await openGoal(page);
    await expect(clock).toHaveValue('00:30');
    await goal.getByRole('button',{name:'Remove goal',exact:true}).click();
    await expect(goal).toHaveCount(0);
    await openGoal(page);
    await expect(goal.getByRole('textbox',{name:'Distance goal',exact:true})).toHaveValue('3');
    await expect(goal.getByRole('button',{name:'Remove goal',exact:true})).toHaveCount(0);
    await goal.getByRole('button',{name:'Save goal',exact:true}).click();
    await openGoal(page);
    await expect(goal.getByRole('textbox',{name:'Distance goal',exact:true})).toHaveValue('3');
    await expect(goal.getByRole('button',{name:'Remove goal',exact:true})).toBeVisible();
  });

  test(`${device}: shoes use all brands, require a target and preserve saved pairs`,async t=>{
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    t.after(()=>page.close());
    await page.goto(address+'#start');await openShoes(page);
    const picker=page.locator('.rs-shoe-picker');
    await expect(picker.locator('.rs-shoe-picker-brand')).toHaveCount(26);
    await expect(picker.getByRole('img')).toHaveCount(0);
    await capture(page,device+'-shoe-brands');
    const list=picker.locator('.rs-shoe-picker-list');
    await list.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await list.hover();
    const headerTop=(await picker.locator('.rs-shoe-picker-heading').boundingBox()).y;
    await page.mouse.wheel(0,1500);await page.mouse.wheel(0,1500);
    expect(Math.abs((await picker.locator('.rs-shoe-picker-heading').boundingBox()).y-headerTop)).toBeLessThan(2);
    await picker.getByRole('textbox',{name:'Search brands or shoes',exact:true}).fill('Nike');
    await expect(picker.locator('.rs-shoe-picker-brand')).toHaveCount(1);
    await picker.getByRole('button',{name:'Nike',exact:true}).click();
    await picker.getByRole('textbox',{name:'Search Nike',exact:true}).fill('Pegasus 42');
    await picker.getByRole('button',{name:'Pegasus 42',exact:true}).click();
    const mileage=picker.getByRole('textbox',{name:'Mileage goal (required)',exact:true});
    await expect(mileage).toHaveValue('');
    await expect(picker.getByRole('button',{name:'Add and select',exact:true})).toBeDisabled();
    await mileage.fill('-5');
    await expect(picker.getByRole('button',{name:'Add and select',exact:true})).toBeDisabled();
    await mileage.fill('400');
    await capture(page,device+'-shoe-mileage');
    await picker.getByRole('button',{name:'Add and select',exact:true}).click();
    await expect(picker).toHaveCount(0);
    await openShoes(page);
    await picker.getByRole('button',{name:'Nike',exact:true}).click();
    await picker.getByRole('button',{name:'Select Pegasus 42',exact:true}).click();
    await expect(mileage).toHaveValue('400');
    await mileage.fill('500');
    await picker.getByRole('button',{name:'Close',exact:true}).click();
    await openShoes(page);
    await picker.getByRole('button',{name:'Nike',exact:true}).click();
    await picker.getByRole('button',{name:'Select Pegasus 42',exact:true}).click();
    await expect(mileage).toHaveValue('400');
    await picker.getByRole('button',{name:'Back',exact:true}).click();
    await picker.getByRole('button',{name:'Archive',exact:true}).click();
    await expect(picker.getByRole('button',{name:'Select Pegasus 42',exact:true})).toHaveCount(0);
    await picker.getByRole('button',{name:'Undo',exact:true}).click();
    await expect(picker.getByRole('button',{name:'Select Pegasus 42',exact:true})).toBeVisible();
    await picker.getByRole('button',{name:'Add different shoes',exact:true}).click();
    await picker.getByRole('textbox',{name:'Model',exact:true}).fill('Sample pair');
    await mileage.fill('300');
    await picker.getByRole('button',{name:'Add and select',exact:true}).click();
    await openShoes(page);
    await picker.getByRole('button',{name:'Nike',exact:true}).click();
    await expect(picker.getByRole('button',{name:'Select Sample pair',exact:true})).toBeVisible();
    await expect(picker.getByRole('button',{name:'Select Pegasus 42',exact:true})).toBeVisible();
  });
}


test('a saved goal travels through countdown, completion and History',async t=>{
  const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'});
  t.after(()=>page.close());
  await page.goto(address+'#start');
  await openGoal(page);
  await page.getByLabel('Distance goal',{exact:true}).fill('1');
  await page.getByRole('button',{name:'Save goal',exact:true}).click();
  await page.getByRole('button',{name:'Start',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pause run',exact:true})).toBeEnabled({timeout:15000});
  await page.getByRole('button',{name:'Pause run',exact:true}).click();
  const finish=page.getByRole('button',{name:'Hold to finish sample run'});
  await expect(finish).toBeEnabled();
  await finish.focus();await page.keyboard.down('Enter');
  await expect(page.locator('.cp-goal-result')).toHaveText('Goal · 1 mi · Reached');
  await page.keyboard.up('Enter');
  await page.getByRole('button',{name:'Save Activity',exact:true}).click();
  await expect(page.locator('.cp-goal-result')).toHaveText('Goal · 1 mi · Reached');
  await page.getByRole('button',{name:'View in Log History',exact:true}).click();
  const first=page.locator('.nh-record').first();
  if(await first.locator('.nh-record-toggle').getAttribute('aria-expanded')!=='true')await first.locator('.nh-record-toggle').click();
  await expect(first.getByText('Goal · 1 mi · Reached',{exact:true})).toBeVisible();
});
