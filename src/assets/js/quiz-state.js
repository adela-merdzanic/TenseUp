export function createState(session) {
  return {
    session,
    currentIndex: 0,
    score: 0,
    history: session.map(() => null), // null = unanswered, else { selected, result }
  };
}

export function currentQuestion(state) {
  return state.session[state.currentIndex];
}

export function currentHistory(state) {
  return state.history[state.currentIndex];
}

export function recordAnswer(state, selected, result) {
  state.history[state.currentIndex] = { selected, result };
  if (result.isCorrect) {
    state.score += 1;
  }
}

export function hasPrevious(state) {
  return state.currentIndex > 0;
}

export function hasNext(state) {
  return state.currentIndex < state.session.length - 1;
}

export function goToPrevious(state) {
  state.currentIndex -= 1;
}

export function goToNext(state) {
  state.currentIndex += 1;
}

export function isLastQuestion(state) {
  return state.currentIndex === state.session.length - 1;
}
