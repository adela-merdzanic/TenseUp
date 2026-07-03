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
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const ids = new Set();
  for (const exercise of data.exercises) {
    for (const q of exercise.questions) {
      const label = `${topic.topicId}/${q.id}`;
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
  if (!card.core || card.core.length === 0)
    errors.push(`essay/${card.id}: empty core answer`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("All data files valid.");
