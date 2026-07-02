import { loadAllTopics } from "./data-loader.js";
import {
  buildMixedPool,
  filterByTopics,
  filterUnsolved,
  shuffledSession,
  checkAnswer,
  computeSummary,
} from "./quiz-engine.js";
import { markSolved, resetProgress } from "./progress-store.js";
import { getSettings, SHORT_SESSION_SIZE } from "./settings-store.js";
import {
  createState,
  currentQuestion,
  currentHistory,
  recordAnswer,
  hasPrevious,
  hasNext,
  goToPrevious,
  goToNext,
  isLastQuestion,
} from "./quiz-state.js";
import {
  renderQuestion,
  getSelectedOptions,
  showSelectHint,
  renderFeedback,
  renderNavButtons,
  renderProgress,
  renderEmptyState,
  renderSummary,
  renderError,
} from "./quiz-render.js";
import { qs } from "./utils.js";
import { initTheme, wireThemeToggle } from "./theme.js";

initTheme();
wireThemeToggle();

async function start() {
  let topics;
  try {
    topics = await loadAllTopics();
  } catch (err) {
    renderError(`Could not load quiz content: ${err.message}`);
    return;
  }

  const settings = getSettings();
  const pool = filterByTopics(buildMixedPool(topics), settings.topicIds);
  const unsolved = filterUnsolved(pool);

  if (unsolved.length === 0) {
    renderEmptyState();
    qs("#reset-from-empty-btn").addEventListener("click", () => {
      resetProgress();
      location.reload();
    });
    return;
  }

  let session = shuffledSession(unsolved);
  if (settings.sessionSize === "short" && session.length > SHORT_SESSION_SIZE) {
    session = session.slice(0, SHORT_SESSION_SIZE);
  }

  const state = createState(session);
  showQuestion(state);

  qs("#prev-btn").addEventListener("click", () => onPrevious(state));
  qs("#check-btn").addEventListener("click", () => onCheck(state));
  qs("#next-btn").addEventListener("click", () => onNext(state));
}

function showQuestion(state) {
  const question = currentQuestion(state);
  const historyEntry = currentHistory(state);
  renderQuestion(question, historyEntry);
  renderProgress(state.currentIndex, state.session.length, state.score);

  renderNavButtons({
    showPrevious: hasPrevious(state),
    showCheck: !historyEntry,
    showNext: Boolean(historyEntry),
  });
}

function onCheck(state) {
  if (currentHistory(state)) return; // already answered - ignore duplicate/rapid triggers

  const question = currentQuestion(state);
  const selected = getSelectedOptions();
  if (selected.length === 0) {
    showSelectHint();
    return;
  }

  const result = checkAnswer(question, selected);
  result.selected = selected;

  recordAnswer(state, selected, result);
  if (result.isCorrect) {
    markSolved(question.namespacedId);
  }

  renderFeedback(result, question);
  renderProgress(state.currentIndex, state.session.length, state.score);
  renderNavButtons({
    showPrevious: hasPrevious(state),
    showCheck: false,
    showNext: true,
  });
}

function onPrevious(state) {
  goToPrevious(state);
  showQuestion(state);
}

function onNext(state) {
  if (hasNext(state)) {
    goToNext(state);
    showQuestion(state);
  } else if (isLastQuestion(state)) {
    renderSummary(computeSummary(state));
  }
}

start();
