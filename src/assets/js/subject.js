// Every subject-scoped page carries the active subject in the URL as
// ?subject=<id>. This module is the single source of truth for reading that id,
// building per-subject data paths and namespacing stored progress, so the rest
// of the app never has to know how subjects are wired.

export const DEFAULT_SUBJECT = "english";

export function getSubjectId() {
  const id = new URLSearchParams(location.search).get("subject");
  return id && id.trim() !== "" ? id : DEFAULT_SUBJECT;
}

export async function loadSubjects() {
  const response = await fetch("data/subjects.json");
  if (!response.ok) {
    throw new Error(`Failed to load subjects.json (${response.status})`);
  }
  return (await response.json()).subjects;
}

export async function getSubjectConfig(id = getSubjectId()) {
  const subjects = await loadSubjects();
  return subjects.find((subject) => subject.id === id) || null;
}

export function subjectHasFeature(config, feature) {
  return Boolean(
    config && config.features && config.features.includes(feature),
  );
}

// The data directory of a subject; falls back to the id when dir is omitted.
export function subjectDir(config) {
  return (config && config.dir) || getSubjectId();
}

// Append ?subject=<id> to an internal link, preserving any existing query.
export function withSubject(href, id = getSubjectId()) {
  const url = new URL(href, location.href);
  url.searchParams.set("subject", id);
  return url.pathname.split("/").pop() + url.search + url.hash;
}

// Storage keys gain a :<subject> suffix so each subject keeps its own progress
// and settings. e.g. "quizProgress:solved" -> "quizProgress:solved:english".
export function subjectKey(base, id = getSubjectId()) {
  return `${base}:${id}`;
}

// One-time move of the pre-subjects (global) keys into the English namespace,
// so existing users keep their grammar/essay progress after the split.
const MIGRATION_FLAG = "tenseup:subjectsMigrated";
const LEGACY_KEYS = [
  "quizProgress:solved",
  "quizSettings",
  "essayProgress:boxes",
  "essaySettings",
];

function migrateLegacyKeys() {
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return;
    for (const legacy of LEGACY_KEYS) {
      const value = localStorage.getItem(legacy);
      const target = subjectKey(legacy, DEFAULT_SUBJECT);
      if (value !== null && localStorage.getItem(target) === null) {
        localStorage.setItem(target, value);
      }
    }
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    // localStorage unavailable - nothing to migrate.
  }
}

migrateLegacyKeys();
