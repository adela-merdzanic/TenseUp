import { subjectKey } from "./subject.js";

const STORAGE_KEY = subjectKey("quizSettings");

export const SHORT_SESSION_SIZE = 20;

// topicIds: null means "all topics" (so newly added topics are included
// automatically); an array means an explicit selection.
// order: "shuffle" (random each session) or "sequential" (questions in the
// order the manifest and files list them).
const DEFAULTS = { sessionSize: "all", topicIds: null, order: "shuffle" };

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      sessionSize: parsed.sessionSize === "short" ? "short" : "all",
      topicIds: Array.isArray(parsed.topicIds) ? parsed.topicIds : null,
      order: parsed.order === "sequential" ? "sequential" : "shuffle",
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

const ESSAY_STORAGE_KEY = subjectKey("essaySettings");

export const ESSAY_SHORT_SESSION_SIZE = 5;

// categoryIds: null means "all categories" (so categories added later are
// included automatically); an array means an explicit selection.
// mode: "recall" (read and answer out loud) or "write" (type the answer first).
const ESSAY_DEFAULTS = {
  sessionSize: "all",
  categoryIds: null,
  mode: "recall",
};

export function getEssaySettings() {
  try {
    const raw = localStorage.getItem(ESSAY_STORAGE_KEY);
    if (!raw) return { ...ESSAY_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      sessionSize: parsed.sessionSize === "short" ? "short" : "all",
      categoryIds: Array.isArray(parsed.categoryIds)
        ? parsed.categoryIds
        : null,
      mode: parsed.mode === "write" ? "write" : "recall",
    };
  } catch {
    return { ...ESSAY_DEFAULTS };
  }
}

export function saveEssaySettings(settings) {
  try {
    localStorage.setItem(ESSAY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable - settings just won't persist.
  }
}
