/*
 * fontloader.js
 * ---------------------------------------------------------------
 * Self-contained module that owns EVERYTHING related to fonts:
 *   - discovering fonts (best-effort live fetch from Google Fonts'
 *     metadata endpoint, since there's no key-free official API)
 *   - a smart (stale-while-revalidate) cache, same pattern as
 *     ColorPaletteManager, so we don't refetch the catalog on
 *     every combobox open
 *   - lazily injecting the actual @font-face CSS for a family only
 *     the moment it's actually needed (preview row or selection) -
 *     "dynamic" loading, not a fixed <link> list in <head>
 *   - persisting the user's chosen family + UI font size
 *
 * Mirrors ColorPaletteManager's shape on purpose so the two read
 * the same way, but this file never touches color at all.
 * ---------------------------------------------------------------
 */

var FontLoader = (function () {

  "use strict";

  var PROXY = "https://chan-proxy.anonnousmes.workers.dev/?url=";
  var META_URL = "https://fonts.google.com/metadata/fonts";
  var CSS_URL = "https://fonts.googleapis.com/css2";

  var LS_CHOICE = "flm_choice_v1";
  var LS_CACHE = "flm_cache_v1";
  var LS_SIZE = "flm_size_v1";

  var CACHE_TTL = 1000 * 60 * 60 * 24 * 7;        // fresh for 7d
  var CACHE_STALE_OK = 1000 * 60 * 60 * 24 * 30;   // usable (stale) for 30d

  var loadedLinks = {}; // family -> true once its <link> is injected

  /* -------------------------------------------------------------
   * Fallback catalog. Google's metadata endpoint is undocumented
   * and unofficial (there's no key-free public Fonts API), so this
   * guarantees every category always has enough entries to browse
   * even if the live fetch fails or the endpoint's shape changes.
   * ----------------------------------------------------------- */
  var FALLBACK = {
    sans: ["Plus Jakarta Sans", "Inter", "Manrope", "Work Sans", "Space Grotesk",
           "Sora", "Outfit", "DM Sans", "Karla", "Rubik", "Lexend", "Figtree"],
    serif: ["Source Serif 4", "Lora", "Playfair Display", "Merriweather", "Newsreader",
            "Bitter", "Cormorant Garamond", "Spectral", "Crimson Pro", "Libre Baskerville"],
    mono: ["JetBrains Mono", "IBM Plex Mono", "Space Mono", "Fira Code", "Roboto Mono",
           "Courier Prime", "Source Code Pro", "Red Hat Mono", "Fragment Mono"],
    hand: ["Caveat", "Dancing Script", "Kalam", "Shadows Into Light", "Patrick Hand",
           "Indie Flower", "Gochi Hand", "Reenie Beanie", "Homemade Apple"],
    display: ["Bungee", "Abril Fatface", "Righteous", "Passion One", "Alfa Slab One",
              "Anton", "Bebas Neue", "Fjalla One", "Archivo Black"]
  };

  // system fonts need no network fetch at all
  var SYSTEM = [
    { family: "Times New Roman", fallback: "serif" },
    { family: "Georgia", fallback: "serif" },
    { family: "Arial", fallback: "sans-serif" },
    { family: "Courier New", fallback: "monospace" }
  ];

  var CATEGORY_MAP = {
    "sans-serif": "sans",
    "serif": "serif",
    "monospace": "mono",
    "handwriting": "hand",
    "display": "display"
  };

  /* -------------------- persistence helpers -------------------- */

  function lsGet(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* -------------------- smart cache -------------------- */

  function cacheRead() { return lsGet(LS_CACHE, null); }
  function cacheWrite(data) { lsSet(LS_CACHE, { t: new Date().getTime(), data: data }); }
  function cacheAge(entry) { return new Date().getTime() - entry.t; }

  /* -------------------- network scrape -------------------- */

  function px(u) { return PROXY + encodeURIComponent(u); }

  function xhrGet(url, ok, err) {
    var x;
    try { x = new XMLHttpRequest(); } catch (e) { err && err(); return; }
    x.open("GET", px(url), true);
    x.onreadystatechange = function () {
      if (x.readyState === 4) {
        if (x.status >= 200 && x.status < 300) ok(x.responseText);
        else err && err("http " + x.status);
      }
    };
    try { x.send(null); } catch (e) { err && err("send failed"); }
  }

  // Google's metadata endpoint prefixes the JSON body with an
  // anti-hijack guard ()]}') - strip everything before the first
  // '{' and parse what's left.
  function parseMeta(text) {
    var idx = text.indexOf("{");
    if (idx < 0) return null;
    try {
      var json = JSON.parse(text.slice(idx));
      var list = json.familyMetadataList || [];
      var out = { sans: [], serif: [], mono: [], hand: [], display: [] };
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        var cat = CATEGORY_MAP[(f.category || "").toLowerCase()];
        if (cat && f.family) out[cat].push(f.family);
      }
      return out;
    } catch (e) { return null; }
  }

  function scrapeLive(cb) {
    xhrGet(META_URL, function (text) {
      var parsed = parseMeta(text);
      cb(parsed);
    }, function () { cb(null); });
  }

  /* -------------------- public: fetch a page of N per category -------------------- */

  // category: "sans" | "serif" | "mono" | "hand" | "display"
  // page: 0-based, PAGE_SIZE families per page
  var PAGE_SIZE = 6;

  function serveFromPool(pool, category, page) {
    var list = (pool && pool[category] && pool[category].length) ? pool[category] : FALLBACK[category];
    var start = page * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);
    if (slice.length < PAGE_SIZE) {
      var fb = FALLBACK[category];
      var i = 0;
      while (slice.length < PAGE_SIZE) {
        var cand = fb[(start + i) % fb.length];
        if (slice.indexOf(cand) < 0) slice.push(cand);
        i++;
        if (i > fb.length * 2) break; // safety valve
      }
    }
    return slice;
  }

  function fetchPage(category, page, cb) {
    if (category === "system") { cb(SYSTEM.map(function (s) { return s.family; })); return; }

    var entry = cacheRead();

    if (entry && cacheAge(entry) < CACHE_TTL) {
      cb(serveFromPool(entry.data, category, page));
      return;
    }

    if (entry && cacheAge(entry) < CACHE_STALE_OK) {
      cb(serveFromPool(entry.data, category, page));
      scrapeLive(function (fresh) { if (fresh) cacheWrite(fresh); });
      return;
    }

    scrapeLive(function (fresh) {
      var pool = fresh || (entry ? entry.data : null);
      if (pool) cacheWrite(pool);
      cb(serveFromPool(pool, category, page));
    });
  }

  /* -------------------- dynamic loading -------------------- */

  // Injects the @font-face CSS for a family the moment it's needed
  // (a preview row scrolling into view, or an actual selection) -
  // nothing is preloaded in <head> up front.
  function ensureLoaded(family) {
    if (loadedLinks[family]) return;
    loadedLinks[family] = true;
    var q = family.replace(/ /g, "+");
    var url = CSS_URL + "?family=" + q + ":wght@400;500;600;700&display=swap";
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }

  function isSystem(family) {
    for (var i = 0; i < SYSTEM.length; i++) if (SYSTEM[i].family === family) return true;
    return false;
  }

  function fallbackFor(family) {
    for (var i = 0; i < SYSTEM.length; i++) if (SYSTEM[i].family === family) return SYSTEM[i].fallback;
    return "sans-serif";
  }

  function applyFont(family) {
    if (!isSystem(family)) ensureLoaded(family);
    var stack = "'" + family + "', " + fallbackFor(family);
    document.documentElement.style.setProperty("--ui-font", stack);
  }

  function saveChoice(family) { lsSet(LS_CHOICE, { family: family }); }
  function loadChoice() { return lsGet(LS_CHOICE, null); }
  function saveSize(px_) { lsSet(LS_SIZE, px_); }
  function loadSize() { return lsGet(LS_SIZE, 14); }

  function init() {
    var choice = loadChoice();
    applyFont(choice && choice.family ? choice.family : "Plus Jakarta Sans");
  }

  return {
    fetchPage: fetchPage,
    ensureLoaded: ensureLoaded,
    applyFont: applyFont,
    saveChoice: saveChoice,
    loadChoice: loadChoice,
    saveSize: saveSize,
    loadSize: loadSize,
    init: init,
    FALLBACK: FALLBACK,
    SYSTEM: SYSTEM
  };

})();
