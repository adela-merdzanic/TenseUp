const STORAGE_KEY = "quizProgress:solved";

function readSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSet(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // localStorage unavailable (e.g. strict privacy mode) - progress just won't persist across visits.
  }
}

export function getSolvedIds() {
  return readSet();
}

export function markSolved(namespacedId) {
  const set = readSet();
  set.add(namespacedId);
  writeSet(set);
}

export function resetProgress() {
  writeSet(new Set());
}
