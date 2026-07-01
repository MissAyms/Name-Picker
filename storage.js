import { STORAGE_KEY } from "./constants.js";

export function parseNames(value) {
  return value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 60);
}

export function formatNames(names) {
  return names.join("\n");
}

export function shuffleNames(names) {
  const copy = [...names];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function pickWinnerIndex(names, noRepeat) {
  if (names.length === 0) return -1;

  if (!noRepeat) {
    return Math.floor(Math.random() * names.length);
  }

  const history = readHistory().filter((name) => names.includes(name));
  let availableIndexes = names
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => !history.includes(name))
    .map(({ index }) => index);

  if (availableIndexes.length === 0) {
    writeHistory([]);
    availableIndexes = names.map((_, index) => index);
  }

  const pick = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
  return pick ?? 0;
}

export function rememberWinner(name, names, noRepeat) {
  if (!noRepeat || !name) return;
  const cleanNames = names.filter(Boolean);
  const history = readHistory().filter((savedName) => cleanNames.includes(savedName));
  const nextHistory = history.includes(name) ? history : [...history, name];
  writeHistory(nextHistory);
}

export function readHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeHistory(history) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Local storage can be unavailable in strict/private browser modes.
  }
}
