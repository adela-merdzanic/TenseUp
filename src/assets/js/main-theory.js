import { initTheme, wireThemeToggle } from "./theme.js";
import { qs, escapeHtml } from "./utils.js";
import { DIAGRAMS } from "./essay-diagrams.js";

initTheme();
wireThemeToggle();

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

  return `
    <article class="theory-card">
      <h3>${escapeHtml(card.question)}</h3>
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
}

start();
