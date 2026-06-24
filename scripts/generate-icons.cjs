// Minimal PNG generator for PWA icons
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPNG(size, color) {
  const channels = 4;
  const rawData = Buffer.alloc(size * size * channels);
  const r = parseInt(color.slice(0,2), 16);
  const g = parseInt(color.slice(2,4), 16);
  const b = parseInt(color.slice(4,6), 16);
  const radius = Math.floor(size * 0.22);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * channels;
      let inside = true;
      if (x < radius) inside = Math.pow(radius - x, 2) + Math.pow(Math.min(Math.abs(y - size/2), Math.abs(y - 0)), 2) >= Math.pow(radius, 2) ? 
        (Math.pow(radius - x, 2) + Math.pow(Math.abs(y - size/2) > size/2 - radius ? Math.abs(y - size/2) - (size/2 - radius) : 0, 2) < Math.pow(radius, 2)) : true;
      if (x >= size - radius) inside = Math.pow(x - (size - radius), 2) + Math.pow(Math.min(Math.abs(y - size/2), Math.abs(y - 0)), 2) >= Math.pow(radius, 2) ?
        (Math.pow(x - (size - radius), 2) + Math.pow(Math.abs(y - size/2) > size/2 - radius ? Math.abs(y - size/2) - (size/2 - radius) : 0, 2) < Math.pow(radius, 2)) : true;

      if (inside) {
        rawData[idx] = r; rawData[idx+1] = g; rawData[idx+2] = b; rawData[idx+3] = 255;
      } else {
        rawData[idx] = 0; rawData[idx+1] = 0; rawData[idx+2] = 0; rawData[idx+3] = 0;
      }
    }
  }

  // Build PNG manually
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); table[n] = c; }
    c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcInput = Buffer.concat([typeBuf, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcInput));
    return Buffer.concat([len, typeBuf, data, crcVal]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;  // RGBA

  const scanlines = Buffer.alloc(size * (1 + size * channels));
  for (let y = 0; y < size; y++) {
    scanlines[y * (1 + size * channels)] = 0;
    rawData.copy(scanlines, y * (1 + size * channels) + 1, y * size * channels, (y + 1) * size * channels);
  }

  const idat = zlib.deflateSync(scanlines);

  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Generate 192x192 and 512x512
const publicDir = path.join(__dirname, '..', 'public');
const sizes = [192, 512];
for (const size of sizes) {
  const png = createPNG(size, '2563eb');
  fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png (${png.length} bytes)`);
}