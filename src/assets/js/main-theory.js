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
  // a checkbox to include the card in "Play selected" and a "start listening
  // here" button.
  const listen = `<span class="theory-card__audio" hidden>
       <label class="theory-card__pick" title="Include in Play selected">
         <input type="checkbox" data-card-id="${escapeHtml(card.id)}" aria-label="Include this card in Play selected" />
       </label>
       <button type="button" class="btn btn-sm theory-card__listen" data-card-id="${escapeHtml(card.id)}">
         <span aria-hidden="true">▶</span> Listen
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
}

function wireBackToTop() {
  const backToTop = qs("#back-to-top");
  const toc = qs(".rules-toc");
  if (!backToTop || !toc || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(([entry]) => {
    backToTop.classList.toggle("is-visible", !entry.isIntersecting);
  });
  observer.observe(toc);

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
  const stopBtn = qs("#listen-stop");
  const nowLabel = qs("#listen-now");
  const rateBtn = qs("#listen-rate");

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

  const clearHighlight = () =>
    qsa(".theory-card.is-speaking").forEach((el) =>
      el.classList.remove("is-speaking"),
    );

  const setPlayingUI = (playing) => {
    playBtn.hidden = playing;
    selectAllBtn.hidden = playing;
    prevBtn.hidden = !playing;
    toggleBtn.hidden = !playing;
    nextBtn.hidden = !playing;
    stopBtn.hidden = !playing;
    if (playing) {
      toggleBtn.textContent = "Pause";
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
    },
    onStop: () => setPlayingUI(false),
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

  toggleBtn.addEventListener("click", () => {
    if (player.isPaused()) {
      player.resume();
      toggleBtn.textContent = "Pause";
    } else {
      player.pause();
      toggleBtn.textContent = "Resume";
    }
  });

  stopBtn.addEventListener("click", () => player.stop());
  prevBtn.addEventListener("click", () => player.prev());
  nextBtn.addEventListener("click", () => player.next());

  rateBtn.addEventListener("click", () => {
    rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    rateBtn.textContent = `${rate}x`;
    player.setRate(rate);
  });

  // Per-card Listen: play from that card's position in the full narrated list
  // (e.g. 5/51). Listening to a card means including it, so an unticked card
  // gets ticked first.
  qs("#theory-content").addEventListener("click", (event) => {
    const button = event.target.closest(".theory-card__listen");
    if (!button) return;
    const index = playlist.findIndex(
      (item) => item.id === button.dataset.cardId,
    );
    if (index < 0) return;
    const box = checkboxOf(playlist[index]);
    if (!box.checked) {
      box.checked = true;
      updateSelectionUI();
    }
    startFrom(index);
  });

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
  wireBackToTop();
  wireListen(data.cards);
}

start();
