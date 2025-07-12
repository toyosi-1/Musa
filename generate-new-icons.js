const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImagePath = path.join(__dirname, 'public', 'new-musa-logo.png');
const outputDir = path.join(__dirname, 'public', 'images');

const sizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 180, name: 'icon-180x180.png' }, // For Apple Touch Icon
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Check if the source image exists
if (!fs.existsSync(sourceImagePath)) {
  console.error(`Error: Source image not found at ${sourceImagePath}`);
  console.error('Please make sure you have saved the uploaded icon as new-musa-logo.png in the public/images directory.');
  process.exit(1);
}

async function generateIcons() {
  console.log('Starting icon generation...');
  try {
    for (const item of sizes) {
      const outputPath = path.join(outputDir, item.name);
      await sharp(sourceImagePath)
        .resize(item.size, item.size)
        .toFile(outputPath);
      console.log(`Successfully created ${item.name}`);
    }

    // Also create the main favicon.ico
    const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
    await sharp(sourceImagePath)
      .resize(48, 48)
      .toFile(faviconPath);
    console.log(`Successfully created favicon.ico`);

    console.log('Icon generation complete!');
  } catch (error) {
    console.error('An error occurred during icon generation:', error);
  }
}

generateIcons();
