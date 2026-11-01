# Preview asset notes

This preview reuses the accepted RunState artwork and locally bundled opening photographs. It does not load images from remote services at runtime.

- `preview-src/public/media/opening/`: the 33 opening-screen photos already bundled with the Android app. Photographer, provider and original page URLs are preserved in [opening-photo-sources.json](preview-src/public/media/opening-photo-sources.json). Layout and animation follow the native opening screen.
- `preview-src/src/opening-first-frame.webp`: the app's existing approved collage capture, embedded in the preview bundle so a complete photo wall covers cold image loading. It uses the same credited photographs and is replaced only when every moving tile has decoded.
- `start-music.jpg`: original RunState headphones artwork, also used inside the circular player. No third-party album cover is included in this refresh.
- `start-map.jpg` and `history-running-trail.jpg`: existing app design artwork. These are decorative images, not a user's location or recorded route.
- `spotify-icon-white.svg`: existing Spotify attribution mark. Spotify is a third-party service; this browser demonstration is silent and is not an endorsement or a working Spotify client.
- Anton and Barlow/Barlow Condensed fonts: existing app typography. Font license notices are included in `preview-src/public/media/licenses/`.
- Roboto Latin weights 400–900: bundled from `@fontsource/roboto` to match native Android text. The Apache 2.0 license is preserved at `preview-src/public/media/fonts/Roboto-LICENSE.txt`.
- `NativeAgentRing.tsx` shares the native ring geometry, color stops and motion formulas between Start and Completion; these are code-rendered shapes rather than generated replacement artwork.

The illustrative song titles/artists are sample metadata only. No song recordings, voice generations, credentials, private run records or actual route files are bundled.
