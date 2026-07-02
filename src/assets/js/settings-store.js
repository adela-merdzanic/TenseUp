const STORAGE_KEY = "quizSettings";

export const SHORT_SESSION_SIZE = 20;

// topicIds: null means "all topics" (so newly added topics are included
// automatically); an array means an explicit selection.
const DEFAULTS = { sessionSize: "all", topicIds: null };

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      sessionSize: parsed.sessionSize === "short" ? "short" : "all",
      topicIds: Array.isArray(parsed.topicIds) ? parsed.topicIds : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable - settings just won't persist.
  }
}
