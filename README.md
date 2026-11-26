# RunState interactive app preview

[Explore the preview](https://manley-codes.github.io/runstate-preview/) | [Android app and backend](https://github.com/Manley-codes/RunState)

RunState connects the numbers from a run with how you felt and the music around it. This repository presents its current Android screen design as an interactive browser walkthrough.

Explore Houston trails, choose shoes and an optional distance or time goal, then choose your energy. Watch the countdown assemble into Active Run, bring the music player inside the distance visualizer, pause and finish, then revisit the example in History. Appearance offers Dark, Light and Auto, plus the Headphones and Album cover player layouts. Album cover displays the matching sample artwork when you change songs.

**This is a simulated design preview.** This interactive preview uses example run data and sample reflections. Music controls demonstrate the experience without playing audio.

## Try the flow

1. Enter the opening screen. Browse Houston trails, select a shoe brand/model and personal mileage target, or open Goal for a distance/time target. These choices are optional; choose an energy level when ready.
2. Select Start. Wait for the countdown or choose Start now.
3. Tap Spotify Music. Use the tall arrows along the sides of the artwork to go back or forward and the lower control to pause or play. Distance and average pace stay visible beneath the player.
4. Pause the run and hold the Stop circle to finish.
5. Choose optional post-run energy and Effort, save, and open the run in History.

Desktop screen shortcuts and the mobile screen menu also let you jump directly to a feature. In History, open **Your Energy** for check-ins or expand a saved run to see its reflection. Runs, shoe mileage and songs in the walkthrough are examples held only for this browser session. The four Houston parks use credited photographs and static area maps, without live location. Start uses the approved light blue leaf background, a photo-led Explore trails card, and the animated music visualizer. Open map is inside Explore trails. The greeting follows local time and uses the fictional name Alex by default; Settings → Your name can save a different name in this browser only, or a blank name for a general greeting.

## Local development

Requires a Vite-compatible Node.js release (22.12+ or a current LTS).

```powershell
npm ci
npm run dev
```

Edit `preview-src/src/`. Local assets are in `preview-src/public/media/`.

```powershell
npm run build
npm test
npm run test:opening
npm run test:interactions
npm run test:start
npm run test:trails
npm run preview -- --base /runstate-preview/
```

The build type-checks the source, writes `dist/`, then prepares the repository-root HTML, assets and media used by the existing GitHub Pages configuration. **Building does not publish.** Review locally before committing and pushing. Root `index.html`, `start.html`, `complete.html` and `log.html` are generated; edit the source instead.

Publish design updates only after Manley explicitly approves updating this public preview. Android design acceptance alone does not authorize publication. Check the changed flow on phone and desktop widths and verify the published link after GitHub Pages finishes.

The older shared URLs remain usable: `start.html` opens Start, `complete.html` opens Completion, and `log.html` opens History. Assets use relative paths for GitHub Pages project hosting.

## Design history and assets

[Earlier August 2026 studies](https://github.com/Manley-codes/runstate-preview/tree/28a974a73c10a7cdec03acc21c6efd5e7eb1c6ba) remain in Git history. Those concepts are distinct from the current Android implementation.

The complete text shoe catalog is included; private product photographs are excluded. See [trail credits](TRAIL-ASSETS.md) and [asset notes](ASSETS.md) for the original app artwork, typography and opening-photo credits.

Designed and built by Manley Johnson. Approved Android Start, Goal, shoe and Houston trails designs synchronized November 26, 2026. Existing sample album artwork is retained.
