const STORAGE_KEY = "essayProgress:boxes";

// Leitner boxes: 0 = new/didn't know, 1-2 = learning, 3 = mastered
// (three consecutive "knew it" answers to master a card).
export const MASTERED_BOX = 3;

export function getBoxes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export function setBox(cardId, box) {
  const boxes = getBoxes();
  boxes[cardId] = box;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
  } catch {
    // localStorage unavailable - progress just won't persist.
  }
}

export function resetBoxes() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
