const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { execSync } = require('child_process');

// Check if canvas is installed, if not install it
try {
  require.resolve('canvas');
} catch (e) {
  console.log('Canvas package not found, installing...');
  execSync('npm install canvas', { stdio: 'inherit' });
  console.log('Canvas installed successfully');
}

// Get timestamp for versioning
const timestamp = new Date().getTime();
const iconVersion = `v${timestamp}`;

// Define all required icon sizes
const iconSizes = [
  // Standard PWA sizes
  16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512,
  // Additional iOS sizes
  57, 60, 76, 114, 120, 167
];

async function generateIcons() {
  console.log('Starting icon generation...');

  try {
    // Load the source image (favicon.ico)
    const sourceIconPath = path.join(__dirname, '../public/favicon.ico');
    
    // Since favicon.ico might not load directly with canvas, use the favicon.svg we created
    const sourceIconSvgPath = path.join(__dirname, '../public/favicon.svg');
    
    // Use the SVG as source
    const sourceImage = await loadImage(sourceIconSvgPath);

    // Create directory if it doesn't exist
    const imagesDir = path.join(__dirname, '../public/images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }

    // Generate all icon sizes
    console.log('Generating icons for all required sizes...');
    for (const size of iconSizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Draw image to canvas (scaled to size)
      ctx.drawImage(sourceImage, 0, 0, size, size);
      
      // Convert to buffer
      const buffer = canvas.toBuffer('image/png');
      
      // Determine file path based on size
      let outputPath;
      
      if (size === 16) {
        outputPath = path.join(__dirname, '../public/favicon-16x16.png');
      } else if (size === 32) {
        outputPath = path.join(__dirname, '../public/favicon-32x32.png');
      } else if (size === 180) {
        // Create both in images directory and root for apple-touch-icon
        outputPath = path.join(__dirname, '../public/images/icon-180x180.png');
        fs.writeFileSync(outputPath, buffer);
        
        // Also create apple-touch-icon.png at root
        const appleTouchIconPath = path.join(__dirname, '../public/apple-touch-icon.png');
        fs.writeFileSync(appleTouchIconPath, buffer);
        console.log(`Generated ${appleTouchIconPath}`);
        
        // Create specific iOS sizes as apple-touch-icon-{size}x{size}.png
        const appleIconSizePath = path.join(__dirname, `../public/apple-touch-icon-${size}x${size}.png`);
        fs.writeFileSync(appleIconSizePath, buffer);
        console.log(`Generated ${appleIconSizePath}`);
      } else if (size === 192) {
        outputPath = path.join(__dirname, '../public/images/icon-192x192.png');
        fs.writeFileSync(outputPath, buffer);
        
        // Also create android-chrome-192x192.png
        const androidChromePath = path.join(__dirname, '../public/android-chrome-192x192.png');
        fs.writeFileSync(androidChromePath, buffer);
        console.log(`Generated ${androidChromePath}`);
      } else if (size === 512) {
        outputPath = path.join(__dirname, '../public/images/icon-512x512.png');
        fs.writeFileSync(outputPath, buffer);
        
        // Also create android-chrome-512x512.png
        const androidChromePath = path.join(__dirname, '../public/android-chrome-512x512.png');
        fs.writeFileSync(androidChromePath, buffer);
        console.log(`Generated ${androidChromePath}`);
        
        // Also create new-musa-logo.png
        const newMusaLogoPath = path.join(__dirname, '../public/new-musa-logo.png');
        fs.writeFileSync(newMusaLogoPath, buffer);
        console.log(`Generated ${newMusaLogoPath}`);
      } else if ([57, 60, 72, 76, 114, 120, 144, 152, 167].includes(size)) {
        // Create specific iOS sizes as apple-touch-icon-{size}x{size}.png
        outputPath = path.join(__dirname, `../public/apple-touch-icon-${size}x${size}.png`);
        
        // Also create in images directory
        const imagesPath = path.join(__dirname, `../public/images/icon-${size}x${size}.png`);
        fs.writeFileSync(imagesPath, buffer);
        console.log(`Generated ${imagesPath}`);
      } else {
        outputPath = path.join(__dirname, `../public/images/icon-${size}x${size}.png`);
      }
      
      fs.writeFileSync(outputPath, buffer);
      console.log(`Generated ${outputPath}`);
    }

    // Update manifest.json with new version
    updateManifest(iconVersion);
    
    // Update layout.tsx with new version
    updateLayout(iconVersion);
    
    console.log('\nIcon generation complete!');
    console.log(`All icons updated with version: ${iconVersion}`);
    
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

function updateManifest(version) {
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  const manifest = require(manifestPath);
  
  // Update icon paths with version parameter
  manifest.icons = manifest.icons.map(icon => {
    const parts = icon.src.split('?')[0]; // Remove any existing version
    return {
      ...icon,
      src: `${parts}?v=${version}`
    };
  });
  
  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Updated manifest.json with versioned icon paths');
}

function updateLayout(version) {
  const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
  let layoutContent = fs.readFileSync(layoutPath, 'utf8');
  
  // Update all icon references with the new version
  // First, remove any existing version parameters
  layoutContent = layoutContent.replace(
    /(\/(images|)\/(icon|apple-touch-icon)-[0-9x]+\.png)\?v=[^"']+/g, 
    '$1'
  );
  
  // Then add the new version
  layoutContent = layoutContent.replace(
    /(\/(images|)\/(icon|apple-touch-icon)-[0-9x]+\.png)(?!\?v=)/g, 
    `$1?v=${version}`
  );
  
  // Also update favicon references
  layoutContent = layoutContent.replace(
    /(\/(favicon-[0-9x]+\.png))(?!\?v=)/g, 
    `$1?v=${version}`
  );
  
  // Update apple-touch-icon.png reference
  layoutContent = layoutContent.replace(
    /(\/(apple-touch-icon\.png))(?!\?v=)/g, 
    `$1?v=${version}`
  );
  
  // Update new-musa-logo.png reference
  layoutContent = layoutContent.replace(
    /(\/(new-musa-logo\.png))(?!\?v=)/g, 
    `$1?v=${version}`
  );
  
  fs.writeFileSync(layoutPath, layoutContent);
  console.log('Updated layout.tsx with versioned icon paths');
}

// Execute the icon generation
generateIcons();
