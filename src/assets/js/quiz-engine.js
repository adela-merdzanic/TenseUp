import { shuffle, sameSet } from "./utils.js";
import { getSolvedIds } from "./progress-store.js";

export function buildMixedPool(topics) {
  const pool = [];
  for (const topic of topics) {
    for (const exercise of topic.exercises) {
      for (const question of exercise.questions) {
        pool.push({
          ...question,
          namespacedId: `${topic.topicId}::${question.id}`,
          topicId: topic.topicId,
          topicTitle: topic.title,
          exerciseNumber: exercise.exerciseNumber,
          sourceTaskName: exercise.sourceTaskName,
        });
      }
    }
  }
  return pool;
}

// topicIds of null (or an empty array, e.g. stale settings) means "all topics".
export function filterByTopics(pool, topicIds) {
  if (!topicIds || topicIds.length === 0) return pool;
  const wanted = new Set(topicIds);
  return pool.filter((question) => wanted.has(question.topicId));
}

export function filterUnsolved(pool) {
  const solved = getSolvedIds();
  return pool.filter((question) => !solved.has(question.namespacedId));
}

export function shuffledSession(pool) {
  return shuffle(pool).map((question) => ({
    ...question,
    options: shuffle(question.options),
  }));
}

export function checkAnswer(question, selected) {
  const isCorrect =
    question.type === "single"
      ? selected.length === 1 && question.correctAnswers.includes(selected[0])
      : sameSet(selected, question.correctAnswers);

  return { isCorrect, correctAnswers: question.correctAnswers };
}

export function computeSummary(state) {
  const mistakes = [];
  state.history.forEach((entry, index) => {
    if (entry && !entry.result.isCorrect) {
      mistakes.push({
        question: state.session[index],
        selected: entry.selected,
      });
    }
  });

  return {
    score: state.score,
    total: state.session.length,
    percentage:
      state.session.length === 0
        ? 0
        : Math.round((state.score / state.session.length) * 100),
    mistakes,
  };
}
