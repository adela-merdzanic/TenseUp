// Plays an ordered playlist of pre-made narration MP3s through one <audio>
// element. On end it advances to the next item; if a file is missing (error)
// it skips ahead, so partial audio coverage just works.
//
// `isIncluded(item)` acts as a live skip mask: items it rejects are hopped
// over by auto-advance and by next()/prev(). playFrom() plays its target
// unconditionally (an explicit user choice).

export function createAudioPlayer({
  audioEl,
  onItemStart,
  onStop,
  isIncluded = () => true,
} = {}) {
  let queue = [];
  let index = -1;
  let active = false;
  let rate = 1;

  // Nearest included index at or after `from` (walking forward) or at or
  // before it (backward); -1 when there is none.
  function findIncluded(from, step) {
    for (let i = from; i >= 0 && i < queue.length; i += step) {
      if (isIncluded(queue[i])) return i;
    }
    return -1;
  }

  function playIndex(i) {
    if (i < 0 || i >= queue.length) {
      finish();
      return;
    }
    index = i;
    const item = queue[i];
    audioEl.src = item.src;
    // Changing src resets playbackRate; re-apply the chosen speed right away.
    audioEl.playbackRate = rate;
    if (onItemStart) onItemStart(item, i);
    audioEl.play().catch(() => {
      /* An autoplay rejection or bad src surfaces via the "error" event. */
    });
  }

  function finish() {
    active = false;
    index = -1;
    audioEl.pause();
    audioEl.removeAttribute("src");
    if (onStop) onStop();
  }

  // Keep the chosen speed applied across track changes (some browsers reset it).
  audioEl.addEventListener("play", () => {
    audioEl.playbackRate = rate;
  });
  audioEl.addEventListener("ended", () => {
    if (active) playIndex(findIncluded(index + 1, 1));
  });
  audioEl.addEventListener("error", () => {
    if (active && audioEl.getAttribute("src"))
      playIndex(findIncluded(index + 1, 1));
  });

  return {
    setQueue(items) {
      queue = items;
    },
    setRate(value) {
      rate = value;
      audioEl.playbackRate = value;
    },
    playFrom(i) {
      if (queue.length === 0) return;
      active = true;
      playIndex(Math.max(0, Math.min(i, queue.length - 1)));
    },
    next() {
      if (!active) return;
      playIndex(findIncluded(index + 1, 1));
    },
    // Podcast-style previous: restart the current card when a few seconds in,
    // otherwise jump to the included card before it (or restart when there is
    // none).
    prev() {
      if (!active) return;
      if (audioEl.currentTime > 3) {
        playIndex(index);
        return;
      }
      const before = findIncluded(index - 1, -1);
      playIndex(before >= 0 ? before : index);
    },
    pause() {
      audioEl.pause();
    },
    resume() {
      if (active) audioEl.play().catch(() => {});
    },
    stop() {
      if (active) finish();
    },
    isActive() {
      return active;
    },
    isPaused() {
      return audioEl.paused;
    },
  };
}
