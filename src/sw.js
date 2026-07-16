// Offline support: on the first visit the worker downloads the site - pages,
// styles, scripts and quiz data - into Cache Storage, so studying keeps
// working without a connection. Narration MP3s are the exception: they are
// large, so they only start downloading (in the background) when the theory
// page that plays them is actually visited.
//
// Strategy: everything is served cache-first. Small files (pages, CSS, JS,
// JSON) are re-fetched in the background on every use, so a deploy shows up
// one reload later. MP3s are never re-fetched once cached, to spare mobile
// data. Bump the version to force a full re-download.

const CACHE_NAME = "recall-v1";

const CORE = [
  "./",
  "index.html",
  "dashboard.html",
  "quiz.html",
  "rules.html",
  "theory.html",
  "essay.html",
  "contribute.html",
  "assets/css/base.css",
  "assets/css/components.css",
  "assets/css/essay.css",
  "assets/css/home.css",
  "assets/css/quiz.css",
  "assets/css/rules.css",
  "assets/css/theory.css",
  "assets/css/variables.css",
  "assets/images/apple-touch-icon.png",
  "assets/images/favicon-32.png",
  "assets/images/favicon.svg",
  "assets/js/audio-player.js",
  "assets/js/data-loader.js",
  "assets/js/essay-diagrams.js",
  "assets/js/essay-store.js",
  "assets/js/main-essay.js",
  "assets/js/main-dashboard.js",
  "assets/js/main-picker.js",
  "assets/js/main-quiz.js",
  "assets/js/main-static.js",
  "assets/js/main-theory.js",
  "assets/js/nav.js",
  "assets/js/progress-store.js",
  "assets/js/quiz-engine.js",
  "assets/js/quiz-render.js",
  "assets/js/quiz-state.js",
  "assets/js/settings-store.js",
  "assets/js/subject.js",
  "assets/js/sw-register.js",
  "assets/js/theme.js",
  "assets/js/utils.js",
  "data/subjects.json",
];

// Subjects, their topic files and narration are all listed in data files, so
// new content (and new subjects) get precached without editing this worker.
async function extraUrls() {
  const urls = [];
  let subjects = [];
  try {
    subjects = (await (await fetch("data/subjects.json")).json()).subjects;
  } catch {
    /* Without the subjects list everything just stays online-only. */
    return urls;
  }
  for (const subject of subjects) {
    const dir = subject.dir || subject.id;
    urls.push(`data/${dir}/manifest.json`);
    try {
      const manifest = await (await fetch(`data/${dir}/manifest.json`)).json();
      urls.push(...manifest.topics.map((topic) => `data/${dir}/${topic.file}`));
    } catch {
      /* This subject's topics stay online-only. */
    }
    if (subject.features && subject.features.includes("essay")) {
      urls.push(`data/${dir}/essay-cards.json`);
    }
  }
  return urls;
}

// Narration MP3s for every essay subject. Not precached at install time -
// downloading starts when the theory page is visited (see the fetch handler).
async function narrationUrls() {
  const urls = [];
  let subjects = [];
  try {
    subjects = (await (await fetch("data/subjects.json")).json()).subjects;
  } catch {
    return urls;
  }
  for (const subject of subjects) {
    if (!subject.features || !subject.features.includes("essay")) continue;
    const dir = subject.dir || subject.id;
    try {
      const data = await (await fetch(`data/${dir}/essay-cards.json`)).json();
      urls.push(...data.cards.map((card) => `assets/voice/${card.id}.mp3`));
    } catch {
      /* This subject's narration stays online-only. */
    }
  }
  return urls;
}

async function precacheNarration() {
  const cache = await caches.open(CACHE_NAME);
  // Cached one by one and never re-fetched: a card without a narration file
  // or a dropped connection must not break the ones that succeed.
  await Promise.allSettled(
    (await narrationUrls()).map(async (url) => {
      if (await cache.match(url)) return;
      const response = await fetch(url);
      if (response.ok && response.status === 200)
        await cache.put(url, response);
    }),
  );
}

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(CORE);
  // Cached one by one: a card without a narration file must not fail install.
  await Promise.allSettled(
    (await extraUrls()).map(async (url) => {
      const response = await fetch(url);
      if (response.ok && response.status === 200)
        await cache.put(url, response);
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== CACHE_NAME) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

// Media elements ask for byte ranges; answer 206 from the cached full file,
// otherwise Safari refuses to play (and seeking breaks elsewhere).
async function rangeResponse(request, cached) {
  const body = await cached.arrayBuffer();
  const size = body.byteLength;
  const match = /bytes=(\d+)-(\d+)?/.exec(request.headers.get("range"));
  const start = match ? Number(match[1]) : 0;
  const end =
    match && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

async function serveAudio(request) {
  const cached = await caches.match(request, { ignoreMethod: true });
  if (cached) {
    return request.headers.has("range")
      ? rangeResponse(request, cached)
      : cached;
  }
  const response = await fetch(request);
  // Only full responses go in the cache; a 206 slice would corrupt playback.
  if (response.ok && response.status === 200) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request.url, response.clone());
  }
  return response;
}

// Cache-first with a background refresh, so deploys show up one reload later
// while offline visits never wait on the network.
async function serveStale(event, request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  const fresh = await refresh;
  if (fresh) return fresh;
  // Offline and never cached: land navigations on the home page.
  if (request.mode === "navigate") {
    const home = await cache.match("index.html");
    if (home) return home;
  }
  return new Response("Offline", { status: 503 });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // e.g. the analytics beacon

  // HEAD is how the theory page checks which cards have narration.
  if (request.method === "HEAD") {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request, { ignoreMethod: true });
        if (cached) return new Response(null, { status: 200 });
        return fetch(request);
      })(),
    );
    return;
  }

  if (request.method !== "GET") return;

  // Visiting the theory page is what triggers the narration download; the
  // files land in the cache in the background while the page is used.
  if (request.mode === "navigate" && url.pathname.endsWith("/theory.html")) {
    event.waitUntil(precacheNarration());
  }

  if (url.pathname.endsWith(".mp3")) {
    event.respondWith(serveAudio(request));
  } else {
    event.respondWith(serveStale(event, request));
  }
});
