import { BIRD_COLORS, DEFAULT_NAMES, SPEEDS } from "./constants.js";
import { shuffleNames } from "./storage.js";

export function createRaceEngine({ onCrash, onWinner, onFlap }) {
  const state = {
    status: "idle",
    statusText: "Paste names, then start the race",
    time: 0,
    raceTime: 0,
    birds: [],
    pipes: [],
    clouds: [],
    particles: [],
    messages: [],
    groundOffset: 0,
    cloudDrift: 0,
    winnerIndex: -1,
    winnerName: "",
    speedKey: "normal",
    finishTimer: 0,
  };

  function setRoster(names) {
    if (state.status === "running") return;
    const roster = names.length > 0 ? names : DEFAULT_NAMES.slice(0, 5);
    state.status = "idle";
    state.statusText = names.length > 0 ? "Ready for a random race" : "Paste names, then start the race";
    state.raceTime = 0;
    state.winnerIndex = -1;
    state.winnerName = "";
    state.finishTimer = 0;
    state.messages = [];
    state.particles = [];
    state.birds = makeBirds(roster, -1, []);
  }

  function start(names, winnerIndex, speedKey) {
    const roster = names.length > 0 ? names : DEFAULT_NAMES.slice(0, 2);
    const winnersName = roster[winnerIndex] ?? roster[0];
    const loserIndexes = roster
      .map((_, index) => index)
      .filter((index) => index !== winnerIndex);
    const crashOrder = shuffleNames(loserIndexes.map(String)).map(Number);
    state.status = "running";
    state.statusText = "";
    state.time = 0;
    state.raceTime = 0;
    state.finishTimer = 0;
    state.winnerIndex = winnerIndex;
    state.winnerName = winnersName;
    state.speedKey = speedKey in SPEEDS ? speedKey : "normal";
    state.messages = [];
    state.particles = [];
    state.pipes = [];
    state.birds = makeBirds(roster, winnerIndex, crashOrder);
  }

  function backToIdle(names) {
    setRoster(names);
  }

  function update(dt, viewport) {
    const safeDt = Math.min(dt, 0.05);
    state.time += safeDt;
    const config = SPEEDS[state.speedKey] ?? SPEEDS.normal;
    const speed = state.status === "running" ? config.pipeSpeed : 46;
    state.groundOffset += speed * safeDt;
    state.cloudDrift += safeDt * 24;
    updateClouds(safeDt, viewport);
    updatePipes(safeDt, viewport, speed, config);
    updateBirds(safeDt, viewport, config);
    updateParticles(safeDt);
    updateMessages(safeDt);
  }

  function updateClouds(dt, viewport) {
    if (state.clouds.length === 0) {
      state.clouds = Array.from({ length: 12 }, (_, index) => ({
        x: index * viewport.width * 0.19 + Math.random() * 80,
        y: 24 + (index % 5) * 34 + Math.random() * 18,
        scale: 0.58 + (index % 4) * 0.18 + Math.random() * 0.2,
        speed: 5 + (index % 4) * 6 + Math.random() * 7,
        layer: index % 3,
        alpha: 0.58 + (index % 3) * 0.16,
        wobble: Math.random() * Math.PI * 2,
      }));
    }
    state.clouds.forEach((cloud) => {
      cloud.x -= cloud.speed * dt;
      cloud.wobble += dt * 0.35;
      if (cloud.x < -220 * cloud.scale) {
        cloud.x = viewport.width + Math.random() * 220;
        cloud.y = 20 + Math.random() * Math.max(88, viewport.groundTop * 0.42);
        cloud.scale = 0.55 + Math.random() * 0.75;
        cloud.speed = 5 + cloud.layer * 7 + Math.random() * 9;
        cloud.alpha = 0.56 + cloud.layer * 0.15;
      }
    });
  }

  function updatePipes(dt, viewport, speed, config) {
    const width = clamp(viewport.width * 0.075, 54, 86);
    const gap = clamp(viewport.height * 0.28, 140, 218);
    const spacing = Math.max(config.spawnGap, viewport.width * 0.34);
    if (state.pipes.length === 0) {
      for (let index = 0; index < 5; index += 1) {
        state.pipes.push(makePipe(viewport.width + 160 + index * spacing, viewport, width, gap));
      }
    }
    state.pipes.forEach((pipe) => {
      pipe.x -= speed * dt;
      pipe.width = width;
      pipe.gap = gap;
      pipe.gapY = clamp(pipe.gapY, gap / 2 + 42, Math.max(gap / 2 + 42, viewport.groundTop - gap / 2 - 42));
    });
    let rightMost = state.pipes.reduce((max, pipe) => Math.max(max, pipe.x), 0);
    state.pipes = state.pipes.filter((pipe) => pipe.x + pipe.width > -80);
    while (state.pipes.length < 5) {
      rightMost += spacing + Math.random() * 38;
      state.pipes.push(makePipe(rightMost, viewport, width, gap));
    }
  }

  function makePipe(x, viewport, width, gap) {
    const margin = gap / 2 + 42;
    const gapY = margin + Math.random() * Math.max(1, viewport.groundTop - margin * 2);
    return { x, width, gap, gapY };
  }

  function updateBirds(dt, viewport, config) {
    layoutBirds(viewport);
    if (state.status !== "running") {
      state.birds.forEach((bird) => {
        bird.angle = Math.sin(state.time * 2.1 + bird.seed) * 0.08;
      });
      return;
    }

    state.raceTime += dt;
    const upcoming = findUpcomingPipe(viewport);
    state.birds.forEach((bird) => {
      if (bird.state === "falling") {
        updateFallingBird(bird, dt, viewport);
        return;
      }
      if (bird.state !== "flying") {
        bird.groundedTime += dt;
        return;
      }
      const target = getBirdTarget(bird, upcoming, config);
      const previousY = bird.y;
      bird.y += (target - bird.y) * dt * bird.agility;
      bird.y += Math.sin(state.time * 3.8 + bird.seed) * dt * 10;
      bird.x += (bird.homeX + Math.sin(state.time * 1.5 + bird.seed) * 8 - bird.x) * dt * 1.8;
      bird.angle = clamp((bird.y - previousY) * 0.04, -0.36, 0.58);
      bird.flapClock -= dt;
      if (bird.flapClock <= 0) {
        bird.flapClock = 0.42 + Math.random() * 0.26;
        onFlap?.(bird);
      }
      if (bird.index !== state.winnerIndex && bird.crashArmed) {
        maybeCrashBird(bird, viewport);
      }
    });
    checkFinished(dt);
  }

  function layoutBirds(viewport) {
    const count = Math.max(1, state.birds.length);
    const playableHeight = Math.max(120, viewport.groundTop - 118);
    const startX = clamp(viewport.width * 0.16, 58, 150);
    const size = clamp(36 - Math.max(0, count - 10) * 0.75, 23, 40);
    state.birds.forEach((bird, index) => {
      const row = (index + 0.55) / (count + 0.2);
      bird.homeX = startX + (index % 4) * clamp(size * 0.46, 9, 17);
      bird.baseY = 68 + row * playableHeight;
      bird.size = size;
      bird.bob = bird.state === "flying" ? 3.8 : 1.6;
      if (!bird.positioned) {
        bird.x = bird.homeX;
        bird.y = bird.baseY;
        bird.positioned = true;
      }
      if (state.status !== "running" && bird.state === "flying") {
        bird.x += (bird.homeX - bird.x) * 0.16;
        bird.y += (bird.baseY - bird.y) * 0.12;
      }
    });
  }

  function getBirdTarget(bird, upcoming, config) {
    let target = bird.baseY;
    if (upcoming) {
      target = upcoming.gapY + Math.sin(state.raceTime * (1.4 + bird.index * 0.03) + bird.seed) * Math.min(18, upcoming.gap * 0.12);
    }
    if (bird.index !== state.winnerIndex && state.raceTime >= bird.crashAt) {
      bird.crashArmed = true;
      const pipe = upcoming || state.pipes[0];
      if (pipe) {
        const side = bird.crashSide;
        target = pipe.gapY + side * (pipe.gap * 0.5 + 36 + (bird.index % 3) * 8);
      }
    }
    if (bird.index === state.winnerIndex) {
      target += Math.sin(state.raceTime * 2.2 + bird.seed) * 8;
    }
    return target + Math.sin(state.raceTime * 1.1 + bird.seed) * config.pipeSpeed * 0.015;
  }

  function findUpcomingPipe(viewport) {
    const birdsX = clamp(viewport.width * 0.16, 58, 150);
    return state.pipes
      .filter((pipe) => pipe.x + pipe.width > birdsX - 18)
      .sort((a, b) => a.x - b.x)[0];
  }

  function maybeCrashBird(bird, viewport) {
    const hit = getBirdHitCircle(bird);
    const pipe = state.pipes.find((candidate) => circleHitsPipe(hit, candidate, viewport));
    if (!pipe) return;
    if (state.raceTime >= bird.crashAt || state.raceTime > bird.crashAt + 1.6) {
      crashBird(bird, viewport, pipe);
    }
  }

  function crashBird(bird, viewport, pipe = null) {
    if (bird.state !== "flying") return;
    if (pipe) {
      const topEdge = pipe.gapY - pipe.gap / 2;
      const bottomEdge = pipe.gapY + pipe.gap / 2;
      const topDistance = Math.abs(bird.y - topEdge);
      const bottomDistance = Math.abs(bird.y - bottomEdge);
      bird.y = topDistance < bottomDistance ? topEdge - bird.size * 0.18 : bottomEdge + bird.size * 0.18;
      bird.x = clamp(bird.x, pipe.x - bird.size * 0.2, pipe.x + pipe.width + bird.size * 0.2);
    }
    bird.state = "falling";
    bird.velocityY = -60;
    bird.velocityX = -26;
    bird.angle = 0.7;
    spawnFeathers(bird, pipe);
    state.messages.unshift({ name: bird.name, ttl: 4.4 });
    onCrash?.(bird.name);
    if (viewport && bird.y > viewport.groundTop - 20) bird.y = viewport.groundTop - 20;
  }

  function updateFallingBird(bird, dt, viewport) {
    bird.velocityY += 520 * dt;
    bird.y += bird.velocityY * dt;
    bird.x += bird.velocityX * dt;
    bird.angle = Math.min(1.55, bird.angle + dt * 2.5);
    if (bird.y >= viewport.groundTop - bird.size * 0.3) {
      bird.y = viewport.groundTop - bird.size * 0.3;
      bird.velocityY = 0;
      bird.velocityX = 0;
      bird.state = "eliminated";
      bird.groundedTime = 0;
    }
  }

  function spawnFeathers(bird, pipe) {
    const colors = ["#ffffff", "#f9e878", bird.color, "#ff9aa8", "#54e0ff"];
    const impactX = pipe ? clamp(bird.x, pipe.x - 4, pipe.x + pipe.width + 4) : bird.x;
    const impactY = bird.y;
    state.particles.push({
      x: impactX,
      y: impactY,
      vx: 0,
      vy: 0,
      rotation: 0,
      spin: 0,
      life: 1,
      decay: 1.35,
      radius: bird.size * 1.8,
      color: "#ffffff",
      kind: "shockwave",
    });
    for (let index = 0; index < 26; index += 1) {
      const burst = index / 26;
      state.particles.push({
        x: impactX + randomRange(-10, 10),
        y: impactY + randomRange(-8, 8),
        vx: randomRange(-150, 95) * (0.65 + burst),
        vy: randomRange(-205, -38) * (0.75 + burst * 0.45),
        rotation: randomRange(0, Math.PI),
        spin: randomRange(-7, 7),
        life: 1,
        decay: randomRange(0.6, 1.25),
        color: colors[index % colors.length],
        kind: index % 5 === 0 ? "spark" : "feather",
      });
    }
    for (let index = 0; index < 10; index += 1) {
      state.particles.push({
        x: impactX + randomRange(-8, 8),
        y: impactY + randomRange(-5, 10),
        vx: randomRange(-45, 60),
        vy: randomRange(-60, 30),
        rotation: randomRange(0, Math.PI),
        spin: randomRange(-2, 2),
        life: 0.8,
        decay: randomRange(0.7, 1.1),
        color: "rgba(46, 36, 48, 0.72)",
        kind: "dust",
      });
    }
  }

  function getBirdHitCircle(bird) {
    return {
      x: bird.x + bird.size * 0.02,
      y: bird.y + bird.size * 0.03,
      radius: bird.size * 0.31,
    };
  }

  function circleHitsPipe(circle, pipe, viewport) {
    const padding = 4;
    const x = pipe.x - padding;
    const width = pipe.width + padding * 2;
    const topRect = { x, y: 0, width, height: pipe.gapY - pipe.gap / 2 };
    const bottomRect = {
      x,
      y: pipe.gapY + pipe.gap / 2,
      width,
      height: viewport.groundTop - (pipe.gapY + pipe.gap / 2),
    };
    return circleRect(circle, topRect) || circleRect(circle, bottomRect);
  }

  function circleRect(circle, rect) {
    if (rect.height <= 0) return false;
    const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  function updateParticles(dt) {
    state.particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 220 * dt;
      particle.rotation += particle.spin * dt;
      particle.life -= particle.decay * dt;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function updateMessages(dt) {
    state.messages.forEach((message) => {
      message.ttl -= dt;
    });
    state.messages = state.messages.filter((message) => message.ttl > 0);
  }

  function checkFinished(dt) {
    const flying = state.birds.filter((bird) => bird.state === "flying");
    const falling = state.birds.some((bird) => bird.state === "falling");
    if (flying.length === 1 && flying[0].index === state.winnerIndex && !falling) {
      state.finishTimer += dt;
      if (state.finishTimer > 0.6) {
        state.status = "finished";
        onWinner?.(state.winnerName, flying[0]);
      }
    } else {
      state.finishTimer = 0;
    }
  }

  function makeBirds(names, winnerIndex, crashOrder) {
    const palette = shuffleNames(BIRD_COLORS);
    const crashLookup = new Map(crashOrder.map((birdIndex, order) => [birdIndex, order]));
    const baseInterval = (SPEEDS[state.speedKey] ?? SPEEDS.normal).crashInterval;
    return names.map((name, index) => {
      const order = crashLookup.get(index) ?? 0;
      const interval = Math.max(0.72, baseInterval - Math.max(0, names.length - 12) * 0.035);
      return {
        index,
        name,
        color: palette[index % palette.length],
        hueFilter: hueFilterFromColor(palette[index % palette.length]),
        state: "flying",
        x: 80,
        y: 120 + index * 22,
        homeX: 80,
        baseY: 120,
        size: 34,
        angle: 0,
        bob: 3,
        seed: Math.random() * 10,
        agility: index === winnerIndex ? 4.2 : 3.1 + Math.random() * 0.9,
        crashAt: 2.2 + order * interval + Math.random() * 0.35,
        crashSide: Math.random() > 0.5 ? 1 : -1,
        crashArmed: false,
        flapClock: Math.random() * 0.4,
        velocityY: 0,
        velocityX: 0,
        groundedTime: 0,
        positioned: false,
      };
    });
  }

  function getWinnerBird() {
    return state.birds.find((bird) => bird.index === state.winnerIndex) || null;
  }

  setRoster([]);

  return {
    state,
    update,
    setRoster,
    start,
    backToIdle,
    getWinnerBird,
  };
}

function hueFilterFromColor(hex) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const max = Math.max(red, green, blue) / 255;
  const min = Math.min(red, green, blue) / 255;
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red / 255) hue = ((green - blue) / 255 / delta) % 6;
    else if (max === green / 255) hue = (blue - red) / 255 / delta + 2;
    else hue = (red - green) / 255 / delta + 4;
    hue *= 60;
  }
  const rotation = Math.round(((hue + 360) % 360) - 205);
  return `hue-rotate(${rotation}deg)`;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
