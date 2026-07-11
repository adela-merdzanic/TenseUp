import { loadAllTopics, loadEssayCards } from "./data-loader.js";
import { getSubjectConfig, subjectHasFeature, withSubject } from "./subject.js";
import { buildMixedPool } from "./quiz-engine.js";
import { getSolvedIds, resetProgress } from "./progress-store.js";
import {
  getSettings,
  saveSettings,
  getEssaySettings,
  saveEssaySettings,
} from "./settings-store.js";
import { getBoxes, resetBoxes, MASTERED_BOX } from "./essay-store.js";
import { qs, qsa, escapeHtml } from "./utils.js";
import { initTheme, wireThemeToggle } from "./theme.js";

initTheme();
wireThemeToggle();

let pool = [];
let topicsMeta = []; // [{ topicId, title }] in manifest order
let essayCards = [];
let essayCategories = [];

function computeTopicStats() {
  const solved = getSolvedIds();
  const stats = new Map();
  for (const question of pool) {
    if (!stats.has(question.topicId)) {
      stats.set(question.topicId, { total: 0, solved: 0 });
    }
    const entry = stats.get(question.topicId);
    entry.total += 1;
    if (solved.has(question.namespacedId)) entry.solved += 1;
  }
  return stats;
}

function renderMasteryBars() {
  const solved = getSolvedIds();
  const solvedCount = pool.filter((question) =>
    solved.has(question.namespacedId),
  ).length;
  const total = pool.length;
  const grammarPercent =
    total === 0 ? 0 : Math.round((solvedCount / total) * 100);
  qs("#grammar-count").textContent = `${solvedCount}/${total}`;
  qs("#grammar-percent").textContent = `${grammarPercent}%`;
  qs("#grammar-bar-fill").style.width = `${grammarPercent}%`;

  const boxes = getBoxes();
  const mastered = essayCards.filter(
    (card) => (boxes[card.id] ?? 0) >= MASTERED_BOX,
  ).length;
  const cardTotal = essayCards.length;
  const essayPercent =
    cardTotal === 0 ? 0 : Math.round((mastered / cardTotal) * 100);
  qs("#essay-count").textContent = `${mastered}/${cardTotal}`;
  qs("#essay-percent").textContent = `${essayPercent}%`;
  qs("#essay-bar-fill").style.width = `${essayPercent}%`;
}

function computeEssayCategoryStats() {
  const boxes = getBoxes();
  const stats = new Map();
  for (const card of essayCards) {
    if (!stats.has(card.category)) {
      stats.set(card.category, { total: 0, mastered: 0 });
    }
    const entry = stats.get(card.category);
    entry.total += 1;
    if ((boxes[card.id] ?? 0) >= MASTERED_BOX) entry.mastered += 1;
  }
  return stats;
}

function renderEssayCategoryList() {
  const stats = computeEssayCategoryStats();
  const selected = getEssaySettings().categoryIds; // null = all selected

  qs("#essay-topic-list").innerHTML = essayCategories
    .map(({ id, title }) => {
      const entry = stats.get(id) || { total: 0, mastered: 0 };
      const checked = !selected || selected.includes(id) ? "checked" : "";
      const doneClass =
        entry.total > 0 && entry.mastered === entry.total
          ? " topic-row--done"
          : "";
      return `
        <label class="topic-row${doneClass}">
          <input type="checkbox" value="${escapeHtml(id)}" ${checked} />
          <span class="topic-name">${escapeHtml(title)}</span>
          <span class="topic-progress">${entry.mastered}/${entry.total}</span>
        </label>`;
    })
    .join("");

  qsa("#essay-topic-list input").forEach((input) =>
    input.addEventListener("change", onEssaySelectionChange),
  );
  updateEssaySummary();
}

function readSelectedEssayCategoryIds() {
  return qsa("#essay-topic-list input:checked").map((input) => input.value);
}

function updateEssaySummary() {
  const selectedCount = readSelectedEssayCategoryIds().length;
  qs("#essay-topic-count").textContent =
    `${selectedCount}/${essayCategories.length} selected`;
  qs("#essay-toggle-all-btn").textContent =
    selectedCount === essayCategories.length ? "Clear all" : "Select all";
}

function onEssaySelectionChange() {
  const selected = readSelectedEssayCategoryIds();
  const settings = getEssaySettings();
  // Store null when everything is checked, so categories added later join automatically.
  settings.categoryIds =
    selected.length === essayCategories.length ? null : selected;
  saveEssaySettings(settings);
  if (selected.length > 0) qs("#essay-topic-hint").hidden = true;
  updateEssaySummary();
}

function setAllEssayCategories(checked) {
  qsa("#essay-topic-list input").forEach((input) => (input.checked = checked));
  onEssaySelectionChange();
}

function wireEssaySessionSize() {
  const settings = getEssaySettings();
  const current = qs(
    `input[name="essay-session-size"][value="${settings.sessionSize}"]`,
  );
  if (current) current.checked = true;

  qsa('input[name="essay-session-size"]').forEach((input) =>
    input.addEventListener("change", () => {
      const updated = getEssaySettings();
      updated.sessionSize = input.value === "short" ? "short" : "all";
      saveEssaySettings(updated);
    }),
  );
}

function wireEssayMode() {
  const settings = getEssaySettings();
  const current = qs(`input[name="essay-mode"][value="${settings.mode}"]`);
  if (current) current.checked = true;

  qsa('input[name="essay-mode"]').forEach((input) =>
    input.addEventListener("change", () => {
      const updated = getEssaySettings();
      updated.mode = input.value === "write" ? "write" : "recall";
      saveEssaySettings(updated);
    }),
  );
}

function renderTopicList() {
  const stats = computeTopicStats();
  const selected = getSettings().topicIds; // null = all selected

  qs("#topic-list").innerHTML = topicsMeta
    .map(({ topicId, title }) => {
      const entry = stats.get(topicId) || { total: 0, solved: 0 };
      const checked = !selected || selected.includes(topicId) ? "checked" : "";
      const doneClass =
        entry.total > 0 && entry.solved === entry.total
          ? " topic-row--done"
          : "";
      return `
        <label class="topic-row${doneClass}">
          <input type="checkbox" value="${escapeHtml(topicId)}" ${checked} />
          <span class="topic-name">${escapeHtml(title)}</span>
          <span class="topic-progress">${entry.solved}/${entry.total}</span>
        </label>`;
    })
    .join("");

  qsa("#topic-list input").forEach((input) =>
    input.addEventListener("change", onSelectionChange),
  );
  updateTopicSummary();
}

function readSelectedTopicIds() {
  return qsa("#topic-list input:checked").map((input) => input.value);
}

function updateTopicSummary() {
  const selectedCount = readSelectedTopicIds().length;
  qs("#topic-count").textContent =
    `${selectedCount}/${topicsMeta.length} selected`;
  qs("#toggle-all-btn").textContent =
    selectedCount === topicsMeta.length ? "Clear all" : "Select all";
}

function onSelectionChange() {
  const selected = readSelectedTopicIds();
  const settings = getSettings();
  // Store null when everything is checked, so topics added later join automatically.
  settings.topicIds = selected.length === topicsMeta.length ? null : selected;
  saveSettings(settings);
  if (selected.length > 0) qs("#topic-hint").hidden = true;
  updateTopicSummary();
}

function setAllTopics(checked) {
  qsa("#topic-list input").forEach((input) => (input.checked = checked));
  onSelectionChange();
}

function wireSessionSize() {
  const settings = getSettings();
  const current = qs(
    `input[name="session-size"][value="${settings.sessionSize}"]`,
  );
  if (current) current.checked = true;

  qsa('input[name="session-size"]').forEach((input) =>
    input.addEventListener("change", () => {
      const updated = getSettings();
      updated.sessionSize = input.value === "short" ? "short" : "all";
      saveSettings(updated);
    }),
  );
}

function wireOrder() {
  const settings = getSettings();
  const current = qs(`input[name="order"][value="${settings.order}"]`);
  if (current) current.checked = true;

  qsa('input[name="order"]').forEach((input) =>
    input.addEventListener("change", () => {
      const updated = getSettings();
      updated.order = input.value === "sequential" ? "sequential" : "shuffle";
      saveSettings(updated);
    }),
  );
}

// Fill the hero, card title and start-button links from the subject, and hide
// the quiz/essay card for subjects that don't have that feature.
function applySubject(config, hasQuiz, hasEssay) {
  if (config) {
    document.title = `TenseUp - ${config.title}`;
    qs("#home-title").textContent = config.title;
    if (config.subtitle) qs("#home-subtitle").textContent = config.subtitle;
    qs("#grammar-card-label").textContent = config.quizLabel || "Practice";
  }
  qs("#start-btn").href = withSubject("quiz.html");
  qs("#start-essay-btn").href = withSubject("essay.html");
  if (!hasQuiz) qs("#grammar-card").hidden = true;
  if (!hasEssay) qs("#essay-card").hidden = true;
}

async function init() {
  let config = null;
  try {
    config = await getSubjectConfig();
  } catch {
    /* Fall back to whatever data the default subject can load. */
  }
  const hasQuiz = subjectHasFeature(config, "quiz");
  const hasEssay = subjectHasFeature(config, "essay");
  applySubject(config, hasQuiz, hasEssay);

  try {
    const [topics, essayData] = await Promise.all([
      hasQuiz ? loadAllTopics(config) : Promise.resolve([]),
      hasEssay ? loadEssayCards(config) : Promise.resolve(null),
    ]);
    pool = buildMixedPool(topics);
    topicsMeta = topics.map((topic) => ({
      topicId: topic.topicId,
      title: topic.title,
    }));
    if (essayData) {
      essayCards = essayData.cards;
      essayCategories = essayData.categories;
    }
  } catch (err) {
    const statsText = qs("#stats-text");
    statsText.hidden = false;
    statsText.textContent = `Could not load content: ${err.message}`;
    return;
  }
  renderMasteryBars();
  renderTopicList();
  renderEssayCategoryList();
  wireSessionSize();
  wireOrder();
  wireEssaySessionSize();
  wireEssayMode();
}

// Reset wipes stored progress, so it takes two clicks: the first arms the
// button, the second (within 4 seconds) confirms. Anything else disarms it.
function wireResetButton(button, onReset) {
  let armed = false;
  let disarmTimer = 0;

  const disarm = () => {
    armed = false;
    clearTimeout(disarmTimer);
    button.textContent = "Reset";
    button.classList.remove("is-armed");
  };

  button.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      button.textContent = "Confirm reset";
      button.classList.add("is-armed");
      disarmTimer = setTimeout(disarm, 4000);
      return;
    }
    disarm();
    onReset();
  });

  button.addEventListener("blur", disarm);
}

wireResetButton(qs("#reset-btn"), () => {
  resetProgress();
  renderMasteryBars();
  renderTopicList();
});

wireResetButton(qs("#reset-essay-btn"), () => {
  resetBoxes();
  renderMasteryBars();
  renderEssayCategoryList();
});

qs("#essay-toggle-all-btn").addEventListener("click", () => {
  const allSelected =
    essayCategories.length > 0 &&
    readSelectedEssayCategoryIds().length === essayCategories.length;
  setAllEssayCategories(!allSelected);
});

qs("#start-essay-btn").addEventListener("click", (event) => {
  if (
    essayCategories.length > 0 &&
    readSelectedEssayCategoryIds().length === 0
  ) {
    event.preventDefault();
    qs("#essay-topic-hint").hidden = false;
  }
});

qs("#toggle-all-btn").addEventListener("click", () => {
  const allSelected =
    topicsMeta.length > 0 &&
    readSelectedTopicIds().length === topicsMeta.length;
  setAllTopics(!allSelected);
});

qs("#start-btn").addEventListener("click", (event) => {
  if (topicsMeta.length > 0 && readSelectedTopicIds().length === 0) {
    event.preventDefault();
    qs("#topic-hint").hidden = false;
  }
});

init();
