# Preview asset notes

This preview reuses the accepted RunState artwork and locally bundled opening photographs. It does not load images from remote services at runtime.

- `preview-src/public/media/opening/`: the 33 opening-screen photos already bundled with the Android app. Photographer, provider and original page URLs are preserved in [opening-photo-sources.json](preview-src/public/media/opening-photo-sources.json). Layout and animation follow the native opening screen.
- `preview-src/src/opening-first-frame.webp`: the app's existing approved collage capture, embedded in the preview bundle so a complete photo wall covers cold image loading. It uses the same credited photographs and is replaced only when every moving tile has decoded.
- `start-music.jpg`: original RunState headphones artwork, also used inside the default circular player.
- The optional Album cover layout uses three locally bundled demonstration covers from the existing design studies. Artwork remains the property of its respective rights holders; the preview is silent and does not load Spotify images at runtime:
  - `album-good-as-hell.jpg`: Lizzo, Good as Hell â€” [Spotify track](https://open.spotify.com/track/6KgBpzTuTRPebChN0VTyzV), [original thumbnail](https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02c73afc08102af649ce32d6b4).
  - `album-lovely-day.jpg`: Bill Withers, Menagerie / Lovely Day â€” [Spotify track](https://open.spotify.com/track/0bRXwKfigvpKZUurwqAlEh), [original oEmbed thumbnail](https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0267c1113f55ab816ef61d3993).
  - `album-no-role-modelz.jpg`: J. Cole, 2014 Forest Hills Drive / No Role Modelz â€” original Spotify oEmbed thumbnail preserved from the earlier player study for [this track](https://open.spotify.com/track/68Dni7IE4VyPkTOH9mRWHr).
- `start-map.jpg` and `history-running-trail.jpg`: existing app design artwork. These are decorative images, not a user's location or recorded route.
- `spotify-icon-white.svg`: existing Spotify attribution mark. Spotify is a third-party service; this browser demonstration is silent and is not an endorsement or a working Spotify client.
- Anton and Barlow/Barlow Condensed fonts: existing app typography. Font license notices are included in `preview-src/public/media/licenses/`.
- Roboto Latin weights 400â€“900: bundled from `@fontsource/roboto` to match native Android text. The Apache 2.0 license is preserved at `preview-src/public/media/fonts/Roboto-LICENSE.txt`.
- `NativeAgentRing.tsx` shares the native ring geometry, color stops and motion formulas between Start and Completion; these are code-rendered shapes rather than generated replacement artwork.

The illustrative song titles/artists are sample metadata only. No song recordings, voice generations, credentials, private run records or actual route files are bundled.

## November 25 Start design synchronization

- `media/trails/`: eight unchanged licensed Android trail photographs and OpenStreetMap-based area maps. Source URLs, attribution, modification notes and licenses are in [TRAIL-ASSETS.md](TRAIL-ASSETS.md); credits are also available inside each trail detail.
- `ShoeArt.tsx`: RunState's original simplified gray sneaker and slightly irregular ocean-blue/white rings, ported directly from the current Android drawing.
- `shoe-catalog.json`: 338 public brand/model names only. The owner's private product-photo collection, source download URLs and personal shoe records are not included. The public picker uses the app's text-only release presentation.

## November 26 welcome Start sync

- `start-runstate-wordmark.png`: approved RunState wordmark isolated from the owner-selected generated design; same unchanged PNG as Android.
- `fonts/nunito-sans-variable.ttf`: unchanged Nunito Sans from Google Fonts, SIL Open Font License 1.1. Copyright 2016 The Nunito Sans Project Authors. Full notice in `media/licenses/nunito-sans-OFL.txt`.
- Light gradient and subtle leaves, emphasized animated ring, pastel Energy tiles, and Start dial are direct code adaptations of the approved Android design. The Trails card reuses the credited Terry Hershey photo without a map background.
- Alex is a fictional profile name; optional visitor names and appearance preferences stay in that browser. GPS Ready is illustrative, with no location access.
