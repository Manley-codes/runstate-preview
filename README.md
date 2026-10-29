# RunState — interactive app preview

[Explore the preview](https://manley-codes.github.io/runstate-preview/) · [Android app and backend](https://github.com/Manley-codes/RunState)

RunState connects the numbers from a run with how you felt and the music around it. This repository presents its current Android screen design as an interactive browser walkthrough.

Choose your energy, watch the countdown assemble into Active Run, bring the music player inside the distance visualizer, pause and finish, then revisit the example in History. Dark is the default run appearance; Light is available from Appearance.

**This is a simulated design preview.** Distances and runs are fictional. Music controls are silent, reflections are scripted examples, and the preview does not connect to GPS, Spotify, ElevenLabs or the app backend. It requests no account or device permissions. Example runs last only for the current page session; the appearance preference stays in this browser.

## Try the flow

1. Enter the opening screen and choose an energy level.
2. Select Start. Wait for the countdown or choose Start now.
3. Tap Spotify Music; try next, previous and play/pause, then close the player.
4. Pause the run and hold the Stop circle to finish.
5. Choose optional post-run energy and Effort, save, and open the run in History.

Desktop screen shortcuts and the mobile screen menu also let you jump directly to a feature. History keeps saved runs in view, with a compact Your Energy row opening the check-in details. That compact row is a browser-preview refinement awaiting its later Android update. The route illustration and shoe/plan selections are examples, not connected services.

## Local development

Requires a Vite-compatible Node.js release (22.12+ or a current LTS).

```powershell
npm ci
npm run dev
```

Edit `preview-src/src/`. Local assets are in `preview-src/public/media/`.

```powershell
npm run build
npm run preview -- --base /runstate-preview/
```

The build type-checks the source, writes `dist/`, then prepares the repository-root HTML, assets and media used by the existing GitHub Pages configuration. **Building does not publish.** Review locally before committing and pushing. Root `index.html`, `start.html`, `complete.html` and `log.html` are generated; edit the source instead.

The older shared URLs remain usable: `start.html` opens Start, `complete.html` opens Completion, and `log.html` opens History. Assets use relative paths for GitHub Pages project hosting.

## Design history and assets

[Earlier August 2026 studies](https://github.com/Manley-codes/runstate-preview/tree/28a974a73c10a7cdec03acc21c6efd5e7eb1c6ba) remain in Git history. Those concepts are distinct from the current Android implementation.

See [asset notes](ASSETS.md) for the original app artwork, typography and opening-photo credits.

Designed and built by Manley Johnson. Preview updated October 29, 2026.
