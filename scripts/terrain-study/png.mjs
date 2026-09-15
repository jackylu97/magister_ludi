// A dependency-free PNG reader/writer for the grain build step and its pin test.
// The grains are the only images the renderer samples as raw numbers, so the
// identity test must decode them itself rather than trust an image library.
// Only the shapes the grains actually use are handled: 8-bit, non-interlaced,
// greyscale or truecolour, with or without alpha.
import { inflateSync, deflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

/** Every chunk in file order, so a caller can assert what a shipped grain carries. */
export function pngChunks(buffer) {
  const chunks = [];
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset), type = buffer.toString('ascii', offset + 4, offset + 8);
    chunks.push({ type, length, data: buffer.subarray(offset + 8, offset + 8 + length) });
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return chunks;
}

export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  const chunks = pngChunks(buffer), header = chunks.find(chunk => chunk.type === 'IHDR');
  if (!header) throw new Error('PNG has no IHDR');
  const width = header.data.readUInt32BE(0), height = header.data.readUInt32BE(4);
  const depth = header.data[8], colorType = header.data[9], interlace = header.data[12];
  if (depth !== 8 || interlace !== 0 || !(colorType in CHANNELS)) throw new Error(`unsupported PNG: depth ${depth} colorType ${colorType} interlace ${interlace}`);
  const channels = CHANNELS[colorType];
  const raw = inflateSync(Buffer.concat(chunks.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data)));
  const stride = width * channels, data = Buffer.alloc(height * stride);
  let source = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[source++], row = y * stride, previous = row - stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[source + x];
      const a = x >= channels ? data[row + x - channels] : 0;
      const b = y > 0 ? data[previous + x] : 0;
      const c = x >= channels && y > 0 ? data[previous + x - channels] : 0;
      let restored;
      switch (filter) {
        case 0: restored = value; break;
        case 1: restored = value + a; break;
        case 2: restored = value + b; break;
        case 3: restored = value + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          restored = value + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`unsupported PNG filter ${filter}`);
      }
      data[row + x] = restored & 0xff;
    }
    source += stride;
  }
  return { width, height, channels, colorType, depth, data };
}

/** The red channel is the only one any shader reads; it is what must survive. */
export function redChannel({ width, height, channels, data }) {
  const red = Buffer.alloc(width * height);
  for (let i = 0; i < red.length; i++) red[i] = data[i * channels];
  return red;
}

function crc32(buffer) {
  let crc = ~0;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

/**
 * One byte a pixel, no ancillary chunks: nothing for a decoder to colour-manage,
 * so the sampled value is the byte written here. Filters are chosen per row by
 * the customary minimum-absolute-sum heuristic — it changes only the file size.
 */
export function encodeGreyPng(width, height, gray) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = gray.subarray(y * width, (y + 1) * width);
    const previous = y > 0 ? gray.subarray((y - 1) * width, y * width) : null;
    let best = null;
    for (let filter = 0; filter < 5; filter++) {
      const encoded = Buffer.alloc(width + 1);
      encoded[0] = filter;
      let score = 0;
      for (let x = 0; x < width; x++) {
        const value = row[x], a = x > 0 ? row[x - 1] : 0, b = previous ? previous[x] : 0;
        const c = x > 0 && previous ? previous[x - 1] : 0;
        let out;
        switch (filter) {
          case 0: out = value; break;
          case 1: out = value - a; break;
          case 2: out = value - b; break;
          case 3: out = value - ((a + b) >> 1); break;
          default: {
            const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
            out = value - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          }
        }
        encoded[x + 1] = out & 0xff;
        score += Math.min(encoded[x + 1], 256 - encoded[x + 1]);
      }
      if (!best || score < best.score) best = { score, encoded };
    }
    rows.push(best.encoded);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 0; header[10] = 0; header[11] = 0; header[12] = 0;
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
