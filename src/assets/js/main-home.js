import { loadAllTopics } from "./data-loader.js";
import { buildMixedPool } from "./quiz-engine.js";
import { getSolvedIds, resetProgress } from "./progress-store.js";
import { getSettings, saveSettings } from "./settings-store.js";
import { qs, qsa, escapeHtml } from "./utils.js";
import { initTheme, wireThemeToggle } from "./theme.js";

initTheme();
wireThemeToggle();

let pool = [];
let topicsMeta = []; // [{ topicId, title }] in manifest order

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

function renderProgressCard() {
  const solved = getSolvedIds();
  const solvedCount = pool.filter((question) =>
    solved.has(question.namespacedId),
  ).length;
  const total = pool.length;
  const percent = total === 0 ? 0 : Math.round((solvedCount / total) * 100);

  qs("#solved-count").textContent = solvedCount;
  qs("#total-count").textContent = `/ ${total}`;
  qs("#overall-bar-fill").style.width = `${percent}%`;
  qs("#stats-text").textContent = `${percent}% of the question pool mastered.`;
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

async function init() {
  try {
    const topics = await loadAllTopics();
    pool = buildMixedPool(topics);
    topicsMeta = topics.map((topic) => ({
      topicId: topic.topicId,
      title: topic.title,
    }));
  } catch (err) {
    qs("#stats-text").textContent =
      `Could not load quiz content: ${err.message}`;
    return;
  }
  renderProgressCard();
  renderTopicList();
  wireSessionSize();
}

qs("#reset-btn").addEventListener("click", () => {
  resetProgress();
  renderProgressCard();
  renderTopicList();
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
