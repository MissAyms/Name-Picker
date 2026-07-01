import { DEFAULT_NAMES, PANEL_COPY, SPEEDS } from "./constants.js";
import { drawAnimatedBird } from "./sprites.js";
import { formatNames } from "./storage.js";

const PICKER_LABEL_KEY = "flappy-bird-name-picker-label-v1";
const VIEW_MODE_KEY = "flappy-bird-name-picker-view-mode-v1";

export function createInterface({ mount, trophyUrl, artAssets }) {
  const root = document.createElement("section");
  root.className = "picker-game";
  root.innerHTML = `
    <aside class="control-panel" aria-label="Student names and race controls">
      <div class="logo-lockup" aria-label="Flappy Bird Name Picker">
        <div class="logo-mark" aria-hidden="true">
          <span class="logo-bird-icon">
            <span class="logo-bird-eye"></span>
            <span class="logo-bird-wing"></span>
            <span class="logo-bird-beak"></span>
            <span class="logo-bird-tail"></span>
          </span>
        </div>
        <h1 class="picker-title">${PANEL_COPY.title}</h1>
      </div>
      <label class="title-card">
        <span>Picker Label</span>
        <input class="picker-title-input" type="text" maxlength="40" spellcheck="false" aria-label="Custom name picker label" placeholder="Sir Mel's Name Picker">
      </label>
      <label class="names-card">
        <span>Student Names</span>
        <textarea class="names-input" spellcheck="false" aria-label="Student names, one per line"></textarea>
      </label>
      <div class="button-grid">
        <button class="pixel-button start-button" type="button">Start Race</button>
        <button class="pixel-button purple shuffle-button" type="button">Shuffle Names</button>
        <button class="pixel-button red clear-button" type="button">Clear List</button>
      </div>
      <div class="option-stack">
        <label class="toggle-row">
          <span>No Repeat Mode</span>
          <input class="no-repeat-input" type="checkbox">
        </label>
        <label class="toggle-row">
          <span>Sound</span>
          <input class="sound-input" type="checkbox" checked>
        </label>
        <label class="speed-row">
          <span>Race Speed</span>
          <select class="speed-select" aria-label="Race speed">
            ${Object.entries(SPEEDS).map(([key, speed]) => `<option value="${key}" ${key === "normal" ? "selected" : ""}>${speed.label}</option>`).join("")}
          </select>
        </label>
      </div>
      <p class="panel-status" aria-live="polite">${PANEL_COPY.empty}</p>
    </aside>
    <main class="race-area" aria-label="Flappy bird race">
      <header class="top-hud" aria-label="Race status">
        <div class="hud-stat speed-stat"><span>Speed</span><strong>Normal</strong></div>
        <div class="hud-stat remaining-stat"><span>Birds Remaining</span><strong>0</strong></div>
        <div class="hud-stat eliminated-stat"><span>Eliminated</span><strong>0</strong></div>
        <div class="hud-stat time-stat"><span>Race Time</span><strong>0:00</strong></div>
        <button class="view-button" type="button" aria-label="Switch to desktop view" aria-pressed="false">DESK</button>
        <button class="settings-button" type="button" aria-label="Open settings" aria-expanded="false">SET</button>
      </header>
      <canvas class="race-canvas" aria-label="Animated classroom name picker race"></canvas>
      <div class="bottom-status" aria-live="polite">
        <strong>🏆 RACE IN PROGRESS...</strong>
        <span>Only one bird will win!</span>
      </div>
      <div class="winner-overlay" hidden>
        <div class="confetti-layer" aria-hidden="true"></div>
        <div class="winner-card" role="dialog" aria-modal="true" aria-label="Race winner">
          <div class="winner-label">WINNER</div>
          <div class="trophy-slot"></div>
          <canvas class="winner-bird" width="120" height="86" aria-hidden="true"></canvas>
          <div class="winner-name"></div>
          <div class="winner-actions">
            <button class="pixel-button play-again-button" type="button">Play Again</button>
            <button class="pixel-button blue back-button" type="button">Back</button>
          </div>
        </div>
      </div>
    </main>
  `;

  mount.replaceChildren(root);

  const elements = {
    root,
    pickerTitle: root.querySelector(".picker-title"),
    titleInput: root.querySelector(".picker-title-input"),
    textarea: root.querySelector(".names-input"),
    startButton: root.querySelector(".start-button"),
    shuffleButton: root.querySelector(".shuffle-button"),
    clearButton: root.querySelector(".clear-button"),
    noRepeatInput: root.querySelector(".no-repeat-input"),
    soundInput: root.querySelector(".sound-input"),
    speedSelect: root.querySelector(".speed-select"),
    status: root.querySelector(".panel-status"),
    canvas: root.querySelector(".race-canvas"),
    topHud: root.querySelector(".top-hud"),
    speedStat: root.querySelector(".speed-stat strong"),
    remainingStat: root.querySelector(".remaining-stat strong"),
    eliminatedStat: root.querySelector(".eliminated-stat strong"),
    timeStat: root.querySelector(".time-stat strong"),
    viewButton: root.querySelector(".view-button"),
    settingsButton: root.querySelector(".settings-button"),
    bottomStatus: root.querySelector(".bottom-status"),
    winnerOverlay: root.querySelector(".winner-overlay"),
    confettiLayer: root.querySelector(".confetti-layer"),
    trophySlot: root.querySelector(".trophy-slot"),
    winnerBirdCanvas: root.querySelector(".winner-bird"),
    winnerName: root.querySelector(".winner-name"),
    playAgainButton: root.querySelector(".play-again-button"),
    backButton: root.querySelector(".back-button"),
  };

  elements.textarea.value = formatNames(DEFAULT_NAMES);
  const initialTitle = readPickerTitle();
  elements.titleInput.value = initialTitle;
  applyPickerTitle(initialTitle);
  applyViewMode(readViewMode());
  installTrophy(elements.trophySlot, trophyUrl);

  elements.titleInput.addEventListener("input", () => {
    const nextTitle = normalizePickerTitle(elements.titleInput.value);
    applyPickerTitle(nextTitle);
    savePickerTitle(nextTitle);
  });

  elements.settingsButton.addEventListener("click", () => {
    const isOpen = elements.root.classList.toggle("sidebar-open");
    elements.settingsButton.setAttribute("aria-expanded", String(isOpen));
    elements.settingsButton.setAttribute("aria-label", isOpen ? "Close settings" : "Open settings");
  });

  elements.viewButton.addEventListener("click", () => {
    const nextMode = elements.root.classList.contains("desktop-view") ? "auto" : "desktop";
    applyViewMode(nextMode);
    saveViewMode(nextMode);
  });

  function setRunning(isRunning) {
    elements.textarea.disabled = isRunning;
    elements.startButton.disabled = isRunning;
    elements.shuffleButton.disabled = isRunning;
    elements.clearButton.disabled = isRunning;
    elements.noRepeatInput.disabled = isRunning;
    elements.speedSelect.disabled = isRunning;
    elements.status.textContent = isRunning ? "Race in progress..." : PANEL_COPY.empty;
  }

  function showStatus(text) {
    elements.status.textContent = text;
  }

  function showWinner({ name, bird }) {
    elements.winnerName.textContent = name;
    elements.winnerOverlay.hidden = false;
    elements.playAgainButton.focus({ preventScroll: true });
    renderWinnerBird(elements.winnerBirdCanvas, bird, artAssets?.birdArt);
    fillConfetti(elements.confettiLayer);
  }

  function updateHud(state, speedLabel) {
    const birds = Array.isArray(state?.birds) ? state.birds : [];
    const remaining = birds.filter((bird) => bird.state === "flying").length;
    const eliminated = birds.filter((bird) => bird.state !== "flying").length;
    const raceTime = state?.status === "running" || state?.status === "finished" ? state.raceTime || 0 : 0;
    elements.speedStat.textContent = speedLabel;
    elements.remainingStat.textContent = String(remaining);
    elements.eliminatedStat.textContent = String(eliminated);
    elements.timeStat.textContent = formatRaceTime(raceTime);
    elements.bottomStatus.classList.toggle("is-running", state?.status === "running");
  }

  function getPickerTitle() {
    return normalizePickerTitle(elements.titleInput.value);
  }

  function applyPickerTitle(title) {
    const label = title || PANEL_COPY.title;
    elements.pickerTitle.textContent = label;
    elements.root.querySelector(".logo-lockup")?.setAttribute("aria-label", label);
    document.title = label;
  }

  function applyViewMode(mode) {
    const desktop = mode === "desktop";
    elements.root.classList.toggle("desktop-view", desktop);
    elements.root.classList.remove("sidebar-open");
    elements.viewButton.textContent = desktop ? "AUTO" : "DESK";
    elements.viewButton.setAttribute("aria-pressed", String(desktop));
    elements.viewButton.setAttribute("aria-label", desktop ? "Use automatic responsive view" : "Switch to desktop view");
    elements.settingsButton.setAttribute("aria-expanded", "false");
  }

  function hideWinner() {
    elements.winnerOverlay.hidden = true;
    elements.confettiLayer.replaceChildren();
  }

  function destroy() {
    mount.replaceChildren();
  }

  return {
    elements,
    setRunning,
    showStatus,
    showWinner,
    hideWinner,
    updateHud,
    getPickerTitle,
    destroy,
  };
}

function normalizePickerTitle(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean || PANEL_COPY.title;
}

function readPickerTitle() {
  try {
    return normalizePickerTitle(window.localStorage.getItem(PICKER_LABEL_KEY));
  } catch {
    return PANEL_COPY.title;
  }
}

function savePickerTitle(value) {
  try {
    window.localStorage.setItem(PICKER_LABEL_KEY, normalizePickerTitle(value));
  } catch {
    // Custom label persistence is optional when local storage is unavailable.
  }
}

function readViewMode() {
  try {
    return window.localStorage.getItem(VIEW_MODE_KEY) === "desktop" ? "desktop" : "auto";
  } catch {
    return "auto";
  }
}

function saveViewMode(value) {
  try {
    window.localStorage.setItem(VIEW_MODE_KEY, value === "desktop" ? "desktop" : "auto");
  } catch {
    // View preference persistence is optional.
  }
}

function formatRaceTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}

function installTrophy(slot, trophyUrl) {
  slot.replaceChildren();
  if (trophyUrl) {
    const image = document.createElement("img");
    image.alt = "Gold pixel trophy";
    image.decoding = "async";
    image.src = trophyUrl;
    image.addEventListener("error", () => {
      slot.textContent = "🏆";
      slot.classList.add("emoji-trophy");
    }, { once: true });
    slot.append(image);
    return;
  }
  slot.textContent = "🏆";
  slot.classList.add("emoji-trophy");
}

function fillConfetti(layer) {
  layer.replaceChildren();
  const colors = ["#ff5e78", "#ffd44f", "#55c8ff", "#9be15d", "#d77cff", "#ffffff"];
  for (let index = 0; index < 72; index += 1) {
    const piece = document.createElement("span");
    piece.style.setProperty("--x", `${Math.random() * 100}%`);
    piece.style.setProperty("--delay", `${Math.random() * 1.8}s`);
    piece.style.setProperty("--fall", `${2.4 + Math.random() * 2.4}s`);
    piece.style.setProperty("--color", colors[index % colors.length]);
    piece.style.setProperty("--spin", `${Math.random() > 0.5 ? 1 : -1}`);
    layer.append(piece);
  }
}

function renderWinnerBird(canvas, bird, birdArt) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  drawAnimatedBird(ctx, {
    x: canvas.width / 2,
    y: canvas.height / 2 - 2,
    size: 62,
    color: bird?.color || "#ffd44f",
    angle: -0.08,
    wingFrame: 0,
    hueFilter: bird?.hueFilter || "",
    seed: bird?.seed || 0,
    state: "flying",
  }, birdArt, performance.now() / 1000);
}
