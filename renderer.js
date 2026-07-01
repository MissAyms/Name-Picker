import { drawAnimatedBird } from "./sprites.js";

export function createRenderer(canvas, artAssets = {}, options = {}) {
  const ctx = canvas.getContext("2d");
  const viewport = { width: 1, height: 1, groundTop: 1, groundHeight: 1, dpr: 1 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    viewport.width = width;
    viewport.height = height;
    viewport.groundHeight = clamp(height * 0.16, 54, 94);
    viewport.groundTop = height - viewport.groundHeight;
    viewport.dpr = dpr;
    return viewport;
  }

  function draw(state) {
    resize();
    drawSky(state);
    drawClouds(state.clouds);
    drawMountains(state.cloudDrift);
    drawPipes(state.pipes);
    drawGround(state.groundOffset, state.time);
    drawBirds(state.birds, state.time);
    drawParticles(state.particles);
    drawSceneLighting(state.time);
    drawCrashFeed(state.messages);
    drawStatus(state);
  }

  function drawSky(state) {
    const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);
    gradient.addColorStop(0, "#119df4");
    gradient.addColorStop(0.38, "#31bfff");
    gradient.addColorStop(0.68, "#74dcff");
    gradient.addColorStop(1, "#d7fbff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    const sunX = viewport.width * 0.72;
    const sunY = viewport.height * 0.14;
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, viewport.width * 0.42);
    glow.addColorStop(0, "rgba(255, 251, 210, 0.72)");
    glow.addColorStop(0.24, "rgba(255, 242, 156, 0.22)");
    glow.addColorStop(1, "rgba(255, 242, 156, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, viewport.width, viewport.groundTop);

    drawCloudBank(state.cloudDrift * 0.16, viewport.groundTop - clamp(viewport.height * 0.18, 64, 126), "rgba(232, 253, 255, 0.34)", 1.1);
    drawCloudBank(state.cloudDrift * 0.28, viewport.groundTop - clamp(viewport.height * 0.09, 32, 82), "rgba(255, 255, 255, 0.44)", 1.35);

    ctx.fillStyle = "rgba(0, 83, 130, 0.09)";
    for (let y = 0; y < viewport.groundTop; y += 6) {
      ctx.fillRect(0, y, viewport.width, 1);
    }

    const vignette = ctx.createRadialGradient(viewport.width / 2, viewport.height * 0.45, viewport.width * 0.22, viewport.width / 2, viewport.height * 0.45, viewport.width * 0.75);
    vignette.addColorStop(0, "rgba(255,255,255,0)");
    vignette.addColorStop(1, "rgba(17, 24, 39, 0.16)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }

  function drawClouds(clouds) {
    [...clouds].sort((a, b) => a.layer - b.layer).forEach((cloud) => {
      const y = cloud.y + Math.sin(cloud.wobble) * (1.5 + cloud.layer);
      const alpha = cloud.alpha ?? 0.8;
      const tint = cloud.layer === 0 ? "232, 253, 255" : cloud.layer === 1 ? "255, 255, 255" : "248, 251, 255";
      pixelCloud(cloud.x, y, cloud.scale, `rgba(${tint}, ${alpha})`, cloud.layer);
    });
  }

  function drawMountains(offset) {
    const baseY = viewport.groundTop - clamp(viewport.height * 0.11, 46, 96);
    const farOffset = (offset * 0.08) % 280;
    const nearOffset = (offset * 0.14) % 340;
    drawMountainLayer(baseY + 18, 172, farOffset, "rgba(63, 151, 201, 0.28)", "rgba(224, 248, 255, 0.42)");
    drawMountainLayer(baseY + 44, 128, nearOffset, "rgba(38, 125, 175, 0.34)", "rgba(201, 241, 255, 0.36)");
    const haze = ctx.createLinearGradient(0, baseY - 50, 0, viewport.groundTop + 8);
    haze.addColorStop(0, "rgba(255,255,255,0)");
    haze.addColorStop(0.55, "rgba(255,255,255,0.16)");
    haze.addColorStop(1, "rgba(255,255,255,0.05)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, baseY - 80, viewport.width, viewport.groundTop - baseY + 90);
  }

  function drawMountainLayer(baseY, height, offset, fill, snow) {
    const spacing = 230;
    for (let index = -2; index < viewport.width / spacing + 4; index += 1) {
      const x = index * spacing - offset;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(x - 70, baseY);
      ctx.lineTo(x + 50, baseY - height);
      ctx.lineTo(x + 178, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(18, 78, 122, 0.12)";
      ctx.beginPath();
      ctx.moveTo(x + 50, baseY - height);
      ctx.lineTo(x + 178, baseY);
      ctx.lineTo(x + 74, baseY - height * 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.moveTo(x + 50, baseY - height);
      ctx.lineTo(x + 20, baseY - height * 0.58);
      ctx.lineTo(x + 52, baseY - height * 0.72);
      ctx.lineTo(x + 82, baseY - height * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  }

  function pixelCloud(x, y, scale, color, layer = 1) {
    const block = Math.max(3, 6 * scale);
    ctx.save();
    ctx.shadowColor = layer === 2 ? "rgba(120, 222, 255, 0.45)" : "rgba(255, 255, 255, 0.25)";
    ctx.shadowBlur = layer === 2 ? 10 : 4;
    ctx.fillStyle = color;
    rect(x, y + block, block * 9, block * 3);
    rect(x + block * 1.3, y, block * 4, block * 4);
    rect(x + block * 4.3, y - block * 0.6, block * 3.8, block * 4.6);
    rect(x + block * 7.3, y + block * 0.7, block * 3.8, block * 3.3);
    ctx.fillStyle = "rgba(105, 189, 220, 0.22)";
    rect(x + block, y + block * 3.4, block * 7.8, block * 0.8);
    ctx.restore();
  }

  function drawCloudBank(offset, y, color, scale) {
    const span = 150 * scale;
    for (let index = -2; index < viewport.width / span + 3; index += 1) {
      const x = ((index * span - offset) % (viewport.width + span * 2)) - span;
      pixelCloud(x, y + Math.sin(index * 1.9) * 9 * scale, scale, color, 0);
    }
  }

  function drawPipes(pipes) {
    pipes.forEach((pipe) => {
      drawPipe(pipe.x, 0, pipe.width, pipe.gapY - pipe.gap / 2, true);
      drawPipe(pipe.x, pipe.gapY + pipe.gap / 2, pipe.width, viewport.groundTop - (pipe.gapY + pipe.gap / 2), false);
    });
  }

  function drawPipe(x, y, width, height, top) {
    if (height <= 0) return;
    const capHeight = Math.min(34, height);
    const capY = top ? y + height - capHeight : y;
    const bodyY = top ? y : y + capHeight;
    const bodyHeight = Math.max(0, height - capHeight);

    ctx.save();
    ctx.shadowColor = "rgba(18, 87, 24, 0.42)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = -5;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = "#113b13";
    rect(x - 3, bodyY, width + 6, bodyHeight);
    ctx.restore();

    ctx.fillStyle = "rgba(3, 32, 13, 0.26)";
    rect(x + width + 6, bodyY + 10, 8, bodyHeight);
    ctx.fillStyle = "#4cc72f";
    rect(x, bodyY, width, bodyHeight);
    const pipeGradient = ctx.createLinearGradient(x, 0, x + width, 0);
    pipeGradient.addColorStop(0, "rgba(255,255,255,0.10)");
    pipeGradient.addColorStop(0.28, "rgba(205,255,112,0.30)");
    pipeGradient.addColorStop(0.54, "rgba(23,125,26,0.05)");
    pipeGradient.addColorStop(1, "rgba(6,55,16,0.36)");
    ctx.fillStyle = pipeGradient;
    rect(x, bodyY, width, bodyHeight);
    ctx.fillStyle = "#8df054";
    rect(x + width * 0.16, bodyY, width * 0.14, bodyHeight);
    ctx.fillStyle = "#c4ff70";
    rect(x + width * 0.2, bodyY + 8, width * 0.035, Math.max(0, bodyHeight - 16));
    ctx.fillStyle = "#27961f";
    rect(x + width * 0.68, bodyY, width * 0.17, bodyHeight);

    ctx.save();
    ctx.shadowColor = "rgba(152, 255, 94, 0.45)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#113b13";
    rect(x - 9, capY - 3, width + 18, capHeight + 6);
    ctx.restore();
    ctx.fillStyle = "#55d533";
    rect(x - 5, capY, width + 10, capHeight);
    ctx.fillStyle = "rgba(9, 80, 20, 0.35)";
    rect(x + width * 0.63, capY, width * 0.27, capHeight);
    ctx.fillStyle = "#8df054";
    rect(x + width * 0.1, capY + 4, width * 0.16, capHeight - 8);
    ctx.fillStyle = "#c4ff70";
    rect(x + width * 0.15, capY + 6, width * 0.035, capHeight - 12);
    ctx.fillStyle = "#248f1e";
    rect(x + width * 0.68, capY + 4, width * 0.2, capHeight - 8);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    rect(x - 2, capY + 3, width + 4, 3);
    ctx.fillStyle = "rgba(10,35,15,0.28)";
    rect(x - 5, top ? capY + capHeight - 5 : capY, width + 10, 5);
  }

  function drawGround(offset, time) {
    const topGlow = ctx.createLinearGradient(0, viewport.groundTop - 18, 0, viewport.groundTop + 30);
    topGlow.addColorStop(0, "rgba(173, 255, 83, 0)");
    topGlow.addColorStop(0.45, "rgba(173, 255, 83, 0.44)");
    topGlow.addColorStop(1, "rgba(31, 89, 33, 0)");
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, viewport.groundTop - 18, viewport.width, 48);

    ctx.fillStyle = "#134b2a";
    ctx.fillRect(0, viewport.groundTop, viewport.width, viewport.groundHeight);
    ctx.fillStyle = "#48b83d";
    ctx.fillRect(0, viewport.groundTop + 6, viewport.width, 22);
    ctx.fillStyle = "#8ff24d";
    ctx.fillRect(0, viewport.groundTop, viewport.width, 13);
    ctx.fillStyle = "#d4ff6f";
    ctx.fillRect(0, viewport.groundTop + 3, viewport.width, 4);
    ctx.fillStyle = "#5c371f";
    ctx.fillRect(0, viewport.groundTop + 28, viewport.width, viewport.groundHeight - 28);
    ctx.fillStyle = "#9c6538";
    ctx.fillRect(0, viewport.groundTop + 34, viewport.width, 9);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, viewport.groundTop + 28, viewport.width, 5);

    const tile = 28;
    const start = -((offset % tile) + tile);
    for (let x = start; x < viewport.width + tile; x += tile) {
      const sway = Math.round(Math.sin(time * 5.5 + x * 0.09) * 2);
      ctx.fillStyle = "#1f8f35";
      rect(x + sway, viewport.groundTop + 14, 9, 9);
      ctx.fillStyle = "#35c04c";
      rect(x + 8 - sway, viewport.groundTop + 9, 5, 15);
      ctx.fillStyle = "#b8ff55";
      rect(x + 14 + sway, viewport.groundTop + 6, 4, 16);
      ctx.fillStyle = x % 56 === 0 ? "#ff74b8" : "#f6d84c";
      rect(x + 20, viewport.groundTop + 8 + Math.sin(time * 4 + x) * 2, 5, 5);
      ctx.fillStyle = "#3b2518";
      rect(x + 2, viewport.groundTop + 52, 8, 5);
      rect(x + 18, viewport.groundTop + 68, 7, 4);
      ctx.fillStyle = "#c4874b";
      rect(x + 9, viewport.groundTop + 44, 5, 4);
    }
  }

  function drawBirds(birds, time) {
    birds.forEach((bird) => {
      const visualY = bird.y + Math.sin(time * 5.2 + bird.seed) * bird.bob;
      const wingFrame = bird.state === "eliminated" ? 1 : Math.floor((time * 12 + bird.seed) % 3);
      drawBirdTrail(bird, visualY, time);
      ctx.save();
      ctx.globalAlpha = bird.state === "eliminated" ? 0.22 : 0.28;
      ctx.fillStyle = "#173044";
      ctx.beginPath();
      ctx.ellipse(bird.x + 6, visualY + bird.size * 0.52, bird.size * 0.52, bird.size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (bird.state === "flying") {
        ctx.save();
        ctx.shadowColor = bird.color;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = bird.color;
        ctx.beginPath();
        ctx.ellipse(bird.x - 2, visualY, bird.size * 0.42, bird.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      drawAnimatedBird(ctx, {
        ...bird,
        y: visualY,
        wingFrame,
        alpha: bird.state === "eliminated" ? 0.44 : 1,
      }, artAssets.birdArt, time);
      drawNameTag(bird, visualY);
    });
  }

  function drawBirdTrail(bird, y, time) {
    if (bird.state !== "flying") return;
    for (let index = 0; index < 5; index += 1) {
      const age = index / 5;
      const x = bird.x - bird.size * (0.45 + age * 0.62) - Math.sin(time * 5 + bird.seed + index) * 2;
      const trailY = y + Math.sin(time * 4.2 + bird.seed + index * 0.7) * (2 + index * 0.45);
      ctx.save();
      ctx.globalAlpha = (1 - age) * 0.22;
      ctx.shadowColor = bird.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = bird.color;
      rect(x, trailY, Math.max(2, bird.size * (0.12 - age * 0.012)), 3);
      if (index % 2 === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = (1 - age) * 0.38;
        rect(x - 6, trailY - 5, 3, 3);
      }
      ctx.restore();
    }
  }

  function drawNameTag(bird, y) {
    if (bird.state === "eliminated" && bird.groundedTime > 2.2) return;
    const label = fitName(bird.name);
    const fontSize = clamp(bird.size * 0.34, 10, 14);
    ctx.font = `700 ${fontSize}px "Courier New", monospace`;
    const textWidth = ctx.measureText(label).width;
    const padding = 5;
    const tagWidth = Math.min(textWidth + padding * 2, 118);
    const tagX = bird.x - tagWidth / 2;
    const tagY = y - bird.size * 0.88;
    ctx.save();
    ctx.shadowColor = bird.state === "flying" ? bird.color : "rgba(255,255,255,0.18)";
    ctx.shadowBlur = bird.state === "flying" ? 9 : 2;
    ctx.fillStyle = "rgba(8, 12, 27, 0.92)";
    ctx.fillRect(tagX - 3, tagY - 3, tagWidth + 6, fontSize + 11);
    const gradient = ctx.createLinearGradient(tagX, tagY, tagX, tagY + fontSize + 6);
    gradient.addColorStop(0, bird.state === "falling" ? "#596076" : "#233e63");
    gradient.addColorStop(1, bird.state === "falling" ? "#2f3447" : "#101a34");
    ctx.fillStyle = gradient;
    ctx.fillRect(tagX, tagY, tagWidth, fontSize + 5);
    ctx.fillStyle = bird.color;
    ctx.fillRect(tagX, tagY, tagWidth, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, tagX + padding, tagY + fontSize + 1, tagWidth - padding * 2);
    ctx.restore();
  }

  function drawParticles(particles) {
    particles.forEach((particle) => {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      if (particle.kind === "shockwave") {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = particle.life * 0.55;
        ctx.beginPath();
        ctx.arc(0, 0, particle.radius * (1.2 - particle.life), 0, Math.PI * 2);
        ctx.stroke();
      } else if (particle.kind === "dust") {
        ctx.globalAlpha = particle.life * 0.55;
        rect(-3, -3, 6, 6);
      } else if (particle.kind === "spark") {
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 8;
        rect(-2, -7, 4, 14);
      } else if (particle.kind === "feather") {
        rect(-4, -2, 8, 4);
        ctx.fillStyle = "rgba(34, 32, 52, 0.35)";
        rect(0, -2, 2, 4);
      } else {
        rect(-2, -2, 4, 4);
      }
      ctx.restore();
    });
  }

  function drawCrashFeed(messages) {
    const feedWidth = Math.min(320, viewport.width * 0.48);
    const feedX = viewport.width - feedWidth - 14;
    const feedY = 14;
    const visible = messages.slice(0, 3);
    if (visible.length === 0) return;

    ctx.save();
    ctx.shadowColor = "rgba(62, 211, 255, 0.65)";
    ctx.shadowBlur = 13;
    ctx.fillStyle = "#07101f";
    ctx.fillRect(feedX - 6, feedY - 6, feedWidth + 12, 38 + visible.length * 24);
    const gradient = ctx.createLinearGradient(0, feedY, 0, feedY + 38 + visible.length * 24);
    gradient.addColorStop(0, "rgba(34, 60, 99, 0.94)");
    gradient.addColorStop(1, "rgba(9, 16, 35, 0.94)");
    ctx.fillStyle = gradient;
    ctx.fillRect(feedX, feedY, feedWidth, 28 + visible.length * 24);
    ctx.fillStyle = "#54e0ff";
    ctx.fillRect(feedX + 4, feedY + 4, feedWidth - 8, 2);
    ctx.fillStyle = "#f8fbff";
    ctx.font = "700 14px 'Courier New', monospace";
    ctx.fillText("CRASH FEED", feedX + 12, feedY + 20);
    ctx.font = "700 13px 'Courier New', monospace";
    visible.forEach((message, index) => {
      ctx.fillStyle = index === 0 ? "#ffdf5e" : "#f87272";
      ctx.fillText(`× ${fitName(message.name)} crashed!`, feedX + 12, feedY + 46 + index * 23, feedWidth - 24);
    });
    ctx.restore();
  }

  function drawSceneLighting(time) {
    const shineX = viewport.width * 0.72 + Math.sin(time * 0.22) * 18;
    const shine = ctx.createRadialGradient(shineX, viewport.height * 0.16, 0, shineX, viewport.height * 0.16, viewport.width * 0.44);
    shine.addColorStop(0, "rgba(255,255,255,0.16)");
    shine.addColorStop(0.48, "rgba(255,255,255,0.04)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, viewport.width, viewport.groundTop);

    const shade = ctx.createLinearGradient(0, 0, 0, viewport.height);
    shade.addColorStop(0, "rgba(0, 31, 66, 0)");
    shade.addColorStop(0.78, "rgba(0, 31, 66, 0.05)");
    shade.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }

  function drawStatus(state) {
    if (state.status === "running") return;
    if (state.status === "finished") return;
    const text = state.statusText || "Paste names, then start the race";
    const title = options.getTitle?.() || "Flappy Bird Name Picker";
    const panelWidth = Math.min(viewport.width - 32, 420);
    const x = viewport.width / 2 - panelWidth / 2;
    const y = clamp(viewport.height * 0.1, 24, 68);
    ctx.save();
    ctx.shadowColor = "rgba(68, 214, 255, 0.7)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "rgba(6, 13, 31, 0.82)";
    ctx.fillRect(x - 4, y - 4, panelWidth + 8, 80);
    const gradient = ctx.createLinearGradient(0, y, 0, y + 72);
    gradient.addColorStop(0, "rgba(42, 65, 110, 0.92)");
    gradient.addColorStop(1, "rgba(10, 17, 38, 0.92)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, panelWidth, 72);
    ctx.fillStyle = "#54e0ff";
    ctx.fillRect(x + 8, y + 7, panelWidth - 16, 2);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 18px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(title, viewport.width / 2, y + 29, panelWidth - 24);
    ctx.fillStyle = "#f9e878";
    ctx.font = "700 13px 'Courier New', monospace";
    ctx.fillText(text, viewport.width / 2, y + 53, panelWidth - 24);
    ctx.textAlign = "start";
    ctx.restore();
  }

  function fitName(name) {
    return name.length > 13 ? `${name.slice(0, 12)}…` : name;
  }

  function rect(x, y, width, height) {
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }

  return { draw, resize, viewport };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
