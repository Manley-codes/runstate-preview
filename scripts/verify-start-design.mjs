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
  test(`${device}: light Start, ordered controls and retained navigation`,async t=>{
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    t.after(()=>page.close());
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(address+'#start');
    await page.evaluate(()=>document.fonts.ready);
    const start=page.locator('.rs-start-run'),shoe=page.locator('.rs-start-shoes'),music=page.locator('.rs-start-music');
    const choices=page.locator('.rs-start-energy-choices'),trail=page.locator('.rs-start-trails-card'),greeting=page.locator('.rs-start-greeting');
    await expect(start).toBeVisible();await expect(shoe).toBeVisible();await expect(music).toBeVisible();
    await expect(choices.getByRole('button')).toHaveCount(3);
    await expect(choices.locator('small')).toHaveText(['Running low','Steady','Energized']);
    await expect(greeting).toHaveText(/^Good (morning|afternoon|evening), Alex$/);
    await expect(page.locator('.rs-start-screen').getByText('Start Run',{exact:true})).toBeVisible();
    await expect(page.locator('.rs-start-screen').getByText('GPS Ready',{exact:true})).toBeVisible();
    const navigation=page.locator('.rs-start-screen nav');
    await expect(navigation.getByRole('button')).toHaveText(['Shoes','Goal','Run','Settings','Activity']);
    const [startBox,choiceBox,trailBox,musicBox,greetingBox,navBox]=await Promise.all([start.boundingBox(),choices.boundingBox(),trail.boundingBox(),music.boundingBox(),greeting.boundingBox(),navigation.boundingBox()]);
    expect(trailBox.y+trailBox.height).toBeLessThan(musicBox.y);
    expect(musicBox.y+musicBox.height).toBeLessThan(greetingBox.y);
    expect(greetingBox.y+greetingBox.height).toBeLessThan(choiceBox.y);
    expect(choiceBox.y+choiceBox.height).toBeLessThanOrEqual(startBox.y+1);
    expect(startBox.y+startBox.height).toBeLessThan(navBox.y);
    expect(Math.abs((startBox.x+startBox.width/2)-(choiceBox.x+choiceBox.width/2))).toBeLessThan(2);
    await expect(page.getByRole('button',{name:'Explore trails',exact:true})).toBeVisible();
    await expect(trail.locator('img')).toHaveCount(1);
    await expect(trail.locator('img')).not.toHaveAttribute('src',/map/);
    await expect(page.locator('.rs-trail-background,.rs-start-footer-shape,.rs-start-map-wash')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Plan this run',exact:true})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const modColor=await choices.locator('.energy-moderate svg').evaluate(el=>getComputedStyle(el).color);
    expect(modColor).toBe('rgb(255, 255, 255)');
    await capture(page,device+'-start-current');
    await navigation.getByRole('button',{name:'Log History',exact:true}).click();
    await expect(page.locator('.phone-screen')).toHaveAttribute('data-screen','history');
    expect(errors).toEqual([]);
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
  await page.getByRole('button',{name:'Start run',exact:true}).click();
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

test('the fictional greeting follows local morning, afternoon and evening boundaries',async t=>{
  for(const [hour,period] of [[4,'evening'],[5,'morning'],[11,'morning'],[12,'afternoon'],[16,'afternoon'],[17,'evening']]){
    const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'});
    t.after(()=>page.close());
    // Isolate the local-hour input without changing animation timers or Date.now.
    await page.addInitScript(value=>{Date.prototype.getHours=function(){return value;};},hour);
    await page.goto(address+'#start');
    await expect(page.locator('.rs-start-greeting')).toHaveText(`Good ${period}, Alex`);
    await page.close();
  }
});

test('the Start Spotify badge leads to the silent sample player without connected requests',async t=>{
  const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'});
  t.after(()=>page.close());
  const outside=[];
  const origin=new URL(address).origin;
  page.on('request',request=>{if(/^https?:/.test(request.url())&&new URL(request.url()).origin!==origin)outside.push(request.url());});
  await page.goto(address+'#start');
  await page.locator('.rs-start-music').click();
  await expect(page.getByRole('dialog')).toContainText('silent example controls');
  await page.getByRole('button',{name:'Explore the player'}).click();
  await expect(page.locator('.phone-screen')).toHaveAttribute('data-screen','music');
  await expect(page.locator('audio,video,iframe')).toHaveCount(0);
  expect(outside).toEqual([]);
});

test('a preview name stays on this browser and can be cleared to a generic greeting',async t=>{
  const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'reduce'});
  t.after(()=>page.close());
  await page.addInitScript(()=>{Date.prototype.getHours=function(){return 12;};});
  await page.goto(address+'#start');
  await page.getByRole('button',{name:'Run settings',exact:true}).click();
  const settings=page.getByRole('dialog');
  const name=settings.getByRole('textbox',{name:'Your name (optional)',exact:true});
  await name.fill('Jamie');
  const writes=[];page.on('request',request=>{if(request.method()!=='GET')writes.push(request.url());});
  await settings.getByRole('button',{name:'Save name',exact:true}).click();
  if(await settings.isVisible())await settings.getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.locator('.rs-start-greeting')).toHaveText('Good afternoon, Jamie');
  await page.reload();
  await expect(page.locator('.rs-start-greeting')).toHaveText('Good afternoon, Jamie');
  await page.getByRole('button',{name:'Run settings',exact:true}).click();
  await name.fill('');
  await settings.getByRole('button',{name:'Save name',exact:true}).click();
  if(await settings.isVisible())await settings.getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.locator('.rs-start-greeting')).toHaveText('Good afternoon');
  await page.reload();
  await expect(page.locator('.rs-start-greeting')).toHaveText('Good afternoon');
  expect(writes).toEqual([]);
});

test('energy selection arrives without shifting the layout and can be changed; ring honors reduced motion',async t=>{
  const page=await browser.newPage({viewport:{width:393,height:852},reducedMotion:'no-preference'});
  t.after(()=>page.close());
  await page.goto(address+'#start');
  const choices=page.locator('.rs-start-energy-choices'),ring=page.locator('.rs-start-agent-ring');
  await expect(choices).not.toHaveClass(/is-entering/);
  const before=await page.locator('.rs-start-greeting').boundingBox();
  await choices.getByRole('button',{name:'Moderate pre-run energy',exact:true}).click();
  await expect(ring).toBeEnabled();
  await expect(ring).toHaveAccessibleName('Moderate energy selected. Change energy');
  await expect(page.getByRole('button',{name:'Start run',exact:true})).toBeEnabled();
  await expect(page.locator('.rs-start-intake-overlay')).toHaveCount(0,{timeout:5000});
  const after=await page.locator('.rs-start-greeting').boundingBox();
  expect(Math.abs(before.y-after.y)).toBeLessThan(1);
  await ring.click();
  await expect(choices.getByRole('button',{name:'High pre-run energy',exact:true})).toBeEnabled();
  await expect(ring).toBeDisabled();
  const firstLine=ring.locator('line').first();
  const moving=await firstLine.getAttribute('y2');
  await expect.poll(()=>firstLine.getAttribute('y2')).not.toBe(moving);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(80);
  const still=await firstLine.getAttribute('y2');
  await page.waitForTimeout(300);
  expect(await firstLine.getAttribute('y2')).toBe(still);
});
