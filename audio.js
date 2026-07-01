export function createSoundBoard(sdk) {
  let enabled = true;
  let audioHandle = null;
  let context = null;
  let master = null;

  async function unlock() {
    if (!enabled) return;
    if (!audioHandle) {
      audioHandle = await sdk.audio.getContext();
      context = audioHandle.context;
      master = context.createGain();
      master.gain.value = 0.18;
      master.connect(context.destination);
    }
    await audioHandle.unlock();
  }

  function setEnabled(value) {
    enabled = value;
    if (master) master.gain.value = enabled ? 0.18 : 0;
  }

  function playButton() {
    tone({ type: "square", start: 540, end: 420, duration: 0.045, volume: 0.12 });
  }

  function playFlap() {
    tone({ type: "triangle", start: 420, end: 760, duration: 0.075, volume: 0.09 });
  }

  function playCrash() {
    tone({ type: "sawtooth", start: 130, end: 42, duration: 0.24, volume: 0.22 });
    noiseBurst(0.18, 0.16);
  }

  function playVictory() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((frequency, index) => {
      window.setTimeout(() => {
        tone({ type: "square", start: frequency, end: frequency * 1.01, duration: 0.14, volume: 0.13 });
      }, index * 90);
    });
  }

  function tone({ type, start, end, duration, volume }) {
    if (!enabled || !context || !master) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function noiseBurst(duration, volume) {
    if (!enabled || !context || !master) return;
    const frameCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      const fade = 1 - index / frameCount;
      data[index] = (Math.random() * 2 - 1) * fade * volume;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(master);
    source.start();
  }

  async function dispose() {
    if (audioHandle) await audioHandle.dispose();
    audioHandle = null;
    context = null;
    master = null;
  }

  return {
    unlock,
    setEnabled,
    playButton,
    playFlap,
    playCrash,
    playVictory,
    dispose,
  };
}
