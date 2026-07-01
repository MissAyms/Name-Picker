export function drawPixelBird(ctx, bird) {
  const scale = bird.size / 22;
  const wingFrame = Math.floor(bird.wingFrame ?? 1);
  ctx.save();
  ctx.globalAlpha = bird.alpha ?? 1;
  ctx.translate(bird.x, bird.y);
  ctx.scale(scale, scale);

  const color = bird.color || "#ffd44f";
  const dark = shade(color, -42);
  const light = shade(color, 28);

  pixel(ctx, -10, -7, 17, 15, "#10131d");
  pixel(ctx, -12, -4, 22, 10, "#10131d");
  pixel(ctx, 7, -2, 5, 5, "#10131d");
  pixel(ctx, -14, -1, 5, 5, "#10131d");
  pixel(ctx, -9, -6, 15, 13, color);
  pixel(ctx, -11, -3, 19, 8, color);
  pixel(ctx, -7, -5, 8, 2, light);
  pixel(ctx, -9, 4, 14, 3, dark);
  pixel(ctx, 0, -6, 7, 8, "#ffffff");
  pixel(ctx, 3, -4, 3, 4, "#10131d");
  pixel(ctx, 4, -5, 1, 1, "#ffffff");
  pixel(ctx, 8, -1, 6, 3, "#ff9a22");
  pixel(ctx, 11, 2, 3, 2, "#d75b12");
  pixel(ctx, -15, 0, 5, 3, dark);
  drawWing(ctx, wingFrame, dark, light);
  ctx.restore();
}

export function drawAnimatedBird(ctx, bird, art, time = 0) {
  if (!art?.image || (!Array.isArray(art.animations) && !Array.isArray(art.frames))) {
    drawPixelBird(ctx, bird);
    return;
  }

  const frames = getColorFrames(art, bird.color);
  if (frames.length === 0) {
    drawPixelBird(ctx, bird);
    return;
  }

  const animationRate = bird.state === "falling" ? 6 : 11;
  const frameIndex = bird.state === "eliminated"
    ? 1
    : Math.floor((time * animationRate + bird.seed * 1.7) % frames.length);
  const frame = frames[frameIndex] || frames[0];
  const crop = frame.content || frame.source;
  const anchor = frame.anchor || {
    x: frame.source.x + frame.source.w * 0.5,
    y: frame.source.y + frame.source.h * 0.82,
  };
  const scale = bird.size / 210;
  const anchorX = bird.x;
  const anchorY = bird.y + bird.size * 0.5;
  const drawX = -(anchor.x - crop.x) * scale;
  const drawY = -(anchor.y - crop.y) * scale;

  ctx.save();
  ctx.globalAlpha = bird.alpha ?? 1;
  ctx.translate(anchorX, anchorY);
  ctx.drawImage(
    art.image,
    crop.x,
    crop.y,
    crop.w,
    crop.h,
    Math.round(drawX),
    Math.round(drawY),
    Math.round(crop.w * scale),
    Math.round(crop.h * scale),
  );
  ctx.restore();
}

const COLOR_TO_ANIMATION = new Map([
  ["#ffd64a", "yellow"],
  ["#3aa7ff", "blue"],
  ["#ff5252", "red"],
  ["#58d85a", "green"],
  ["#b464ff", "purple"],
  ["#ff9a38", "orange"],
  ["#ff72b6", "pink"],
  ["#44e6e8", "cyan"],
]);

function getColorFrames(art, color) {
  const animationName = COLOR_TO_ANIMATION.get(String(color).toLowerCase()) || "yellow";
  const animation = art.animations?.find((entry) => entry.name === animationName);
  return animation?.frames || art.frames?.slice(0, 3) || [];
}

export function drawFallbackTrophy(ctx, x, y, size) {
  const scale = size / 28;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  pixel(ctx, -9, -11, 18, 4, "#7b4b15");
  pixel(ctx, -8, -14, 16, 10, "#f3c54a");
  pixel(ctx, -6, -12, 12, 6, "#ffd96f");
  pixel(ctx, -14, -11, 5, 7, "#f3c54a");
  pixel(ctx, 9, -11, 5, 7, "#f3c54a");
  pixel(ctx, -3, -4, 6, 8, "#d88c24");
  pixel(ctx, -8, 4, 16, 4, "#f3c54a");
  pixel(ctx, -11, 8, 22, 4, "#7b4b15");
  ctx.restore();
}

function drawWing(ctx, frame, dark, light) {
  if (frame === 0) {
    pixel(ctx, -7, -5, 7, 3, "#222034");
    pixel(ctx, -7, -8, 6, 4, light);
    pixel(ctx, -5, -10, 4, 2, light);
    return;
  }
  if (frame === 2) {
    pixel(ctx, -7, 1, 8, 5, "#222034");
    pixel(ctx, -7, 2, 7, 5, dark);
    pixel(ctx, -5, 6, 5, 3, dark);
    return;
  }
  pixel(ctx, -8, -1, 9, 5, "#222034");
  pixel(ctx, -7, 0, 8, 4, dark);
  pixel(ctx, -5, 1, 5, 2, light);
}

function pixel(ctx, x, y, width, height, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width, height);
}

function shade(hex, amount) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  const red = clamp(((value >> 16) & 255) + amount);
  const green = clamp(((value >> 8) & 255) + amount);
  const blue = clamp((value & 255) + amount);
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function toHex(value) {
  return value.toString(16).padStart(2, "0");
}
