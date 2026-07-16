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
    : "Not correct.";
  qs("#feedback-result").className =
    `feedback-result ${result.isCorrect ? "is-correct" : "is-incorrect"}`;
  qs("#topic-tag").textContent =
    `Topic: ${question.topicTitle} - ${question.sourceTaskName}`;
  qs("#rule-box").textContent = question.context || question.grammarRule;

  // Optional wider context behind a "Show more" disclosure. `details` may be a
  // single paragraph (string) or a list of points (array), e.g. one line per
  // wrong option.
  const moreEl = qs("#feedback-more");
  const hasDetails = Array.isArray(question.details)
    ? question.details.length > 0
    : Boolean(question.details);
  moreEl.hidden = !hasDetails;
  moreEl.open = false;
  if (hasDetails) {
    qs("#feedback-details").innerHTML = Array.isArray(question.details)
      ? `<ul>${question.details.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
      : `<p>${escapeHtml(question.details)}</p>`;
  }

  // Small print: the source PDF, and the note underneath it when there is one.
  const sourceEl = qs("#feedback-source");
  sourceEl.hidden = !question.sourcePdf;
  if (question.sourcePdf)
    sourceEl.textContent = `Source: ${question.sourcePdf}`;

  const noteEl = qs("#feedback-note");
  noteEl.hidden = !question.note;
  if (question.note) noteEl.textContent = question.note;

  // Optional "Further reading" pointers to specific material sections/pages.
  // `readMore` may be a single string or an array of pointers.
  const readMoreEl = qs("#feedback-readmore");
  const hasReadMore = Array.isArray(question.readMore)
    ? question.readMore.length > 0
    : Boolean(question.readMore);
  readMoreEl.hidden = !hasReadMore;
  if (hasReadMore) {
    const items = Array.isArray(question.readMore)
      ? question.readMore
      : [question.readMore];
    qs("#feedback-readmore-list").innerHTML = items
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");
  }

  qs("#feedback").hidden = false;
}

// Renders a question either fresh (unanswered, interactive) or in review mode
// (historyEntry present: shows the previously given answer + feedback, read-only).
export function renderQuestion(question, historyEntry) {
  qs("#question-screen").hidden = false;
  qs("#empty-screen").hidden = true;
  qs("#summary-screen").hidden = true;

  // Questions transcribed from exams whose official answer clashes with the
  // materials carry an `uncertain` flag; show the corner badge right away so
  // the answer is taken with a grain of salt.
  qs("#uncertain-badge").hidden = !question.uncertain;

  renderTaskSetup(question);

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

// Optional shared task setup shown above the question (e.g. a process table for
// scheduling exercises). `taskSetup` may carry `text` and/or a `table`
// ({ headers: [...], rows: [[...], ...] }); all cells are escaped.
function renderTaskSetup(question) {
  const el = qs("#task-setup");
  const setup = question.taskSetup;
  if (!setup) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  let html = "";
  if (setup.text) {
    html += `<p class="task-setup__text">${escapeHtml(setup.text)}</p>`;
  }
  if (setup.table && Array.isArray(setup.table.rows)) {
    const headers = (setup.table.headers || [])
      .map((h) => `<th>${escapeHtml(h)}</th>`)
      .join("");
    const rows = setup.table.rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`,
      )
      .join("");
    html +=
      `<div class="task-setup__table-wrap"><table class="task-setup__table">` +
      `<thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  el.innerHTML = html;
  el.hidden = html === "";
}

export function getSelectedOptions() {
  return Array.from(qs("#options-form").querySelectorAll("input:checked")).map(
    (input) => input.value,
  );
}

export function renderFeedback(result, question) {
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
        <p class="review-yours">Your answer: ${selected.length ? selected.map(escapeHtml).join(", ") : "(no answer)"}</p>
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
