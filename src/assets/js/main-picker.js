import {
  loadSubjects,
  subjectKey,
  subjectHasFeature,
  withSubject,
} from "./subject.js";
import { loadAllTopics, loadEssayCards } from "./data-loader.js";
import { buildMixedPool } from "./quiz-engine.js";
import { MASTERED_BOX } from "./essay-store.js";
import { qs, escapeHtml } from "./utils.js";
import { initTheme, wireThemeToggle } from "./theme.js";

initTheme();
wireThemeToggle();

// Progress is read straight from storage here (not through the stores) because
// the picker reports on every subject at once, not just the active one.
function readSolved(id) {
  try {
    const raw = localStorage.getItem(subjectKey("quizProgress:solved", id));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function readBoxes(id) {
  try {
    return (
      JSON.parse(localStorage.getItem(subjectKey("essayProgress:boxes", id))) ||
      {}
    );
  } catch {
    return {};
  }
}

function percent(done, total) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function bar(label, done, total) {
  const pct = percent(done, total);
  return `
    <div class="mastery">
      <div class="overall-bar">
        <div class="overall-bar__fill" style="width:${pct}%"></div>
      </div>
      <div class="mastery-row">
        <span class="mastery-stats">
          ${label}: <strong>${done}/${total}</strong> · ${pct}%
        </span>
      </div>
    </div>`;
}

// Load a subject's content and turn stored progress into the numbers the card
// shows. A subject that fails to load still gets a card, just without stats.
async function buildStats(config) {
  const stats = { grammar: null, essay: null };
  try {
    const topics = await loadAllTopics(config);
    const pool = buildMixedPool(topics);
    const solved = readSolved(config.id);
    const done = pool.filter((q) => solved.has(q.namespacedId)).length;
    stats.grammar = { done, total: pool.length };
  } catch {
    /* Leave grammar stats off this card. */
  }
  if (subjectHasFeature(config, "essay")) {
    try {
      const { cards } = await loadEssayCards(config);
      const boxes = readBoxes(config.id);
      const done = cards.filter(
        (c) => (boxes[c.id] ?? 0) >= MASTERED_BOX,
      ).length;
      stats.essay = { done, total: cards.length };
    } catch {
      /* Leave essay stats off this card. */
    }
  }
  return stats;
}

function renderCard(config, stats) {
  const grammar = stats.grammar
    ? bar("Questions", stats.grammar.done, stats.grammar.total)
    : "";
  const essay = stats.essay
    ? bar("Essays", stats.essay.done, stats.essay.total)
    : "";
  const subtitle = config.subtitle
    ? `<p class="card-desc">${escapeHtml(config.subtitle)}</p>`
    : "";
  return `
    <section class="home-card subject-card">
      <h2 class="card-title">${escapeHtml(config.title)}</h2>
      ${subtitle}
      ${grammar}
      ${essay}
      <a href="${withSubject("dashboard.html", config.id)}" class="btn btn-primary btn-block">
        Open
      </a>
    </section>`;
}

async function init() {
  let subjects;
  try {
    subjects = await loadSubjects();
  } catch (err) {
    const error = qs("#picker-error");
    error.hidden = false;
    error.textContent = `Could not load subjects: ${err.message}`;
    return;
  }

  const stats = await Promise.all(subjects.map((config) => buildStats(config)));
  qs("#subject-grid").innerHTML = subjects
    .map((config, i) => renderCard(config, stats[i]))
    .join("");
}

init();
