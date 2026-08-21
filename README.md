# chanchan

A minimal, distraction-free reader for imageboards.

**Live: [user7210unix.github.io/chanchan](https://user7210unix.github.io/chanchan/)**

![preview](assets/preview.png)

## What it is

chanchan strips imageboard browsing down to just reading. No ads, no clutter,
no bloated JSON dumped straight into a wall of default-styled HTML. You type
a board, get a clean catalog, open a thread, and read it the way a long-form
article reads — quiet, legible, and entirely yours to restyle.

It exists because most imageboard front-ends optimize for density, not for
reading. chanchan flips that: one thread at a time, a calm layout, and full
control over how the text actually looks on screen.

## What it does

- Board lookup with autosuggest, catalog view, and threaded post view
- Client-side caching of boards, catalogs, and threads so re-opening
  something you already loaded doesn't hit the network again immediately
- A settings panel to tune the reading experience without leaving the page

## The font loader

Every part of the UI's typography is swappable, live, without a page reload.
Fonts are organized into categories — sans, serif, monospace, handwriting,
display — plus a system-fonts tier for people who'd rather not pull anything
over the network at all.

The interesting part is *how* it loads them:

- **Nothing is preloaded.** No fixed `<link>` list sits in `<head>` upfront.
  A font's `@font-face` CSS is only injected the moment it's actually needed
  — when you preview it or select it — so you're never paying for fonts you
  never look at.
- **Smart caching.** The catalog of available families is fetched once and
  cached with a stale-while-revalidate strategy: fresh for a week, still
  served instantly (while quietly refreshing in the background) for a month
  after that. The combobox never blocks on a network round trip.
- **Never empty.** If the network is unavailable or the source changes shape
  underneath it, a hand-picked fallback list keeps every category populated
  so the picker always has something to show.
- **Sticks around.** Your chosen family and UI font size are remembered
  across visits.

## The color palette loader

Same philosophy, applied to color. Palettes come in two moods — pastel and
dark — and are pulled in four-color sets.

- **Smart, semantic application.** A raw 4-color palette doesn't come with
  labels for "background" or "text." chanchan sorts the four colors by
  luminance and derives background, muted background, foreground, muted
  foreground, accent, and border roles from that — so *any* palette, however
  it was sourced, maps sensibly onto the interface. It also checks the
  resulting text/background contrast and corrects it if a given palette
  would otherwise be unreadable.
- **Smart caching**, same stale-while-revalidate shape as the font loader,
  so browsing palettes feels instant after the first load.
- **Never empty.** A curated set of pastel and dark palettes ships as a
  fallback, so the picker is never blank and the UI is never unstyled.
- **Sticks around.** Your chosen palette persists across reloads, and is
  what paints the interface immediately on next visit — no flash of
  unstyled color while things settle.

Both loaders are self-contained, independent modules — one owns fonts, the
other owns color, neither touches the other's territory or the reader's own
layout logic.
