import { initTheme, wireThemeToggle } from "./theme.js";
import { qs } from "./utils.js";

initTheme();
wireThemeToggle();

// Back-to-top button (rules page only; contribute.html shares this script).
// The button shows once the table of contents scrolls out of view.
const backToTop = qs("#back-to-top");
const toc = qs(".rules-toc");
if (backToTop && toc && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(([entry]) => {
    backToTop.classList.toggle("is-visible", !entry.isIntersecting);
  });
  observer.observe(toc);

  backToTop.addEventListener("click", () => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    qs("#rules-heading").focus({ preventScroll: true });
  });
}
