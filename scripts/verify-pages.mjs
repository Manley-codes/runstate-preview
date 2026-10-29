import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Read the built artifact, not a development server: GitHub Pages publishes these
// files beneath a repository path, where a mistaken /media URL silently breaks.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const source = path.join(root, 'preview-src/src');
const mount = new URL('https://manley-codes.github.io/runstate-preview/');
const entries = ['index.html', 'start.html', 'complete.html', 'log.html'];
const resourceExtension = /\.(?:m?js|css|ttf|otf|woff2?|webp|jpe?g|png|gif|svg|avif)(?:[?#].*)?$/i;
const relativeResource = /^(?:\.\.?\/|\/)/;

async function walk(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), `Published/source symlink needs explicit review: ${prefix}${entry.name}`);
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(path.join(directory, entry.name), `${name}/`));
    else files.push(name);
  }
  return files.sort();
}

async function textAt(directory, name) {
  return readFile(path.join(directory, ...name.split('/')), 'utf8');
}

function artifactPath(reference, parent) {
  const url = new URL(reference, new URL(parent, mount));
  assert.equal(url.origin, mount.origin, `Remote runtime resource: ${reference} from ${parent}`);
  assert.ok(url.pathname.startsWith(mount.pathname), `Resource escapes /runstate-preview/: ${reference} from ${parent}`);
  const name = decodeURIComponent(url.pathname.slice(mount.pathname.length));
  assert.ok(!name.includes('\\') && !name.split('/').includes('..'), `Unsafe artifact path: ${name}`);
  return name || 'index.html';
}

async function expectResource(reference, parent) {
  if (/^(?:data:|#)/i.test(reference)) return null;
  const name = artifactPath(reference, parent);
  const info = await stat(path.join(dist, ...name.split('/'))).catch(() => null);
  assert.ok(info?.isFile() && info.size > 0, `Missing/empty resource: ${reference} from ${parent} → ${name}`);
  return name;
}

function htmlResources(html) {
  return [...html.matchAll(/<(?:script|link|img|source)\b[^>]*>/gi)]
    .flatMap(([tag]) => [...tag.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]));
}

function cssResources(css) {
  return [...css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)].map(match => match[1]);
}

function jsResources(js) {
  // Vite emits quoted relative chunk/resource names. Dynamic media names are
  // verified separately against the emitted asset helper and source inventory.
  return [...js.matchAll(/(["'`])([^"'`\r\n]*)\1/g)]
    .map(match => match[2]).filter(value => relativeResource.test(value) && resourceExtension.test(value));
}

test('entrypoints and every emitted local dependency resolve under the Pages repository path', async () => {
  const index = await textAt(dist, 'index.html');
  assert.match(index, /<script\b[^>]*type="module"/i, 'The production module entry is missing');
  assert.doesNotMatch(index, /(?:\/src\/|@vite\/client|localhost|127\.0\.0\.1)/i, 'Development entry leaked into export');
  for (const entry of entries) {
    const html = await textAt(dist, entry);
    assert.equal(html, index, `Legacy entry ${entry} does not load the same current app`);
    for (const reference of htmlResources(html)) await expectResource(reference, entry);
  }
  const files = await walk(dist);
  let checked = 0;
  for (const file of files) {
    let references = [];
    if (file.endsWith('.html')) references = htmlResources(await textAt(dist, file));
    if (file.endsWith('.css')) references = cssResources(await textAt(dist, file));
    if (/\.m?js$/.test(file)) references = jsResources(await textAt(dist, file));
    for (const reference of references) {
      await expectResource(reference, file);
      checked++;
    }
  }
  assert.ok(checked >= 10, `Asset traversal unexpectedly found only ${checked} references`);
  assert.ok((await stat(path.join(dist, '.nojekyll'))).isFile());
  const archive = await textAt(dist, 'history/index.html');
  assert.match(archive, /earlier stage, not the current Android app/i);
  assert.equal(artifactPath('../index.html', 'history/index.html'), 'index.html');
});

test('dynamic media paths and all credited opening photographs survive the exported subpath', async () => {
  const files = await walk(dist);
  const bundles = await Promise.all(files.filter(file => /\.m?js$/.test(file)).map(file => textAt(dist, file)));
  const js = bundles.join('\n');
  const helperBases = [...js.matchAll(/=>\s*`([^`]*media\/)\$\{[\w$]+\}`/g)].map(match => match[1]);
  assert.ok(helperBases.length > 0, 'Cannot verify the emitted dynamic media helper; update this check if its output shape changes');
  const mediaNames = new Set();
  for (const file of await walk(source)) {
    if (!/\.[jt]sx?$/.test(file)) continue;
    for (const match of (await textAt(source, file)).matchAll(/\basset\(\s*["']([^"']+)["']\s*\)/g)) mediaNames.add(match[1]);
  }
  const manifest = JSON.parse(await textAt(dist, 'media/opening-photo-sources.json'));
  assert.equal(manifest.photos.length, 33, 'The accepted opening photo collection is incomplete');
  for (const photo of manifest.photos) {
    mediaNames.add(photo.assetPath);
    assert.ok(photo.photographer && photo.provider && /^https:\/\//.test(photo.sourcePageUrl), `Missing credit for ${photo.id}`);
    const bytes = await readFile(path.join(dist, 'media', ...photo.assetPath.split('/')));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), photo.sha256, `Photo differs from its credited asset: ${photo.id}`);
  }
  // Check template-generated references as well as literals. A missing collage
  // tile would otherwise appear only after a row scrolls to that image.
  const opening = await textAt(source, 'OpeningStart.tsx');
  for (const match of opening.matchAll(/\{id:'([^']+)',width:/g)) {
    const name = `opening/${match[1]}.webp`;
    assert.ok(mediaNames.has(name), `Opening tile has no source credit: ${name}`);
  }
  assert.ok(mediaNames.has('start-music.jpg') && mediaNames.has('spotify-icon-white.svg'));
  for (const base of helperBases) for (const entry of entries) for (const name of mediaNames) await expectResource(`${base}${name}`, entry);
});

test('fonts, license notices, artwork and attribution metadata are bundled locally', async () => {
  const fonts = ['anton.ttf', 'barlow-medium.ttf', 'barlow-condensed-regular.ttf', 'fonts/barlow-condensed-medium.ttf'];
  for (const font of fonts) {
    const bytes = await readFile(path.join(dist, 'media', ...font.split('/')));
    assert.ok(bytes.length > 1000, `Empty/truncated font: ${font}`);
    assert.ok(bytes.readUInt32BE(0) === 0x00010000 || bytes.subarray(0, 4).toString() === 'OTTO', `Invalid font header: ${font}`);
  }
  const licenses = await walk(path.join(dist, 'media/licenses'));
  assert.ok(licenses.length >= 3, 'Anton, Barlow and Barlow Condensed notices must be included');
  let combined = '';
  for (const license of licenses) combined += await textAt(path.join(dist, 'media/licenses'), license);
  assert.match(combined, /SIL OPEN FONT LICENSE/i);
  assert.match(combined, /Anton/i);
  assert.match(combined, /Barlow/i);
  for (const name of ['start-music.jpg', 'start-map.jpg', 'history-running-trail.jpg', 'spotify-icon-white.svg']) await expectResource(`./media/${name}`, 'index.html');
});

test('export contains no private run files, audio, credentials, source maps or local machine paths', async () => {
  const files = await walk(dist);
  const allowed = /(?:\.html|\.m?js|\.css|\.ttf|\.otf|\.woff2?|\.webp|\.jpe?g|\.png|\.svg|\.json|\.txt|\.md)$/i;
  const credentialPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:sk-proj-|sk_live_|sk_test_|ghp_|github_pat_)[A-Za-z0-9_-]{15,}\b/,
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
    /["']?(?:api[_-]?key|client[_-]?secret|refresh[_-]?token|access[_-]?token)["']?\s*[:=]\s*["'][^"']{12,}["']/i,
  ];
  for (const file of files) {
    assert.ok(file === '.nojekyll' || allowed.test(file), `Unreviewed file type in public artifact: ${file}`);
    assert.doesNotMatch(file, /(?:^|\/)(?:\.env(?:\.|$)|credentials?|secrets?|.*\.(?:db|sqlite3?|gpx|tcx|fit|mp[34]|wav|zip|bak|map)$)/i, `Private/unnecessary file in export: ${file}`);
    if (!/\.(?:html|m?js|css|json|txt|md|svg)$/.test(file)) continue;
    const content = await textAt(dist, file);
    assert.doesNotMatch(content, /(?:[A-Z]:[\\/]+Users[\\/]+|file:\/\/|127\.0\.0\.1|localhost:\d)/i, `Local machine reference in ${file}`);
    for (const pattern of credentialPatterns) assert.doesNotMatch(content, pattern, `Potential credential in ${file}`);
    if (file.endsWith('.json')) assert.equal(file, 'media/opening-photo-sources.json', `Unreviewed JSON data published: ${file}`);
  }
});

test('owned preview source has no remote request APIs or live provider connection', async () => {
  // Restrict to owned code: React's production runtime includes its own optional
  // request internals, which are not evidence that this demonstration calls them.
  for (const file of await walk(source)) {
    if (!/\.(?:[jt]sx?|css)$/.test(file)) continue;
    const content = await textAt(source, file);
    assert.doesNotMatch(content, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/, `Network request API in ${file}`);
    assert.doesNotMatch(content, /(?:api\.spotify\.com|accounts\.spotify\.com|api\.elevenlabs\.io|api\.openai\.com|https?:\/\/[^\s"'`]*\.onrender\.com)/i, `Provider endpoint in ${file}`);
    assert.doesNotMatch(content, /(?:src\s*=\s*["']https?:|url\(\s*["']?https?:)/i, `Remote runtime artwork/font in ${file}`);
    assert.doesNotMatch(content, /\b(?:getCurrentPosition|watchPosition|requestMIDIAccess|mediaDevices)\b/, `Real device data API in ${file}`);
  }
});

test('the repository-root Pages export is byte-identical and has no stale asset files', async () => {
  const files = await walk(dist);
  for (const file of files) {
    const built = await readFile(path.join(dist, ...file.split('/')));
    const exported = await readFile(path.join(root, ...file.split('/'))).catch(() => null);
    assert.ok(exported?.equals(built), `Repository-root Pages file is missing/stale: ${file}`);
  }
  for (const folder of ['assets', 'media', 'history']) {
    const builtNames = await walk(path.join(dist, folder));
    const exportedNames = await walk(path.join(root, folder));
    assert.deepEqual(exportedNames, builtNames, `Stale/unreviewed files remain in published ${folder}/`);
  }
});
