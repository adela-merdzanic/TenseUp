// Validates manifest, topic files and essay cards. Exits 1 on any problem.
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "src", "data");
const errors = [];

const manifest = JSON.parse(
  fs.readFileSync(path.join(dataDir, "manifest.json"), "utf8"),
);

for (const topic of manifest.topics) {
  const file = path.join(dataDir, topic.file);
  if (!fs.existsSync(file)) {
    errors.push(`${topic.topicId}: file missing (${topic.file})`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    errors.push(
      `${topic.topicId}: invalid JSON in ${topic.file} (${err && err.message ? err.message : err})`,
    );
    continue;
  }
  const ids = new Set();
  if (!data || !Array.isArray(data.exercises)) {
    errors.push(`${topic.topicId}: missing exercises[] array (${topic.file})`);
    continue;
  }
  for (const exercise of data.exercises) {
    if (!exercise || !Array.isArray(exercise.questions)) {
      errors.push(
        `${topic.topicId}: exercise missing questions[] array (${topic.file})`,
      );
      continue;
    }
    for (const q of exercise.questions) {
      if (!q || typeof q.id !== "string" || q.id.trim() === "") {
        errors.push(
          `${topic.topicId}: question missing string id (${topic.file})`,
        );
        continue;
      }
      const label = `${topic.topicId}/${q.id}`;
      if (q.type !== "single" && q.type !== "multiple") {
        errors.push(
          `${label}: invalid type "${q.type}" (expected "single" or "multiple")`,
        );
      }
      if (
        !q.promptParts ||
        typeof q.promptParts.before !== "string" ||
        typeof q.promptParts.after !== "string"
      ) {
        errors.push(`${label}: missing promptParts.before/after`);
      }
      if (typeof q.grammarRule !== "string" || q.grammarRule.trim() === "") {
        errors.push(`${label}: missing grammarRule`);
      }
      if (ids.has(q.id)) errors.push(`${label}: duplicate id`);
      ids.add(q.id);
      const optionsOk = Array.isArray(q.options) && q.options.length >= 2;
      if (!optionsOk) errors.push(`${label}: needs at least 2 options`);
      const answersOk =
        Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0;
      if (!answersOk) errors.push(`${label}: missing correctAnswers`);
      if (optionsOk && answersOk) {
        for (const answer of q.correctAnswers) {
          if (!q.options.includes(answer))
            errors.push(`${label}: correct answer "${answer}" not in options`);
        }
      }
    }
  }
}

const essay = JSON.parse(
  fs.readFileSync(path.join(dataDir, "essay-cards.json"), "utf8"),
);
const categoryIds = new Set(essay.categories.map((c) => c.id));
const cardIds = new Set();
for (const card of essay.cards) {
  if (cardIds.has(card.id)) errors.push(`essay/${card.id}: duplicate id`);
  cardIds.add(card.id);
  if (!categoryIds.has(card.category))
    errors.push(`essay/${card.id}: unknown category "${card.category}"`);
  const coreOk = Array.isArray(card.core) && card.core.length > 0;
  if (!coreOk) errors.push(`essay/${card.id}: core must be a non-empty array`);
  const moreOk = card.more === undefined || Array.isArray(card.more);
  if (!moreOk)
    errors.push(`essay/${card.id}: more must be an array if present`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("All data files valid.");
