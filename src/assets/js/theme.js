const STORAGE_KEY = "quizTheme";

function updateToggleIcon() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  btn.textContent = isDark ? "☀️" : "🌙";
  btn.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme",
  );
}

export function initTheme() {
  // Note: an inline script in <head> already applies the theme before first
  // paint (to avoid a flash of the wrong theme); this mirrors the same logic
  // so state stays consistent for the rest of the page's lifetime.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  } catch {
    // localStorage unavailable - default light theme, no persistence.
  }
  updateToggleIcon();
}

export function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
  }
  try {
    localStorage.setItem(STORAGE_KEY, isDark ? "light" : "dark");
  } catch {
    // ignore persistence failure
  }
  updateToggleIcon();
}

export function wireThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", toggleTheme);
  }
}
