import { copyFile, cp, mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
// Stable shared URLs stay usable. Initial destination is read by App from the pathname.
for(const page of ['start.html','complete.html','log.html']) {
  await copyFile(path.join(root,'dist/index.html'),path.join(root,'dist',page));
}
await writeFile(path.join(root,'dist/.nojekyll'),'');
// Keep a compact, explicit history entry instead of presenting old concepts as current.
await mkdir(path.join(root,'dist/history'),{recursive:true});
await writeFile(path.join(root,'dist/history/index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RunState — Earlier design studies</title><style>body{margin:0;background:#101113;color:#eff0f2;font:17px/1.7 system-ui;padding:48px 24px}main{max-width:650px;margin:auto}a{color:#c4b8ff}h1{line-height:1.2}p{color:#b9bdc5}</style><main><h1>Earlier design studies</h1><p>The August 2026 prototypes helped shape RunState. They represent an earlier stage, not the current Android app.</p><p><a href="https://github.com/Manley-codes/runstate-preview/tree/28a974a73c10a7cdec03acc21c6efd5e7eb1c6ba">Browse the earlier source</a></p><p><a href="../index.html">Return to the current interactive preview →</a></p></main></html>`);
console.log('Static preview exported with start.html, complete.html and log.html compatibility entries.');
// GitHub Pages currently serves the repository root. Prepare those tracked files
// locally; publishing still requires an explicit commit and push by the owner.
// Remove only stale Vite bundles previously generated in this exact assets folder.
// Leave unknown files alone; verify-pages will flag them for explicit review.
const assetDirectory=path.resolve(root,'assets');
if(path.dirname(assetDirectory)!==root)throw new Error('Invalid managed assets directory');
await mkdir(assetDirectory,{recursive:true});
const currentAssets=new Set(await readdir(path.join(root,'dist/assets')));
for(const entry of await readdir(assetDirectory,{withFileTypes:true})) {
  if(entry.isFile()&&/^index-[A-Za-z0-9_-]+\.(js|css)$/.test(entry.name)&&!currentAssets.has(entry.name)) {
    await unlink(path.join(assetDirectory,entry.name));
  }
}
for(const entry of ['index.html','start.html','complete.html','log.html','.nojekyll','assets','media','history']) {
  await cp(path.join(root,'dist',entry),path.join(root,entry),{recursive:true});
}
console.log('Repository-root Pages files prepared. Nothing has been published.');
