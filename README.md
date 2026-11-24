# Tour de France 2027 — Rhondda Valleys

An interactive, lightweight map imagining a Tour de France-style stage through the Rhondda Fawr and
Rhondda Fach valleys (South Wales), with nearby walking routes to explore. Built as a static site with
[Leaflet](https://leafletjs.com/) and OpenStreetMap/OpenTopoMap tiles — no build step, no framework, no
API keys.

**This is a fan-made, illustrative map.** The 2027 Tour de France route has not been announced, so the
route shown here is a plausible, hand-drawn stage through the valleys (featuring Tylorstown) rather than
an official ASO route. Walking routes are approximate sketches of real trails in the area — always check
an OS map and current conditions before heading out.

## Features

- Stage route, start/finish/KOM/town markers, and nearby walking routes as toggleable map layers
- Street or terrain/topographic base map
- Click any route or marker for details in the side panel
- Responsive layout with a collapsible panel on mobile
- Pure static HTML/CSS/JS + GeoJSON — hosts anywhere that serves static files

## Project structure

```
index.html              Page shell and layer controls
css/style.css            Styling
js/app.js                Map setup and data loading (Leaflet)
data/tdf-route.geojson   The stage route line
data/stage-points.geojson Start/finish/KOM/town markers
data/walking-routes.geojson Nearby walking trails
```

## Running locally

Because the page fetches `.geojson` files, open it through a local web server rather than
double-clicking the file (browsers block `fetch()` on `file://` URLs).

```powershell
npx serve .
```

or, with Python installed:

```powershell
python -m http.server 8000
```

Then open the printed URL (e.g. `http://localhost:8000`).

## Deploying

### GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, set the source to the `main` branch, root folder.
3. The site will be published at `https://<username>.github.io/<repo>/`.

The included `.nojekyll` file prevents GitHub's Jekyll processing from interfering with the plain
static files.

### Cloudflare Pages

1. Connect the repository in the Cloudflare Pages dashboard.
2. Build command: leave blank (or `none`). Output directory: `/` (project root).
3. Deploy — no environment variables or build step are required.

## Customising

- **Replace the route:** edit `data/tdf-route.geojson` with your own coordinates, or export a real
  GPX/GeoJSON track from a tool like [geojson.io](https://geojson.io) and drop it in.
- **Add/edit walking routes:** edit `data/walking-routes.geojson`. Each feature supports `name`,
  `distanceKm`, `difficulty`, and `description` properties.
- **Change the starting view:** adjust the `setView([lat, lng], zoom)` call in `js/app.js`.
