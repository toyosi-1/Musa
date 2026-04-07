const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

/**
 * Script to generate Musa mascot icons for all required sizes
 * This creates properly sized favicon and app icons from the Musa mascot image
 */
async function generateMusaIcons() {
  console.log('🔄 Generating Musa mascot icons for favicons and PWA...');
  
  const projectRoot = path.join(__dirname, '..');
  const sourceImagePath = path.join(projectRoot, 'public', 'images', 'musa-mascot.png');
  const outputDir = path.join(projectRoot, 'public', 'images');
  const faviconDir = path.join(projectRoot, 'public');
  
  // Make sure directories exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Check if source image exists
  if (!fs.existsSync(sourceImagePath)) {
    console.error('❌ Source image not found:', sourceImagePath);
    console.log('Please save the Musa mascot image as public/images/musa-mascot.png');
    return;
  }
  
  try {
    // Load the source image
    const img = await loadImage(sourceImagePath);
    
    // Generate PWA icons in various sizes
    const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    for (const size of iconSizes) {
      console.log(`Generating ${size}x${size} icon...`);
      await generateIcon(img, size, size, path.join(outputDir, `icon-${size}x${size}.png`));
    }
    
    // Generate favicon sizes
    await generateIcon(img, 16, 16, path.join(faviconDir, 'favicon-16x16.png'));
    await generateIcon(img, 32, 32, path.join(faviconDir, 'favicon-32x32.png'));
    await generateIcon(img, 180, 180, path.join(faviconDir, 'apple-touch-icon.png'));
    await generateIcon(img, 512, 512, path.join(faviconDir, 'new-musa-logo.png'));
    
    // Generate main favicon.ico (32x32)
    await generateIcon(img, 32, 32, path.join(faviconDir, 'favicon.ico'));
    
    console.log('✅ Successfully generated all Musa mascot icons!');
    console.log('📌 Note: Please verify that the icons look good at small sizes.');
    console.log('📌 The mascot is now used in both email templates and as the app icon.');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

async function generateIcon(sourceImage, width, height, outputPath) {
  // Create a canvas with the desired dimensions
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Make background transparent
  ctx.clearRect(0, 0, width, height);
  
  // Draw the image with some padding to ensure it fits nicely
  const padding = Math.floor(width * 0.1); // 10% padding
  ctx.drawImage(
    sourceImage, 
    0, 0, sourceImage.width, sourceImage.height, 
    padding, padding, width - (padding * 2), height - (padding * 2)
  );
  
  // Write the file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

// Run the generator
generateMusaIcons().catch(console.error);
