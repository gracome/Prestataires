/**
 * Application icons.
 *
 * Drawn here rather than shipped as binaries so the mark can be changed by
 * editing numbers instead of opening a design tool, and so nobody has to
 * wonder where a stray PNG came from.
 *
 * Usage: npm run icons
 *
 * Written straight to PNG with Node's own zlib. An image library would be a
 * heavy dependency for four flat shapes.
 */

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// A very small PNG writer
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));

  return Buffer.concat([length, typed, crc]);
}

/** `pixels` is RGBA, row-major, 4 bytes per pixel. */
function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // One filter byte per scanline. Filter 0 keeps the writer trivial; these
  // images are flat colour, so deflate compresses them well regardless.
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const at = y * (width * 4 + 1);
    raw[at] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * width * 4, width * 4).copy(
      raw,
      at + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The mark: a calendar page
// ---------------------------------------------------------------------------

type Rgba = [number, number, number, number];

const BRAND: Rgba = [0xb0, 0x79, 0x7a, 255];
const PAPER: Rgba = [0xff, 0xff, 0xff, 255];
const CLEAR: Rgba = [0, 0, 0, 0];

/** Coverage of a rounded rectangle at one point, in 0..1, already supersampled. */
function insideRoundedRect(
  x: number,
  y: number,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
): boolean {
  if (x < left || y < top || x > left + width || y > top + height) return false;

  const right = left + width;
  const bottom = top + height;
  const r = Math.min(radius, width / 2, height / 2);

  // Only the four corner squares need the circle test.
  const cx = x < left + r ? left + r : x > right - r ? right - r : x;
  const cy = y < top + r ? top + r : y > bottom - r ? bottom - r : y;

  if (cx === x && cy === y) return true;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/**
 * Paint one icon.
 *
 * `monochrome` draws the glyph in white on transparent, which is what Android
 * expects of a notification badge: it masks the image to a single colour and a
 * coloured badge would come out as a blob.
 */
function draw(size: number, monochrome: boolean): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  const SS = 4; // supersampling, to get smooth corners without a graphics stack

  // Everything below is expressed as a fraction of the canvas, so one set of
  // numbers serves every size.
  const u = (value: number) => value * size;

  const plate = { left: u(0.06), top: u(0.06), w: u(0.88), h: u(0.88), r: u(0.22) };
  const page = { left: u(0.24), top: u(0.28), w: u(0.52), h: u(0.46), r: u(0.07) };
  const band = { left: page.left, top: page.top, w: page.w, h: u(0.11), r: u(0.07) };
  const tabW = u(0.055);
  const tabH = u(0.12);
  const tabs = [
    { left: u(0.355) - tabW / 2, top: u(0.185) },
    { left: u(0.645) - tabW / 2, top: u(0.185) },
  ];
  const dotR = u(0.035);
  const dots = [
    { x: u(0.365), y: u(0.6) },
    { x: u(0.5), y: u(0.6) },
    { x: u(0.635), y: u(0.6) },
  ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const colour = sample(px, py);
          r += colour[0] * colour[3];
          g += colour[1] * colour[3];
          b += colour[2] * colour[3];
          a += colour[3];
        }
      }

      const samples = SS * SS;
      const at = (y * size + x) * 4;
      // Premultiplied while averaging, then divided back out, so a shape edge
      // against transparency does not pick up a dark fringe.
      pixels[at] = a > 0 ? Math.round(r / a) : 0;
      pixels[at + 1] = a > 0 ? Math.round(g / a) : 0;
      pixels[at + 2] = a > 0 ? Math.round(b / a) : 0;
      pixels[at + 3] = Math.round(a / samples);
    }
  }

  function sample(x: number, y: number): Rgba {
    const onPlate = insideRoundedRect(
      x, y, plate.left, plate.top, plate.w, plate.h, plate.r,
    );

    if (!monochrome && !onPlate) return CLEAR;

    const onTab = tabs.some((tab) =>
      insideRoundedRect(x, y, tab.left, tab.top, tabW, tabH, tabW / 2),
    );
    const onPage = insideRoundedRect(
      x, y, page.left, page.top, page.w, page.h, page.r,
    );
    const onBand = insideRoundedRect(
      x, y, band.left, band.top, band.w, band.h, band.r,
    );
    const onDot = dots.some((dot) => (x - dot.x) ** 2 + (y - dot.y) ** 2 <= dotR * dotR);

    if (monochrome) {
      // White glyph on nothing: the page outline, its tabs, and the dots cut
      // back out so the shape reads at 24 pixels.
      if (onTab) return PAPER;
      if (onPage && !onBand && onDot) return CLEAR;
      if (onPage) return PAPER;
      return CLEAR;
    }

    if (onTab) return PAPER;
    if (onBand) return BRAND;
    if (onDot) return BRAND;
    if (onPage) return PAPER;
    return BRAND;
  }

  return pixels;
}

// ---------------------------------------------------------------------------

const out = join(process.cwd(), "public");
mkdirSync(out, { recursive: true });

const files: Array<{ name: string; size: number; monochrome: boolean }> = [
  { name: "icon-192.png", size: 192, monochrome: false },
  { name: "icon-512.png", size: 512, monochrome: false },
  // iOS uses this one for the home screen, and it must not be transparent.
  { name: "apple-touch-icon.png", size: 180, monochrome: false },
  // Android masks the badge to one colour, so it ships as a white glyph.
  { name: "badge.png", size: 96, monochrome: true },
];

for (const file of files) {
  const png = encodePng(file.size, file.size, draw(file.size, file.monochrome));
  writeFileSync(join(out, file.name), png);
  console.log(`  ${file.name.padEnd(22)} ${file.size}×${file.size}  ${png.length} octets`);
}

console.log("\nIcônes écrites dans public/.");
