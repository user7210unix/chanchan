# chan//viewer

A minimal 4chan catalog browser. Single static HTML file — no build step, no dependencies, no server.

## How it works

4chan's API blocks CORS from non-4chan origins. This viewer routes all API calls through a waterfall of public CORS proxies, trying each in order and caching the first one that works:

1. `api.allorigins.win` (primary — most reliable on HTTPS)
2. `corsproxy.io`
3. `api.codetabs.com`
4. `thingproxy.freeboard.io`
