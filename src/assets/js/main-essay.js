import { qs, escapeHtml, shuffle } from "./utils.js";
import { initTheme, wireThemeToggle } from "./theme.js";
import { getBoxes, setBox, resetBoxes, MASTERED_BOX } from "./essay-store.js";
import {
  getEssaySettings,
  ESSAY_SHORT_SESSION_SIZE,
} from "./settings-store.js";

initTheme();
wireThemeToggle();

// Small inline SVG diagrams for topology cards, colored via CSS classes.
const DIAGRAMS = {
  bus: `
    <svg viewBox="0 0 320 110" role="img" aria-label="Bus topology diagram">
      <line class="diag-bus" x1="15" y1="82" x2="305" y2="82" />
      <line class="diag-line" x1="60" y1="46" x2="60" y2="82" />
      <line class="diag-line" x1="130" y1="46" x2="130" y2="82" />
      <line class="diag-line" x1="200" y1="46" x2="200" y2="82" />
      <line class="diag-line" x1="270" y1="46" x2="270" y2="82" />
      <rect class="diag-node" x="44" y="20" width="32" height="26" rx="5" />
      <rect class="diag-node" x="114" y="20" width="32" height="26" rx="5" />
      <rect class="diag-node" x="184" y="20" width="32" height="26" rx="5" />
      <rect class="diag-node" x="254" y="20" width="32" height="26" rx="5" />
    </svg>`,
  star: `
    <svg viewBox="0 0 320 160" role="img" aria-label="Star topology diagram">
      <line class="diag-line" x1="160" y1="80" x2="65" y2="35" />
      <line class="diag-line" x1="160" y1="80" x2="255" y2="35" />
      <line class="diag-line" x1="160" y1="80" x2="65" y2="125" />
      <line class="diag-line" x1="160" y1="80" x2="255" y2="125" />
      <line class="diag-line" x1="160" y1="80" x2="160" y2="22" />
      <line class="diag-line" x1="160" y1="80" x2="160" y2="138" />
      <circle class="diag-hub" cx="160" cy="80" r="15" />
      <rect class="diag-node" x="49" y="22" width="32" height="26" rx="5" />
      <rect class="diag-node" x="239" y="22" width="32" height="26" rx="5" />
      <rect class="diag-node" x="49" y="112" width="32" height="26" rx="5" />
      <rect class="diag-node" x="239" y="112" width="32" height="26" rx="5" />
      <rect class="diag-node" x="144" y="6" width="32" height="26" rx="5" />
      <rect class="diag-node" x="144" y="128" width="32" height="26" rx="5" />
    </svg>`,
  ring: `
    <svg viewBox="0 0 320 190" role="img" aria-label="Ring topology diagram">
      <line class="diag-line" x1="160" y1="28" x2="270" y2="75" />
      <line class="diag-line" x1="270" y1="75" x2="230" y2="160" />
      <line class="diag-line" x1="230" y1="160" x2="90" y2="160" />
      <line class="diag-line" x1="90" y1="160" x2="50" y2="75" />
      <line class="diag-line" x1="50" y1="75" x2="160" y2="28" />
      <rect class="diag-node" x="144" y="15" width="32" height="26" rx="5" />
      <rect class="diag-node" x="254" y="62" width="32" height="26" rx="5" />
      <rect class="diag-node" x="214" y="147" width="32" height="26" rx="5" />
      <rect class="diag-node" x="74" y="147" width="32" height="26" rx="5" />
      <rect class="diag-node" x="34" y="62" width="32" height="26" rx="5" />
    </svg>`,
  mesh: `
    <svg viewBox="0 0 320 190" role="img" aria-label="Mesh topology diagram">
      <line class="diag-line" x1="160" y1="30" x2="70" y2="80" />
      <line class="diag-line" x1="160" y1="30" x2="250" y2="80" />
      <line class="diag-line" x1="160" y1="30" x2="105" y2="155" />
      <line class="diag-line" x1="160" y1="30" x2="215" y2="155" />
      <line class="diag-line" x1="70" y1="80" x2="250" y2="80" />
      <line class="diag-line" x1="70" y1="80" x2="105" y2="155" />
      <line class="diag-line" x1="70" y1="80" x2="215" y2="155" />
      <line class="diag-line" x1="250" y1="80" x2="105" y2="155" />
      <line class="diag-line" x1="250" y1="80" x2="215" y2="155" />
      <line class="diag-line" x1="105" y1="155" x2="215" y2="155" />
      <rect class="diag-node" x="144" y="17" width="32" height="26" rx="5" />
      <rect class="diag-node" x="54" y="67" width="32" height="26" rx="5" />
      <rect class="diag-node" x="234" y="67" width="32" height="26" rx="5" />
      <rect class="diag-node" x="89" y="142" width="32" height="26" rx="5" />
      <rect class="diag-node" x="199" y="142" width="32" height="26" rx="5" />
    </svg>`,
};

let cards = [];
let categories = [];
let selectedCategories = null; // null = all categories
let sessionSize = "all";
let deck = [];
let deckIndex = 0;

async function loadCards() {
  const response = await fetch("data/essay-cards.json");
  if (!response.ok) {
    throw new Error(`Failed to load essay-cards.json (${response.status})`);
  }
  return response.json();
}

function filteredPool() {
  return cards.filter(
    (card) => !selectedCategories || selectedCategories.has(card.category),
  );
}

function categoryTitle(id) {
  const category = categories.find((entry) => entry.id === id);
  return category ? category.title : id;
}

// Cards you don't know come first: sort by Leitner box, shuffle within a box.
function buildDeck() {
  const boxes = getBoxes();
  const byBox = Array.from({ length: MASTERED_BOX + 1 }, () => []);
  for (const card of filteredPool()) {
    const box = Math.min(boxes[card.id] ?? 0, MASTERED_BOX);
    byBox[box].push(card);
  }
  deck = byBox.flatMap((group) => shuffle(group));
  // Short session: the first N cards of the box-ordered deck, i.e. the
  // cards you currently know least.
  if (sessionSize === "short" && deck.length > ESSAY_SHORT_SESSION_SIZE) {
    deck = deck.slice(0, ESSAY_SHORT_SESSION_SIZE);
  }
  deckIndex = 0;
}

function masteredCount() {
  const boxes = getBoxes();
  return filteredPool().filter((card) => boxes[card.id] === MASTERED_BOX)
    .length;
}

function renderProgress() {
  const position = Math.min(deckIndex + 1, deck.length);
  qs("#deck-progress").textContent =
    `Card ${position}/${deck.length} · Mastered ${masteredCount()}/${filteredPool().length}`;
  const percent = deck.length === 0 ? 0 : (deckIndex / deck.length) * 100;
  qs("#deck-bar-fill").style.width = `${percent}%`;
}

function renderMastery(box) {
  const percent = (Math.min(box, MASTERED_BOX) / MASTERED_BOX) * 100;
  qs("#mastery-fill").style.strokeDashoffset = `${100 - percent}`;
  qs("#mastery").setAttribute(
    "aria-label",
    `Mastery ${Math.min(box, MASTERED_BOX)}/${MASTERED_BOX}`,
  );
  qs("#mastery").title = `Mastery ${Math.min(box, MASTERED_BOX)}/${MASTERED_BOX}`;
}

function showCard() {
  if (deck.length === 0 || deckIndex >= deck.length) {
    showDone();
    return;
  }

  const card = deck[deckIndex];
  qs("#card-screen").hidden = false;
  qs("#done-screen").hidden = true;

  qs("#card-category").textContent = categoryTitle(card.category);
  qs("#card-question").textContent = card.question;
  renderMastery(getBoxes()[card.id] ?? 0);

  qs("#answer-core").innerHTML = card.core
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");

  const mnemonic = qs("#card-mnemonic");
  mnemonic.hidden = !card.mnemonic;
  if (card.mnemonic) {
    mnemonic.innerHTML = `<strong>Remember:</strong> ${escapeHtml(card.mnemonic)}`;
  }

  const diagram = qs("#card-diagram");
  diagram.hidden = !card.diagram;
  diagram.innerHTML = card.diagram ? DIAGRAMS[card.diagram] || "" : "";

  const more = qs("#card-more");
  more.hidden = !card.more || card.more.length === 0;
  more.open = false;
  if (card.more) {
    qs("#answer-more").innerHTML = card.more
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");
  }

  qs("#card-answer").hidden = true;
  qs("#show-btn").hidden = false;
  qs("#grade-actions").hidden = true;
  qs("#pass-btn").disabled = false;
  qs("#fail-btn").disabled = false;

  renderProgress();
}

function revealAnswer() {
  qs("#card-answer").hidden = false;
  qs("#show-btn").hidden = true;
  qs("#grade-actions").hidden = false;
}

function grade(knewIt) {
  const card = deck[deckIndex];
  const boxes = getBoxes();
  const current = boxes[card.id] ?? 0;
  const next = knewIt ? Math.min(MASTERED_BOX, current + 1) : 0;
  setBox(card.id, next);

  // Show the ring tick up (or empty) before moving on.
  qs("#pass-btn").disabled = true;
  qs("#fail-btn").disabled = true;
  renderMastery(next);
  setTimeout(() => {
    deckIndex += 1;
    showCard();
  }, 400);
}

function showDone() {
  qs("#card-screen").hidden = true;
  qs("#done-screen").hidden = false;

  const boxes = getBoxes();
  const pool = filteredPool();
  const mastered = pool.filter((c) => (boxes[c.id] ?? 0) >= MASTERED_BOX).length;
  const tricky = pool.filter((c) => (boxes[c.id] ?? 0) === 0).length;
  const learning = pool.length - mastered - tricky;

  qs("#done-text").textContent =
    `Mastered ${mastered}/${pool.length} · still learning ${learning} · tricky ${tricky}. ` +
    (mastered === pool.length
      ? "Everything mastered - nice work!"
      : "Cards you didn't know will come first in the next run.");
  qs("#deck-progress").textContent = "";
  qs("#deck-bar-fill").style.width = "100%";
}

async function start() {
  let data;
  try {
    data = await loadCards();
  } catch (err) {
    qs("#error-text").textContent = `Could not load flashcards: ${err.message}`;
    qs("#error-screen").hidden = false;
    return;
  }

  cards = data.cards;
  categories = data.categories;

  // Categories and session length are chosen on the start screen; ignore
  // stored ids that no longer exist (e.g. a renamed category).
  const settings = getEssaySettings();
  sessionSize = settings.sessionSize;
  if (settings.categoryIds) {
    const known = new Set(cards.map((card) => card.category));
    const valid = settings.categoryIds.filter((id) => known.has(id));
    selectedCategories = valid.length > 0 ? new Set(valid) : null;
  }

  buildDeck();
  showCard();

  qs("#show-btn").addEventListener("click", revealAnswer);
  qs("#pass-btn").addEventListener("click", () => grade(true));
  qs("#fail-btn").addEventListener("click", () => grade(false));
  qs("#again-btn").addEventListener("click", () => {
    buildDeck();
    showCard();
  });
  qs("#reset-cards-btn").addEventListener("click", () => {
    resetBoxes();
    buildDeck();
    showCard();
  });
}

start();
