# [4chan Reader](https://user7210unix.github.io/chanchan/)

A lightweight single-file **4chan board / catalog / thread reader** written in plain HTML + CSS + JavaScript.


## Features

- Browse all boards (worksafe + not worksafe)
- View board catalog (thread grid)
- Sort catalog:
  - bump order
  - most replies
  - most images
  - newest / oldest
- Search catalog by subject + comment
- Thread view with large inline media
  - images load big
  - `.webm` / `.mp4` embedded video player
- Click `>>12345` to jump + highlight replied post
- Hover `No.12345` to see replies popup
- Click image to open fullscreen lightbox (no new tab)
- Filters/settings popup
- All settings saved automatically using `localStorage`
## Changelog
Thread layout — tree view by default
Replies now build a true conversation tree. Each reply's "parent" is determined by the highest-numbered >>quotelink it contains, so posts naturally nest beneath what they're responding to. The tree uses subtle vertical connector lines (like a terminal tree, not a heavy chat bubble border) with horizontal tick marks for each branch — reads like a messenger thread without abandoning imageboard DNA.
Reply links rendered under posts
Every post now shows the actual >>123456 links that reply to it, displayed as pill-shaped chips below the comment. Hover for preview, click to jump. No more just showing a count.
Post design — OP vs replies
OP gets a full-width card with a thin gradient accent bar on the left edge and a soft glow. Replies use a glassmorphism bubble (backdrop-filter: blur) with a very subtle border — lighter visual weight, distinct from the OP. The hover-reveal action buttons (hide) appear on hover only, keeping things clean.
Context menu — Fluent Design inspired
Fully rebuilt: rounded border-radius: 14px, icon badges for each item (small rounded squares), section grouping with hairline dividers, cubic-bezier scale+translate entrance animation, blur backdrop. Each item has a label + optional shortcut slot. Right-clicking a post card gives different options than right-clicking a thread card.
