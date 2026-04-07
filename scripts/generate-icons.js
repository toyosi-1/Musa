const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Ensure the images directory exists
const outputDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Source icon (use the existing favicon.svg as base)
const sourceIcon = path.join(__dirname, '../public/favicon.svg');

// Icon sizes to generate
const iconSizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
  console.log('Generating app icons...');
  
  try {
    // Generate each icon size
    for (const size of iconSizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated ${outputPath}`);
    }

    // Generate favicon.ico
    await sharp(sourceIcon)
      .resize(32, 32)
      .toFile(path.join(outputDir, 'favicon.ico'));
    console.log('✅ Generated favicon.ico');

    console.log('\n🎉 All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
