import test, { after, before } from 'node:test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { preview } from 'vite';

let browser, server, address;
before(async () => {
  if (process.env.RUNSTATE_VERIFY_LIVE === '1') {
    address = 'https://manley-codes.github.io/runstate-preview/';
  } else {
    server = await preview({
      configFile: false, base: '/runstate-preview/', build: { outDir: 'dist' },
      preview: { host: '127.0.0.1', port: 0 }
    });
    address = `http://127.0.0.1:${server.httpServer.address().port}/runstate-preview/`;
  }
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'chrome' } : {});
});
after(async () => {
  await browser?.close();
  await server?.close();
});

async function expectDecodedArtwork(player, filename) {
  const artwork = player.locator('img.player-background-art');
  await expect.poll(() => artwork.evaluate(image => image.src)).toBe(new URL(`media/${filename}`, address).href);
  await expect(artwork).toBeVisible();
  await expect.poll(() => artwork.evaluate(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true);
  return artwork.getAttribute('src');
}

for (const [device, viewport] of Object.entries({
  phone: { width: 360, height: 740 }, desktop: { width: 1280, height: 900 }
})) {
  test(`${device}: music controls, both layouts and live metrics`, async t => {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    t.after(() => page.close());
    await page.goto(address + '#music');
    const player = page.locator('#circle-player');
    const previous = player.getByRole('button', { name: /previous/i });
    const next = player.getByRole('button', { name: /next/i });
    const title = player.locator('.player-metadata strong');
    await expect(player).toHaveAttribute('data-player-layout', 'headphones');
    await expectDecodedArtwork(player, 'start-music.jpg');
    const original = await title.innerText();
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(title).not.toHaveText(original);
    await previous.click();
    await expect(title).toHaveText(original);
    await player.getByRole('button', { name: /pause.*music/i }).click();
    await expect(player.getByRole('button', { name: /play.*music/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause run' })).toBeEnabled();
    for (const button of [previous, next]) {
      const zone = await button.boundingBox();
      const circle = await player.boundingBox();
      expect(zone.height).toBeGreaterThan(circle.height * 0.6);
    }
    await expect(page.getByText('Distance', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Average pace', { exact: true })).toBeVisible();
    const primary = await page.locator('.full-pace').boundingBox();
    const companion = await page.locator('.companion-pace').boundingBox();
    expect(primary.width).toBeGreaterThan(companion.width * 1.8);
    expect(primary.x + primary.width).toBeLessThan(companion.x);
    if (process.env.RUNSTATE_PREVIEW_RECEIPTS) {
      const dir = path.resolve(process.env.RUNSTATE_PREVIEW_RECEIPTS);
      await mkdir(dir, { recursive: true });
      await page.locator('.phone-frame').screenshot({ path: path.join(dir, device + '-music.png') });
    }
    await player.getByRole('button', { name: /close/i }).click();
    await expect(page.locator('[data-reading="distance"]')).toBeVisible();
    await expect(page.locator('.companion-pace')).toHaveCount(0);
    await expect(player).toHaveCount(0);
    await page.getByRole('button', { name: /appearance/i }).filter({ visible: true }).click();
    const settings = page.getByRole('dialog');
    await settings.getByRole('button', { name: 'Light', exact: true }).click();
    await settings.getByRole('button', { name: 'Album cover' }).click();
    await settings.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Open Spotify Music' }).click();
    await expect(player).toHaveAttribute('data-player-layout', 'album');
    await expect(page.locator('.phone-frame')).not.toHaveClass(/phone-dark/);
    const albumSources = [];
    for (const [index, [songTitle, filename]] of [
      ['Good as Hell', 'album-good-as-hell.jpg'],
      ['Lovely Day', 'album-lovely-day.jpg'],
      ['No Role Modelz', 'album-no-role-modelz.jpg'],
    ].entries()) {
      if (index > 0) await next.click();
      await expect(title).toHaveText(songTitle);
      albumSources.push(await expectDecodedArtwork(player, filename));
      if (process.env.RUNSTATE_PREVIEW_RECEIPTS) {
        const dir = path.resolve(process.env.RUNSTATE_PREVIEW_RECEIPTS);
        await mkdir(dir, { recursive: true });
        await page.locator('.phone-frame').screenshot({ path: path.join(dir, `${device}-${filename.replace(/\.jpg$/, '.png')}`) });
      }
    }
    expect(new Set(albumSources).size).toBe(3);
    await previous.click();
    await expect(title).toHaveText('Lovely Day');
    await expectDecodedArtwork(player, 'album-lovely-day.jpg');
    await previous.click();
    await expect(title).toHaveText('Good as Hell');
    await expectDecodedArtwork(player, 'album-good-as-hell.jpg');
    await page.reload();
    await expect(player).toHaveAttribute('data-player-layout', 'album');
    await expect(title).toHaveText('Good as Hell');
    await expectDecodedArtwork(player, 'album-good-as-hell.jpg');
  });
}

test('an unavailable album uses the player fallback and later artwork still loads', async t => {
  const page = await browser.newPage({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
  t.after(() => page.close());
  let blocked = 0;
  await page.route('**/media/album-good-as-hell.jpg', route => {
    blocked++;
    return route.abort();
  });
  await page.goto(address + '#music');
  const player = page.locator('#circle-player');
  async function chooseArtwork(label) {
    await player.getByRole('button', { name: /close/i }).click();
    await page.getByRole('button', { name: /appearance/i }).filter({ visible: true }).click();
    const settings = page.getByRole('dialog');
    await settings.getByRole('button', { name: label, exact: true }).click();
    await settings.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Open Spotify Music' }).click();
  }
  await chooseArtwork('Album cover');
  await expect.poll(() => blocked).toBeGreaterThan(0);
  await expect(player.locator('img.player-background-art')).toHaveCount(0);
  await expect(player.locator('.player-surface')).toBeVisible();
  await expect(player.locator('.player-metadata strong')).toHaveText('Good as Hell');
  await expect(player.getByRole('button', { name: /pause.*music/i })).toBeEnabled();
  await player.getByRole('button', { name: /next/i }).click();
  await expect(player.locator('.player-metadata strong')).toHaveText('Lovely Day');
  await expectDecodedArtwork(player, 'album-lovely-day.jpg');
  await player.getByRole('button', { name: /previous/i }).click();
  await expect(player.locator('.player-metadata strong')).toHaveText('Good as Hell');
  await expect(player.locator('img.player-background-art')).toHaveCount(0);
  await chooseArtwork('Headphones');
  await expect(player).toHaveAttribute('data-player-layout', 'headphones');
  await expectDecodedArtwork(player, 'start-music.jpg');
});

test('Start energy tiles enter in order, settle, and honor reduced motion', async t => {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, reducedMotion: 'no-preference' });
  t.after(() => page.close());
  await page.addInitScript(() => {
    window.tileEntries = [];
    document.addEventListener('animationstart', event => {
      if (event.animationName === 'rs-start-entry-travel') window.tileEntries.push(event.target.getAttribute('aria-label'));
    });
  });
  await page.goto(address + '#start');
  await expect.poll(() => page.evaluate(() => window.tileEntries)).toEqual(['Low pre-run energy','Moderate pre-run energy','High pre-run energy']);
  await expect(page.locator('.rs-start-energy-choices')).not.toHaveClass(/is-entering/);
  await expect(page.getByRole('button', { name: 'High pre-run energy' })).toBeEnabled();
  const accent = page.locator('.rs-start-dial line[stroke="#f5be37"]');
  await expect(accent).toHaveAttribute('stroke-width', '4');
  await expect(accent).toHaveAttribute('stroke-linecap', 'butt');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();
  await expect(page.getByRole('button', { name: 'High pre-run energy' })).toBeEnabled();
  await expect(page.locator('.rs-start-energy-choices')).not.toHaveClass(/is-entering/);
  expect(await page.evaluate(() => window.tileEntries)).toEqual([]);
});

test('saved-run actions apply to one example and survive screen navigation', async t => {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  t.after(() => page.close());
  await page.goto(address + '#history');
  const records = page.locator('.nh-record');
  await expect(records).toHaveCount(3);
  const first = records.first();
  await first.locator('.nh-record-toggle').click();
  await expect(first.getByText(/Reflection song ·/)).toBeVisible();
  async function requestDelete() {
    await first.getByLabel('Run options').click();
    await page.getByText('Delete run', { exact: true }).click();
    return page.getByRole('dialog', { name: /delete this run/i });
  }
  let dialog = await requestDelete();
  await dialog.getByRole('button', { name: /cancel/i }).click();
  await expect(records).toHaveCount(3);
  dialog = await requestDelete();
  await dialog.getByRole('button', { name: /delete/i }).click();
  await expect(records).toHaveCount(2);
  await page.getByRole('button', { name: 'Back to run' }).click();
  await page.goto(address + '#history');
  await expect(records).toHaveCount(2);
});
