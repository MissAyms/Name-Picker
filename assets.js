export async function loadBirdArt(assets) {
  const sheetUrl = assets?.get("BIRD_FLAP_SHEET");
  const framesUrl = assets?.get("BIRD_FLAP_FRAMES");
  if (!sheetUrl || !framesUrl) return null;

  const [image, frameData] = await Promise.all([
    loadImage(sheetUrl),
    fetch(framesUrl).then((response) => {
      if (!response.ok) throw new Error("Could not load bird frame data");
      return response.json();
    }),
  ]);

  return {
    image: removeGreenKey(image),
    frames: Array.isArray(frameData.frames) ? frameData.frames : [],
    animations: Array.isArray(frameData.animations) ? frameData.animations : [],
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image ${url}`));
    image.src = url;
  });
}

// The generated sheet uses a chroma scaffold; key it once into a canvas so
// gameplay draws only the original bird pixels at full speed.
function removeGreenKey(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < data.data.length; index += 4) {
    const red = data.data[index];
    const green = data.data[index + 1];
    const blue = data.data[index + 2];
    if (green > 145 && red < 80 && blue < 90) {
      data.data[index + 3] = 0;
    }
  }
  context.putImageData(data, 0, 0);
  return canvas;
}
