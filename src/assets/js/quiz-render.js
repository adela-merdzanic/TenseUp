import { qs, escapeHtml } from "./utils.js";

function renderOptionsMarkup(question) {
  const inputType = question.type === "single" ? "radio" : "checkbox";
  return question.options
    .map(
      (option, index) => `
      <label class="option" data-option="${escapeHtml(option)}">
        <input type="${inputType}" name="option" value="${escapeHtml(option)}" id="option-${index}" />
        <span>${escapeHtml(option)}</span>
      </label>`,
    )
    .join("");
}

function applyFeedbackClasses(question, selected) {
  qs("#options-form")
    .querySelectorAll(".option")
    .forEach((label) => {
      const optionValue = label.dataset.option;
      const isSelected = selected.includes(optionValue);
      const isCorrectOption = question.correctAnswers.includes(optionValue);

      if (isCorrectOption && isSelected) {
        label.classList.add("option--correct");
      } else if (isSelected && !isCorrectOption) {
        label.classList.add("option--incorrect");
      } else if (isCorrectOption && !isSelected) {
        label.classList.add("option--missed");
      }
    });
}

function showFeedbackPanel(result, question) {
  qs("#feedback-result").textContent = result.isCorrect
    ? "Correct!"
    : "Not quite.";
  qs("#feedback-result").className =
    `feedback-result ${result.isCorrect ? "is-correct" : "is-incorrect"}`;
  qs("#topic-tag").textContent =
    `Topic: ${question.topicTitle} - ${question.sourceTaskName}`;
  qs("#rule-box").textContent = question.context || question.grammarRule;

  // Small print: the source PDF, and the note underneath it when there is one.
  const sourceEl = qs("#feedback-source");
  sourceEl.hidden = !question.sourcePdf;
  if (question.sourcePdf)
    sourceEl.textContent = `Source: ${question.sourcePdf}`;

  const noteEl = qs("#feedback-note");
  noteEl.hidden = !question.note;
  if (question.note) noteEl.textContent = question.note;

  qs("#feedback").hidden = false;
}

// Renders a question either fresh (unanswered, interactive) or in review mode
// (historyEntry present: shows the previously given answer + feedback, read-only).
export function renderQuestion(question, historyEntry) {
  qs("#question-screen").hidden = false;
  qs("#empty-screen").hidden = true;
  qs("#summary-screen").hidden = true;
  qs("#select-hint").hidden = true;

  // Fill-in questions show a gap between the two halves; pure multiple-choice
  // questions (whole prompt in "before", nothing after) skip the gap marker.
  const { before, blank, after } = question.promptParts;
  const hasGap = (blank && blank.trim() !== "") || after.trim() !== "";
  qs("#sentence").innerHTML =
    escapeHtml(before) +
    (hasGap ? `<span class="blank">&nbsp;</span>` : "") +
    escapeHtml(after);

  qs("#options-form").innerHTML = renderOptionsMarkup(question);

  if (historyEntry) {
    const form = qs("#options-form");
    historyEntry.selected.forEach((value) => {
      const input = form.querySelector(`input[value="${CSSEscape(value)}"]`);
      if (input) input.checked = true;
    });
    form.querySelectorAll("input").forEach((input) => (input.disabled = true));
    applyFeedbackClasses(question, historyEntry.selected);
    showFeedbackPanel(historyEntry.result, question);
  } else {
    qs("#feedback").hidden = true;
  }
}

// Native CSS.escape isn't available in all contexts consistently for attribute
// selector values built from arbitrary text, so quote-escape manually instead.
function CSSEscape(value) {
  return value.replace(/["\\]/g, "\\$&");
}

export function getSelectedOptions() {
  return Array.from(qs("#options-form").querySelectorAll("input:checked")).map(
    (input) => input.value,
  );
}

export function showSelectHint() {
  qs("#select-hint").hidden = false;
}

export function renderFeedback(result, question) {
  qs("#select-hint").hidden = true;

  const form = qs("#options-form");
  form.querySelectorAll("input").forEach((input) => (input.disabled = true));

  applyFeedbackClasses(question, result.selected);
  showFeedbackPanel(result, question);
}

export function renderNavButtons({ showPrevious, showCheck, showNext }) {
  qs("#prev-btn").hidden = !showPrevious;
  qs("#check-btn").hidden = !showCheck;
  qs("#next-btn").hidden = !showNext;
}

export function renderProgress(currentIndex, total, score) {
  const position = Math.min(currentIndex + 1, total);
  qs("#progress-readout").textContent =
    `Question ${position}/${total} · Score: ${score}`;
  const percent = total === 0 ? 0 : (currentIndex / total) * 100;
  qs("#progress-bar-fill").style.width = `${percent}%`;
}

function clearProgress(fillPercent) {
  qs("#progress-readout").textContent = "";
  qs("#progress-bar-fill").style.width = `${fillPercent}%`;
}

export function renderEmptyState() {
  qs("#question-screen").hidden = true;
  qs("#summary-screen").hidden = true;
  qs("#empty-screen").hidden = false;
  clearProgress(0);
}

function renderReviewMarkup(mistakes) {
  if (mistakes.length === 0) {
    return `<p class="review-perfect">No mistakes to review - perfect session!</p>`;
  }

  const items = mistakes.map(({ question, selected }) => {
    const correct = question.correctAnswers.map(escapeHtml).join(" / ");
    return `
      <article class="review-item">
        <p class="review-sentence">${escapeHtml(question.promptParts.before)}<span class="review-answer">${correct}</span>${escapeHtml(question.promptParts.after)}</p>
        <p class="review-yours">Your answer: ${selected.map(escapeHtml).join(", ")}</p>
        <div class="rule-box">${escapeHtml(question.context || question.grammarRule)}</div>
      </article>`;
  });

  return (
    `<h3 class="review-title">Review your mistakes (${mistakes.length})</h3>` +
    items.join("")
  );
}

export function renderSummary(summary) {
  qs("#question-screen").hidden = true;
  qs("#empty-screen").hidden = true;
  qs("#summary-screen").hidden = false;
  qs("#summary-text").textContent =
    `You scored ${summary.score}/${summary.total} (${summary.percentage}%).`;
  qs("#summary-review").innerHTML = renderReviewMarkup(summary.mistakes);
  clearProgress(100);
}

export function renderError(message) {
  qs("#question-screen").hidden = true;
  qs("#empty-screen").hidden = true;
  qs("#summary-screen").hidden = true;
  qs("#error-screen").hidden = false;
  qs("#error-text").textContent = message;
  clearProgress(0);
}
