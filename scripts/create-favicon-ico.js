const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function createFaviconIco() {
  const projectRoot = path.join(__dirname, '..');
  const svgPath = path.join(projectRoot, 'public', 'favicon.svg');
  const faviconPath = path.join(projectRoot, 'public', 'favicon.ico');
  
  try {
    console.log('Creating favicon.ico from your custom SVG...');
    
    // Read SVG content
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // Create a data URL from SVG
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    
    // Load the SVG as an image
    const img = await loadImage(svgDataUrl);
    
    // Create canvas for 32x32 favicon (standard size)
    const canvas = createCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, 32, 32);
    
    // Draw the SVG image scaled to fit the canvas
    ctx.drawImage(img, 0, 0, 32, 32);
    
    // Save as PNG first (ICO format is complex, using PNG as fallback)
    const buffer = canvas.toBuffer('image/png');
    
    // For now, save as favicon.ico (browsers accept PNG in .ico files)
    fs.writeFileSync(faviconPath, buffer);
    
    console.log('✅ Created favicon.ico from your custom design!');
    
  } catch (error) {
    console.error('Error creating favicon.ico:', error);
  }
}

createFaviconIco().catch(console.error);
