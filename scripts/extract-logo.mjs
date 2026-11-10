import sharp from "sharp";

/**
 * Lift the mark out of the supplied logo file.
 *
 * The file is a crop of a larger composition: the artwork sits on a blurred
 * photograph of a salon, there is a plant in the bottom right corner, and
 * nothing in it is transparent. Pasted on the page as it came, it read as a
 * screenshot, which is exactly what it is.
 *
 * Only the lotus and the wordmark are taken. The baseline underneath is left
 * behind on purpose: the plant overlaps its last words, and set as live text
 * it is crisper at every size than any extraction would be.
 *
 * Two tests build the alpha channel.
 *
 * Luminance, because the artwork is dark on a light ground: fully opaque below
 * LO, fully clear above HI, a ramp between so the antialiasing survives.
 *
 * And hue, because the plant is dark too and luminance alone would keep it.
 * Both the wine (#560a2d) and the gold (#c28e5e) carry more red than green;
 * foliage carries the opposite. Anything whose green reaches its red is
 * dropped, which removes the leaves and the grey fringing in one test.
 */

const SOURCE = process.argv[2];
const OUT = process.argv[3];

// The mark only: above the baseline, clear of the dark band on the far left.
const REGION = { left: 32, top: 12, width: 322, height: 120 };

const HI = 226; // lighter than this is ground
const LO = 185; // darker than this is artwork

const { data, info } = await sharp(SOURCE)
  .extract(REGION)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const out = Buffer.alloc(data.length);
let kept = 0;

for (let i = 0; i < data.length; i += info.channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;

  let alpha = (HI - luma) / (HI - LO);
  alpha = Math.max(0, Math.min(1, alpha));

  // Saturation, because luminance alone keeps the shadows in the photograph.
  // The blurred wall on the right is darker than HI and survived as a pale
  // panel. The wine sits near 0.88 saturation and the gold near 0.52, while
  // the ground and its shadows stay under 0.15: a washed pink is not ink.
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const satAlpha = Math.max(0, Math.min(1, (sat - 0.16) / 0.14));
  alpha = Math.min(alpha, satAlpha);

  // Foliage, and anything neutral enough to be fringing rather than ink.
  if (g >= r - 2) alpha = 0;

  // The blurred photograph leaves a haze at a few percent opacity over the
  // whole frame. It is invisible on white and shows as a pale panel on cream,
  // which is where this is going. Below this the pixel is ground, not an
  // antialiased edge.
  if (alpha < 0.14) alpha = 0;

  out[i] = r;
  out[i + 1] = g;
  out[i + 2] = b;
  out[i + 3] = Math.round(alpha * 255);
  if (alpha > 0.5) kept += 1;
}

await sharp(out, {
  raw: { width: info.width, height: info.height, channels: info.channels },
})
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(
  `${OUT}: ${info.width}x${info.height}, ${kept} pixels opaques sur ${
    info.width * info.height
  }`,
);
