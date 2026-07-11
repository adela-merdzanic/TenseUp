// Validates subjects.json and, for every subject, its manifest, topic files
// and (when the subject has an essay deck) its essay cards. Exits 1 on any
// problem.
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "src", "data");
const errors = [];

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    errors.push(
      `${label}: invalid JSON (${err && err.message ? err.message : err})`,
    );
    return null;
  }
}

function validateTopics(subjectId, dir) {
  const manifestPath = path.join(dataDir, dir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    errors.push(`${subjectId}: manifest missing (${dir}/manifest.json)`);
    return;
  }
  const manifest = readJson(manifestPath, `${subjectId}/manifest.json`);
  if (!manifest || !Array.isArray(manifest.topics)) {
    errors.push(`${subjectId}: manifest has no topics[] array`);
    return;
  }

  for (const topic of manifest.topics) {
    const file = path.join(dataDir, dir, topic.file);
    if (!fs.existsSync(file)) {
      errors.push(
        `${subjectId}/${topic.topicId}: file missing (${topic.file})`,
      );
      continue;
    }
    const data = readJson(file, `${subjectId}/${topic.file}`);
    if (!data) continue;
    if (!Array.isArray(data.exercises)) {
      errors.push(`${subjectId}/${topic.topicId}: missing exercises[] array`);
      continue;
    }
    const ids = new Set();
    for (const exercise of data.exercises) {
      if (!exercise || !Array.isArray(exercise.questions)) {
        errors.push(
          `${subjectId}/${topic.topicId}: exercise missing questions[] array`,
        );
        continue;
      }
      for (const q of exercise.questions) {
        if (!q || typeof q.id !== "string" || q.id.trim() === "") {
          errors.push(
            `${subjectId}/${topic.topicId}: question missing string id`,
          );
          continue;
        }
        const label = `${subjectId}/${topic.topicId}/${q.id}`;
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
        // Explanation shown after answering: "context" (newer) or "grammarRule".
        const explanation = q.context || q.grammarRule;
        if (typeof explanation !== "string" || explanation.trim() === "") {
          errors.push(`${label}: missing context/grammarRule`);
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
              errors.push(
                `${label}: correct answer "${answer}" not in options`,
              );
          }
        }
      }
    }
  }
}

function validateEssay(subjectId, dir) {
  const file = path.join(dataDir, dir, "essay-cards.json");
  if (!fs.existsSync(file)) {
    errors.push(`${subjectId}: essay feature but no essay-cards.json`);
    return;
  }
  const essay = readJson(file, `${subjectId}/essay-cards.json`);
  if (!essay) return;
  const categoryIds = new Set((essay.categories || []).map((c) => c.id));
  const cardIds = new Set();
  for (const card of essay.cards || []) {
    if (cardIds.has(card.id))
      errors.push(`${subjectId}/essay/${card.id}: duplicate id`);
    cardIds.add(card.id);
    if (!categoryIds.has(card.category))
      errors.push(
        `${subjectId}/essay/${card.id}: unknown category "${card.category}"`,
      );
    const coreOk = Array.isArray(card.core) && card.core.length > 0;
    if (!coreOk)
      errors.push(
        `${subjectId}/essay/${card.id}: core must be a non-empty array`,
      );
    const moreOk = card.more === undefined || Array.isArray(card.more);
    if (!moreOk)
      errors.push(
        `${subjectId}/essay/${card.id}: more must be an array if present`,
      );
  }
}

const subjectsFile = path.join(dataDir, "subjects.json");
const subjects = readJson(subjectsFile, "subjects.json");
if (!subjects || !Array.isArray(subjects.subjects)) {
  errors.push("subjects.json: missing subjects[] array");
} else {
  for (const subject of subjects.subjects) {
    const dir = subject.dir || subject.id;
    validateTopics(subject.id, dir);
    if (subject.features && subject.features.includes("essay")) {
      validateEssay(subject.id, dir);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("All data files valid.");
