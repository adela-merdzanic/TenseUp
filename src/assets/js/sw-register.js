// Registers the offline worker (sw.js), which downloads the whole site -
// narration included - on the first visit so it keeps working without a
// connection.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {
    /* Offline support is an extra; the site works fine without it. */
  });
}
