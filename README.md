# chan//viewer

A minimal, dark-navy 4chan catalog browser. Single static HTML file — no build step, no dependencies, no server.

## Deploy to GitHub Pages

1. Create a new GitHub repository (public)
2. Upload `index.html` to the root
3. Go to **Settings → Pages → Source → Deploy from branch → main / (root)**
4. Your viewer will be live at `https://yourusername.github.io/repo-name`

> The site **must** be served over HTTPS (GitHub Pages does this automatically) for the CORS proxies to work.

## Features

- **Catalog-only view** — responsive grid with thumbnails, reply/image counts
- **Auto-hiding sidebar** — hover to reveal full board list with SFW/NSFW sections
- **Board filter** — type to search boards by code or name
- **Catalog search** — live filters threads by subject or comment
- **Thread view** — click any card to load the full thread inline
- **Image expand** — click thumbnails to expand; hover for floating preview
- **Quotelink navigation** — click `>>postno` to highlight and scroll to that post
- **NSFW blur** — NSFW board thumbnails are blurred by default, revealed on hover
- **Remembers last board** — `localStorage` persists your last visited board
- **Scroll to top** button appears after scrolling

## How it works

4chan's API blocks CORS from non-4chan origins. This viewer routes all API calls through a waterfall of public CORS proxies, trying each in order and caching the first one that works:

1. `api.allorigins.win` (primary — most reliable on HTTPS)
2. `corsproxy.io`
3. `api.codetabs.com`
4. `thingproxy.freeboard.io`

Images are loaded directly from `i.4cdn.org` (no proxy needed — 4chan allows cross-origin image loads).

## Files

```
index.html   ← the entire app, self-contained
.nojekyll    ← tells GitHub Pages not to process with Jekyll
README.md    ← this file
```
