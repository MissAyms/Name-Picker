import { loadBirdArt } from "./assets.js";
import { createSoundBoard } from "./audio.js";
import { createRaceEngine } from "./race.js";
import { createRenderer } from "./renderer.js";
import { createInterface } from "./ui.js";
import { formatNames, parseNames, pickWinnerIndex, rememberWinner, shuffleNames } from "./storage.js";

export function createGame({ mount, sdk, assets }) {
  let cleanup = () => {};

  return {
    start() {
      const trophyUrl = assets?.get("WINNER_TROPHY") ?? "";
      const artAssets = { birdArt: null };
      const ui = createInterface({ mount, trophyUrl, artAssets });
      const renderer = createRenderer(ui.elements.canvas, artAssets, { getTitle: ui.getPickerTitle });
      const sound = createSoundBoard(sdk);
      let animationFrame = 0;
      let lastTime = performance.now();
      let lastFlapSound = 0;
      let running = true;

      const race = createRaceEngine({
        onCrash: () => sound.playCrash(),
        onWinner: (name, bird) => {
          const names = parseNames(ui.elements.textarea.value);
          rememberWinner(name, names, ui.elements.noRepeatInput.checked);
          sound.playVictory();
          ui.setRunning(false);
          ui.showStatus(`${name} is the winner.`);
          ui.showWinner({ name, bird });
        },
        onFlap: () => {
          const now = performance.now();
          if (now - lastFlapSound > 95) {
            lastFlapSound = now;
            sound.playFlap();
          }
        },
      });

      void loadBirdArt(assets)
        .then((birdArt) => {
          artAssets.birdArt = birdArt;
        })
        .catch(() => {
          artAssets.birdArt = null;
        });

      race.setRoster(parseNames(ui.elements.textarea.value));
      renderer.resize();

      const listeners = [];
      const listen = (target, type, handler) => {
        target.addEventListener(type, handler);
        listeners.push(() => target.removeEventListener(type, handler));
      };

      listen(ui.elements.textarea, "input", () => {
        const names = parseNames(ui.elements.textarea.value);
        race.setRoster(names);
        ui.showStatus(names.length > 0 ? `${names.length} bird${names.length === 1 ? "" : "s"} ready.` : "Paste one name per line.");
      });

      listen(ui.elements.startButton, "click", () => {
        void startRace();
      });

      listen(ui.elements.shuffleButton, "click", () => {
        void playButtonSound();
        const names = parseNames(ui.elements.textarea.value);
        const shuffled = shuffleNames(names);
        ui.elements.textarea.value = formatNames(shuffled);
        race.setRoster(shuffled);
        ui.showStatus(shuffled.length > 0 ? "Names shuffled." : "Add names to shuffle.");
      });

      listen(ui.elements.clearButton, "click", () => {
        void playButtonSound();
        ui.elements.textarea.value = "";
        race.setRoster([]);
        ui.showStatus("List cleared.");
      });

      listen(ui.elements.soundInput, "change", () => {
        sound.setEnabled(ui.elements.soundInput.checked);
        void playButtonSound();
      });

      listen(ui.elements.noRepeatInput, "change", () => {
        void playButtonSound();
        ui.showStatus(ui.elements.noRepeatInput.checked ? "No Repeat Mode on." : "No Repeat Mode off.");
      });

      listen(ui.elements.speedSelect, "change", () => {
        void playButtonSound();
        ui.showStatus(`Race speed: ${ui.elements.speedSelect.selectedOptions[0].textContent}.`);
      });

      listen(ui.elements.playAgainButton, "click", () => {
        ui.hideWinner();
        void startRace();
      });

      listen(ui.elements.backButton, "click", () => {
        void playButtonSound();
        ui.hideWinner();
        ui.setRunning(false);
        race.backToIdle(parseNames(ui.elements.textarea.value));
        ui.showStatus("Ready for another list or race.");
      });

      const resizeObserver = new ResizeObserver(() => renderer.resize());
      resizeObserver.observe(ui.elements.canvas);

      function frame(now) {
        if (!running) return;
        const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
        lastTime = now;
        race.update(dt, renderer.viewport);
        ui.updateHud(race.state, ui.elements.speedSelect.selectedOptions[0]?.textContent || "Normal");
        renderer.draw(race.state);
        animationFrame = requestAnimationFrame(frame);
      }
      animationFrame = requestAnimationFrame(frame);

      async function startRace() {
        const names = parseNames(ui.elements.textarea.value);
        if (names.length === 0) {
          void playButtonSound();
          race.setRoster([]);
          ui.showStatus("Paste at least one student name first.");
          return;
        }
        try {
          await sound.unlock();
        } catch {
          // The game remains fully playable when a browser blocks audio.
        }
        sound.setEnabled(ui.elements.soundInput.checked);
        sound.playButton();
        ui.hideWinner();
        ui.setRunning(true);
        const winnerIndex = pickWinnerIndex(names, ui.elements.noRepeatInput.checked);
        race.start(names, winnerIndex, ui.elements.speedSelect.value);
      }

      async function playButtonSound() {
        try {
          await sound.unlock();
        } catch {
          // Audio is decorative; button behavior should never depend on it.
        }
        sound.setEnabled(ui.elements.soundInput.checked);
        sound.playButton();
      }

      cleanup = () => {
        running = false;
        cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        listeners.forEach((remove) => remove());
        void sound.dispose();
        ui.destroy();
      };
    },
    destroy() {
      cleanup();
      cleanup = () => {};
    },
  };
}
