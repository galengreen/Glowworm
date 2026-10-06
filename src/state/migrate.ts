// One-off: carry progress and settings over from the old "learnsmart:" storage keys.
// Imported first in main.tsx so it runs before any store reads localStorage.
for (const key of Object.keys(localStorage)) {
  if (!key.startsWith('learnsmart:')) continue;
  const next = key.replace('learnsmart:', 'glowworm:');
  if (localStorage.getItem(next) === null) localStorage.setItem(next, localStorage.getItem(key)!);
  localStorage.removeItem(key);
}
