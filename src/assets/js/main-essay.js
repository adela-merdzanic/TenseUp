import { qs, escapeHtml, shuffle } from "./utils.js";
import { initTheme, wireThemeToggle } from "./theme.js";
import { getSubjectConfig } from "./subject.js";
import { loadEssayCards } from "./data-loader.js";
import { getBoxes, setBox, resetBoxes, MASTERED_BOX } from "./essay-store.js";
import {
  getEssaySettings,
  ESSAY_SHORT_SESSION_SIZE,
} from "./settings-store.js";
import { DIAGRAMS } from "./essay-diagrams.js";

initTheme();
wireThemeToggle();

let cards = [];
let categories = [];
let selectedCategories = null; // null = all categories
let sessionSize = "all";
let mode = "recall"; // "recall" or "write" (type the answer before revealing)
let deck = [];
let deckIndex = 0;

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
  qs("#mastery").title =
    `Mastery ${Math.min(box, MASTERED_BOX)}/${MASTERED_BOX}`;
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

  const writeArea = qs("#write-area");
  const writeInput = qs("#write-input");
  writeArea.hidden = mode !== "write";
  if (mode === "write") {
    writeInput.value = "";
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
  const mastered = pool.filter(
    (c) => (boxes[c.id] ?? 0) >= MASTERED_BOX,
  ).length;
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
    const config = await getSubjectConfig();
    data = await loadEssayCards(config);
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
  mode = settings.mode;
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
