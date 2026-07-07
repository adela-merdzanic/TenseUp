import { initTheme, wireThemeToggle } from "./theme.js";
import { qs, qsa, escapeHtml } from "./utils.js";
import { DIAGRAMS } from "./essay-diagrams.js";
import { createAudioPlayer } from "./audio-player.js";

initTheme();
wireThemeToggle();

const VOICE_DIR = "assets/voice";

async function loadCards() {
  const response = await fetch("data/essay-cards.json");
  if (!response.ok) {
    throw new Error(`Failed to load essay-cards.json (${response.status})`);
  }
  return response.json();
}

function renderCard(card) {
  const core = card.core.map((line) => `<li>${escapeHtml(line)}</li>`).join("");

  const mnemonic = card.mnemonic
    ? `<p class="mnemonic"><strong>Remember:</strong> ${escapeHtml(card.mnemonic)}</p>`
    : "";

  const diagram =
    card.diagram && DIAGRAMS[card.diagram]
      ? `<div class="card-diagram">${DIAGRAMS[card.diagram]}</div>`
      : "";

  const more =
    card.more && card.more.length > 0
      ? `<details class="answer-more">
           <summary>More detail</summary>
           <ul>${card.more.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
         </details>`
      : "";

  // Narration controls, revealed later only if the card has an audio file:
  // a checkbox to include the card in "Play selected", a listen button (which
  // turns into pause/resume while playing) and a replay-from-the-top icon.
  const listen = `<span class="theory-card__audio" hidden>
       <label class="theory-card__pick" title="Include in Play selected">
         <input type="checkbox" data-card-id="${escapeHtml(card.id)}" aria-label="Include this card in Play selected" />
       </label>
       <button type="button" class="btn btn-sm theory-card__listen" data-card-id="${escapeHtml(card.id)}">
         <span aria-hidden="true">▶</span> Listen
       </button>
       <button type="button" class="btn btn-sm theory-card__replay" data-card-id="${escapeHtml(card.id)}" aria-label="Replay this card" title="Replay this card">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>
       </button>
     </span>`;

  return `
    <article class="theory-card" id="card-${escapeHtml(card.id)}" data-card-id="${escapeHtml(card.id)}">
      <div class="theory-card__head">
        <h3>${escapeHtml(card.question)}</h3>
        ${listen}
      </div>
      <ul class="answer-core">${core}</ul>
      ${mnemonic}
      ${diagram}
      ${more}
    </article>`;
}

function render({ categories, cards }) {
  const cardsByCategory = new Map();
  for (const card of cards) {
    if (!cardsByCategory.has(card.category)) {
      cardsByCategory.set(card.category, []);
    }
    cardsByCategory.get(card.category).push(card);
  }

  // Only list categories that actually have cards, in declared order.
  const withCards = categories.filter((category) =>
    cardsByCategory.has(category.id),
  );

  qs("#theory-toc").innerHTML = withCards
    .map(
      (category) =>
        `<a href="#${escapeHtml(category.id)}">${escapeHtml(category.title)}</a>`,
    )
    .join("");

  qs("#theory-content").innerHTML = withCards
    .map(
      (category) => `
      <section id="${escapeHtml(category.id)}" class="rule-section">
        <h2>${escapeHtml(category.title)}</h2>
        ${cardsByCategory.get(category.id).map(renderCard).join("")}
      </section>`,
    )
    .join("");

  // Desktop sidebar: every card as a numbered playlist row, grouped by
  // category. Clicking a row plays it (wired later) or scrolls to the card.
  let position = 0;
  qs("#theory-playlist").innerHTML = withCards
    .map(
      (category) => `
      <p class="theory-playlist__category">${escapeHtml(category.title)}</p>
      ${cardsByCategory
        .get(category.id)
        .map(
          (card) => `
        <button type="button" class="theory-playlist__item" data-card-id="${escapeHtml(card.id)}">
          <span class="theory-playlist__num">${++position}</span>
          <span class="theory-playlist__question">${escapeHtml(card.question)}</span>
        </button>`,
        )
        .join("")}`,
    )
    .join("");
}

// Set by wireListen once narration is available: play the card with this id
// and return true, or return false when it has no audio.
let playCardById = null;

// Sidebar rows: play the card when it has narration, otherwise jump to it.
function wirePlaylistNav() {
  qs("#theory-playlist").addEventListener("click", (event) => {
    const row = event.target.closest(".theory-playlist__item");
    if (!row) return;
    const id = row.dataset.cardId;
    if (playCardById && playCardById(id)) return;
    const card = document.getElementById(`card-${id}`);
    if (!card) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    card.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  });
}

function wireBackToTop() {
  const backToTop = qs("#back-to-top");
  // Watch the intro, not the TOC chips: the chips are hidden on wide screens
  // where the playlist sidebar replaces them.
  const intro = qs(".rules-intro");
  if (!backToTop || !intro || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(([entry]) => {
    backToTop.classList.toggle("is-visible", !entry.isIntersecting);
  });
  observer.observe(intro);

  backToTop.addEventListener("click", () => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    qs("#theory-heading").focus({ preventScroll: true });
  });
}

// A card has narration when assets/voice/<id>.mp3 exists.
async function hasAudio(id) {
  try {
    const response = await fetch(`${VOICE_DIR}/${id}.mp3`, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

// Build the playlist from cards (in page order) whose MP3 exists, and reveal
// their Listen buttons. Returns [] when nothing is available.
async function buildPlaylist(cards) {
  const cardByQuestion = new Map(cards.map((c) => [c.id, c.question]));
  const cardEls = qsa("#theory-content .theory-card");

  const flags = await Promise.all(
    cardEls.map((el) => hasAudio(el.dataset.cardId)),
  );

  const playlist = [];
  cardEls.forEach((el, i) => {
    if (!flags[i]) return;
    const id = el.dataset.cardId;
    playlist.push({
      id,
      question: cardByQuestion.get(id) || "",
      src: `${VOICE_DIR}/${id}.mp3`,
      element: el,
    });
    el.querySelector(".theory-card__audio").hidden = false;
  });
  return playlist;
}

async function wireListen(cards) {
  const audioEl = qs("#listen-audio");
  const bar = qs("#listen-bar");
  if (!audioEl || !bar) return;

  const playlist = await buildPlaylist(cards);
  if (playlist.length === 0) return; // no audio yet - keep the plain page

  const playBtn = qs("#listen-play");
  const selectAllBtn = qs("#listen-select-all");
  const prevBtn = qs("#listen-prev");
  const toggleBtn = qs("#listen-toggle");
  const nextBtn = qs("#listen-next");
  const replayBtn = qs("#listen-replay");
  const stopBtn = qs("#listen-stop");
  const nowLabel = qs("#listen-now");
  const rateBtn = qs("#listen-rate");
  const seekRow = qs("#listen-seek");
  const seekInput = qs("#listen-seek-input");
  const timeCurrent = qs("#listen-time-current");
  const timeTotal = qs("#listen-time-total");

  // Tap the speed chip to cycle through rates, podcast-app style.
  const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
  let rate = 1;

  const checkboxOf = (item) =>
    item.element.querySelector(".theory-card__pick input");

  // Everything is included by default; untick to skip cards.
  playlist.forEach((item) => (checkboxOf(item).checked = true));

  const selectedItems = () =>
    playlist.filter((item) => checkboxOf(item).checked);

  // Play button shows how many cards are queued; the toggle flips between
  // select-all and clear-all (same convention as the start screen topic list).
  const updateSelectionUI = () => {
    const count = selectedItems().length;
    playBtn.innerHTML = `<span aria-hidden="true">▶</span> Play (${count})`;
    playBtn.disabled = count === 0;
    selectAllBtn.textContent =
      count === playlist.length ? "Clear all" : "Select all";
  };

  // Seek line: mirror the audio position onto the slider; dragging or
  // clicking the slider jumps the audio there, streaming-player style.
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  };

  const renderSeek = () => {
    const duration = audioEl.duration;
    seekInput.max = Number.isFinite(duration) ? duration : 0;
    seekInput.value = audioEl.currentTime;
    const percent = Number.isFinite(duration)
      ? (audioEl.currentTime / duration) * 100
      : 0;
    seekInput.style.setProperty("--seek-fill", `${percent}%`);
    timeCurrent.textContent = formatTime(audioEl.currentTime);
    timeTotal.textContent = formatTime(duration);
  };

  audioEl.addEventListener("loadedmetadata", renderSeek);
  audioEl.addEventListener("timeupdate", renderSeek);
  seekInput.addEventListener("input", () => {
    if (!Number.isFinite(audioEl.duration)) return;
    audioEl.currentTime = Number(seekInput.value);
    renderSeek();
  });

  const clearHighlight = () =>
    qsa(".theory-card.is-speaking").forEach((el) =>
      el.classList.remove("is-speaking"),
    );

  // Playback state the UI renders from: which playlist entry is loaded and
  // whether the user paused it (audioEl.paused flips too late for the UI).
  let currentIndex = -1;
  let paused = false;

  // The pause/resume toggle is icon-only; swap the glyph and the label.
  const setToggleIcon = (isPaused) => {
    toggleBtn.innerHTML = isPaused
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l11-7z" /></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg>';
    const label = isPaused ? "Resume" : "Pause";
    toggleBtn.setAttribute("aria-label", label);
    toggleBtn.title = label;
  };

  // Reflect the playback state everywhere it shows: the bar toggle, the
  // per-card button (the playing card's flips to Pause/Resume, the rest say
  // Listen) and the sidebar row highlight.
  const renderPlayState = () => {
    const active = player.isActive();
    setToggleIcon(paused);
    playlist.forEach((item, i) => {
      const button = item.element.querySelector(".theory-card__listen");
      if (!active || i !== currentIndex) {
        button.innerHTML = '<span aria-hidden="true">▶</span> Listen';
      } else if (paused) {
        button.innerHTML = '<span aria-hidden="true">▶</span> Resume';
      } else {
        button.innerHTML = '<span aria-hidden="true">❚❚</span> Pause';
      }
    });
    qsa(".theory-playlist__item.is-playing").forEach((el) =>
      el.classList.remove("is-playing"),
    );
    if (active && currentIndex >= 0) {
      const row = qs(
        `.theory-playlist__item[data-card-id="${playlist[currentIndex].id}"]`,
      );
      if (row) {
        row.classList.add("is-playing");
        row.scrollIntoView({ block: "nearest" });
      }
    }
  };

  const togglePause = () => {
    paused = !paused;
    if (paused) {
      player.pause();
    } else {
      player.resume();
    }
    renderPlayState();
  };

  const setPlayingUI = (playing) => {
    playBtn.hidden = playing;
    selectAllBtn.hidden = playing;
    prevBtn.hidden = !playing;
    toggleBtn.hidden = !playing;
    nextBtn.hidden = !playing;
    replayBtn.hidden = !playing;
    stopBtn.hidden = !playing;
    seekRow.hidden = !playing;
    if (playing) {
      setToggleIcon(false);
      renderSeek();
    } else {
      nowLabel.textContent = "";
      clearHighlight();
      updateSelectionUI();
    }
  };

  const player = createAudioPlayer({
    audioEl,
    // Unticked cards are skipped by auto-advance and prev/next; positions are
    // always shown against the full narrated list (e.g. 5/51).
    isIncluded: (item) => checkboxOf(item).checked,
    onItemStart: (item, index) => {
      clearHighlight();
      item.element.classList.add("is-speaking");
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      item.element.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
      nowLabel.textContent = `Now playing (${index + 1}/${playlist.length}): ${item.question}`;
      currentIndex = index;
      paused = false;
      renderPlayState();
    },
    onStop: () => {
      currentIndex = -1;
      setPlayingUI(false);
      renderPlayState();
    },
  });

  player.setQueue(playlist);
  player.setRate(rate);

  const startFrom = (index) => {
    player.setRate(rate);
    setPlayingUI(true);
    player.playFrom(index);
  };

  playBtn.addEventListener("click", () => {
    const first = playlist.findIndex((item) => checkboxOf(item).checked);
    if (first >= 0) startFrom(first);
  });

  selectAllBtn.addEventListener("click", () => {
    const check = selectedItems().length !== playlist.length;
    playlist.forEach((item) => (checkboxOf(item).checked = check));
    updateSelectionUI();
  });

  qs("#theory-content").addEventListener("change", (event) => {
    if (event.target.closest(".theory-card__pick")) updateSelectionUI();
  });

  updateSelectionUI();

  toggleBtn.addEventListener("click", togglePause);

  stopBtn.addEventListener("click", () => player.stop());
  prevBtn.addEventListener("click", () => player.prev());
  nextBtn.addEventListener("click", () => player.next());
  replayBtn.addEventListener("click", () => {
    if (player.isActive()) replayAt(currentIndex);
  });

  rateBtn.addEventListener("click", () => {
    rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    rateBtn.textContent = `${rate}x`;
    player.setRate(rate);
  });

  // Start the card at this playlist position from the top. Listening to a
  // card means including it, so an unticked card gets ticked first.
  const startAt = (index) => {
    const box = checkboxOf(playlist[index]);
    if (!box.checked) {
      box.checked = true;
      updateSelectionUI();
    }
    startFrom(index);
  };

  // Play the card at this playlist position. On the card that is already
  // playing it pauses/resumes instead; replay buttons restart it.
  const playAt = (index) => {
    if (player.isActive() && index === currentIndex) {
      togglePause();
      return;
    }
    startAt(index);
  };

  // Replay: rewind the playing card to the top (resuming if paused); on any
  // other card it simply starts that card.
  const replayAt = (index) => {
    if (player.isActive() && index === currentIndex) {
      audioEl.currentTime = 0;
      if (paused) togglePause();
      renderSeek();
      return;
    }
    startAt(index);
  };

  // Per-card buttons: positions count the full narrated list (e.g. 5/51).
  qs("#theory-content").addEventListener("click", (event) => {
    const button = event.target.closest(
      ".theory-card__listen, .theory-card__replay",
    );
    if (!button) return;
    const index = playlist.findIndex(
      (item) => item.id === button.dataset.cardId,
    );
    if (index < 0) return;
    if (button.classList.contains("theory-card__replay")) {
      replayAt(index);
    } else {
      playAt(index);
    }
  });

  // Sidebar rows go through the same path; cards without narration fall back
  // to the scroll behavior wired in wirePlaylistNav.
  playCardById = (id) => {
    const index = playlist.findIndex((item) => item.id === id);
    if (index < 0) return false;
    playAt(index);
    return true;
  };

  // Audio keeps playing across navigation otherwise - stop it on the way out.
  window.addEventListener("pagehide", () => player.stop());

  bar.hidden = false;
}

async function start() {
  let data;
  try {
    data = await loadCards();
  } catch (err) {
    qs("#theory-content").innerHTML =
      `<section class="rule-section"><p>Could not load the theory: ${escapeHtml(err.message)}</p></section>`;
    return;
  }
  render(data);
  wirePlaylistNav();
  wireBackToTop();
  wireListen(data.cards);
}

start();
