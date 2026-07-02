export async function loadManifest() {
  const response = await fetch("data/manifest.json");
  if (!response.ok) {
    throw new Error(`Failed to load manifest.json (${response.status})`);
  }
  return response.json();
}

export async function loadAllTopics() {
  const manifest = await loadManifest();
  const topics = await Promise.all(
    manifest.topics.map(async (entry) => {
      const response = await fetch(`data/${entry.file}`);
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
