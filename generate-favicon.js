const fs = require('fs');
const path = require('path');

// Create a simple favicon using ASCII art approach for ICO format
function createSimpleFavicon() {
  // ICO file header (6 bytes)
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);      // Reserved (must be 0)
  iconDir.writeUInt16LE(1, 2);      // Image type (1 = ICO)
  iconDir.writeUInt16LE(1, 4);      // Number of images

  // Image directory entry (16 bytes)
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(32, 0);       // Width (32 pixels)
  dirEntry.writeUInt8(32, 1);       // Height (32 pixels)
  dirEntry.writeUInt8(0, 2);        // Color count (0 = no palette)
  dirEntry.writeUInt8(0, 3);        // Reserved
  dirEntry.writeUInt16LE(1, 4);     // Color planes
  dirEntry.writeUInt16LE(32, 6);    // Bits per pixel
  dirEntry.writeUInt32LE(4118, 8);  // Image data size (approximate)
  dirEntry.writeUInt32LE(22, 12);   // Image data offset

  // Simple bitmap data for 32x32 favicon (simplified)
  // This creates a golden circle with some basic Musa features
  const bitmapData = createBitmapData();

  // Combine all parts
  const favicon = Buffer.concat([iconDir, dirEntry, bitmapData]);
  
  return favicon;
}

function createBitmapData() {
  // BITMAPINFOHEADER (40 bytes) + image data
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);      // Header size
  header.writeInt32LE(32, 4);       // Width
  header.writeInt32LE(64, 8);       // Height (32*2 for AND mask)
  header.writeUInt16LE(1, 12);      // Planes
  header.writeUInt16LE(32, 14);     // Bits per pixel
  header.writeUInt32LE(0, 16);      // Compression
  header.writeUInt32LE(4096, 20);   // Image size
  header.writeUInt32LE(0, 24);      // X pixels per meter
  header.writeUInt32LE(0, 28);      // Y pixels per meter
  header.writeUInt32LE(0, 32);      // Colors used
  header.writeUInt32LE(0, 36);      // Important colors

  // Create 32x32 RGBA pixel data
  const pixels = Buffer.alloc(32 * 32 * 4);
  const andMask = Buffer.alloc(32 * 32 / 8);

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const index = ((31 - y) * 32 + x) * 4; // Flip Y coordinate
      const centerX = 16, centerY = 16;
      const dx = x - centerX, dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= 15) {
        // Inside circle - golden background
        pixels[index] = 0x20;     // Blue
        pixels[index + 1] = 0xA5; // Green  
        pixels[index + 2] = 0xDA; // Red (BGR format)
        pixels[index + 3] = 0xFF; // Alpha

        // Add some Musa features
        if (y >= 8 && y <= 12 && distance <= 8) {
          // Cap area - brighter gold
          pixels[index] = 0x00;     
          pixels[index + 1] = 0xD7;
          pixels[index + 2] = 0xFF;
        } else if (y >= 14 && y <= 20 && distance <= 6) {
          // Face area - brown
          pixels[index] = 0x13;     
          pixels[index + 1] = 0x45;
          pixels[index + 2] = 0x8B;
        } else if (y >= 20 && y <= 24 && distance <= 4) {
          // Beard area - dark
          pixels[index] = 0x2F;     
          pixels[index + 1] = 0x2F;
          pixels[index + 2] = 0x2F;
        }

        // Eyes
        if ((x === 13 || x === 19) && y === 16) {
          pixels[index] = 0x00;     
          pixels[index + 1] = 0x00;
          pixels[index + 2] = 0x00;
        }
      } else {
        // Outside circle - transparent
        pixels[index] = 0x00;
        pixels[index + 1] = 0x00;
        pixels[index + 2] = 0x00;
        pixels[index + 3] = 0x00;
      }
    }
  }

  return Buffer.concat([header, pixels, andMask]);
}

// Generate the favicon
console.log('Generating Musa favicon.ico...');
const faviconData = createSimpleFavicon();
fs.writeFileSync(path.join(__dirname, 'public', 'favicon.ico'), faviconData);

console.log('✅ favicon.ico created!');
console.log('📝 Updated public/favicon.ico with Musa character design');
