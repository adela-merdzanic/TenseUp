import { subjectDir } from "./subject.js";

// Topic data lives under data/<subject-dir>/, listed by that subject's manifest.
export async function loadManifest(config) {
  const dir = subjectDir(config);
  const response = await fetch(`data/${dir}/manifest.json`);
  if (!response.ok) {
    throw new Error(`Failed to load ${dir}/manifest.json (${response.status})`);
  }
  return response.json();
}

export async function loadAllTopics(config) {
  const dir = subjectDir(config);
  const manifest = await loadManifest(config);
  const topics = await Promise.all(
    manifest.topics.map(async (entry) => {
      const response = await fetch(`data/${dir}/${entry.file}`);
      if (!response.ok) {
        throw new Error(
          `Failed to load topic file ${entry.file} (${response.status})`,
        );
      }
      return response.json();
    }),
  );
  return topics;
}

// Essay flashcards live alongside the topics, at data/<subject-dir>/essay-cards.json.
export async function loadEssayCards(config) {
  const dir = subjectDir(config);
  const response = await fetch(`data/${dir}/essay-cards.json`);
  if (!response.ok) {
    throw new Error(
      `Failed to load ${dir}/essay-cards.json (${response.status})`,
    );
  }
  return response.json();
}
