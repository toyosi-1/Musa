const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Get timestamp for versioning
const timestamp = new Date().getTime();
const iconVersion = `v${timestamp}`;

// The original Musa character SVG from icon-generator.html
const originalSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="256" cy="256" r="256" fill="#3b82f6"/>
  
  <!-- Character body -->
  <g transform="translate(256,256)">
    <!-- Head -->
    <circle cx="0" cy="-80" r="45" fill="#D4A574" stroke="#B8860B" stroke-width="2"/>
    
    <!-- Cap -->
    <ellipse cx="0" cy="-105" rx="50" ry="25" fill="#DAA520"/>
    <ellipse cx="0" cy="-100" rx="45" ry="20" fill="#FFD700"/>
    
    <!-- Eyes -->
    <circle cx="-12" cy="-85" r="4" fill="#FFFFFF"/>
    <circle cx="12" cy="-85" r="4" fill="#FFFFFF"/>
    <circle cx="-12" cy="-83" r="2" fill="#000000"/>
    <circle cx="12" cy="-83" r="2" fill="#000000"/>
    
    <!-- Nose -->
    <ellipse cx="0" cy="-75" rx="2" ry="4" fill="#8B4513"/>
    
    <!-- Mouth -->
    <ellipse cx="0" cy="-65" rx="8" ry="3" fill="#8B4513"/>
    
    <!-- Beard -->
    <ellipse cx="0" cy="-50" rx="25" ry="15" fill="#4A4A4A"/>
    
    <!-- Body/Kurta -->
    <ellipse cx="0" cy="20" rx="60" ry="80" fill="#B8860B"/>
    <ellipse cx="0" cy="15" rx="55" ry="75" fill="#DAA520"/>
    
    <!-- Kurta buttons -->
    <circle cx="0" cy="-10" r="3" fill="#FFD700"/>
    <circle cx="0" cy="10" r="3" fill="#FFD700"/>
    <circle cx="0" cy="30" r="3" fill="#FFD700"/>
    
    <!-- Arms -->
    <ellipse cx="-40" cy="0" rx="15" ry="50" fill="#DAA520"/>
    <ellipse cx="40" cy="0" rx="15" ry="50" fill="#DAA520"/>
    
    <!-- Hands -->
    <circle cx="-40" cy="35" r="12" fill="#D4A574"/>
    <circle cx="40" cy="35" r="12" fill="#D4A574"/>
    
    <!-- Pants -->
    <ellipse cx="0" cy="120" rx="50" ry="40" fill="#8B6F47"/>
    
    <!-- Legs -->
    <ellipse cx="-20" cy="160" rx="12" ry="30" fill="#8B6F47"/>
    <ellipse cx="20" cy="160" rx="12" ry="30" fill="#8B6F47"/>
    
    <!-- Feet -->
    <ellipse cx="-20" cy="185" rx="15" ry="8" fill="#A0522D"/>
    <ellipse cx="20" cy="185" rx="15" ry="8" fill="#A0522D"/>
  </g>
</svg>`;

// Define all required icon sizes
const iconSizes = [
  // Standard PWA sizes
  16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512,
  // Additional iOS sizes
  57, 60, 76, 114, 120, 167
];

// Restore original favicon.svg first
console.log('Restoring original SVG to favicon.svg...');
fs.writeFileSync(path.join(__dirname, '../public/favicon.svg'), originalSVG);

async function generateIcons() {
  console.log('Starting icon generation with original Musa character...');

  try {
    // Create a temporary SVG file to load
    const tempSvgPath = path.join(__dirname, '../public/temp-original.svg');
    fs.writeFileSync(tempSvgPath, originalSVG);
    
    // Load the source image (original SVG)
    const sourceImage = await loadImage(tempSvgPath);
    
    // Create directory if it doesn't exist
    const imagesDir = path.join(__dirname, '../public/images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }
    
    // Generate all icon sizes
    console.log('Generating icons for all required sizes with original design...');
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
        console.log(`Generated ${appleTouchIconPath} with original design`);
        
        // Create specific iOS sizes as apple-touch-icon-{size}x{size}.png
        const appleIconSizePath = path.join(__dirname, `../public/apple-touch-icon-${size}x${size}.png`);
        fs.writeFileSync(appleIconSizePath, buffer);
        console.log(`Generated ${appleIconSizePath} with original design`);
      } else if (size === 192) {
        outputPath = path.join(__dirname, '../public/images/icon-192x192.png');
        fs.writeFileSync(outputPath, buffer);
        
        // Also create android-chrome-192x192.png
        const androidChromePath = path.join(__dirname, '../public/android-chrome-192x192.png');
        fs.writeFileSync(androidChromePath, buffer);
        console.log(`Generated ${androidChromePath} with original design`);
      } else if (size === 512) {
        outputPath = path.join(__dirname, '../public/images/icon-512x512.png');
        fs.writeFileSync(outputPath, buffer);
        
        // Also create android-chrome-512x512.png
        const androidChromePath = path.join(__dirname, '../public/android-chrome-512x512.png');
        fs.writeFileSync(androidChromePath, buffer);
        console.log(`Generated ${androidChromePath} with original design`);
        
        // Also create new-musa-logo.png
        const newMusaLogoPath = path.join(__dirname, '../public/new-musa-logo.png');
        fs.writeFileSync(newMusaLogoPath, buffer);
        console.log(`Generated ${newMusaLogoPath} with original design`);
      } else if ([57, 60, 72, 76, 114, 120, 144, 152, 167].includes(size)) {
        // Create specific iOS sizes as apple-touch-icon-{size}x{size}.png
        outputPath = path.join(__dirname, `../public/apple-touch-icon-${size}x${size}.png`);
        fs.writeFileSync(outputPath, buffer);
        
        // Also create in images directory
        const imagesPath = path.join(__dirname, `../public/images/icon-${size}x${size}.png`);
        fs.writeFileSync(imagesPath, buffer);
        console.log(`Generated ${imagesPath} with original design`);
      } else {
        outputPath = path.join(__dirname, `../public/images/icon-${size}x${size}.png`);
      }
      
      fs.writeFileSync(outputPath, buffer);
      console.log(`Generated ${outputPath} with original design`);
    }
    
    // Clean up temp file
    fs.unlinkSync(tempSvgPath);

    // Update manifest.json with new version
    updateManifest(iconVersion);
    
    // Update layout.tsx with new version
    updateLayout(iconVersion);
    
    console.log('\nIcon restoration complete!');
    console.log(`All icons restored to original Musa character design with version: ${iconVersion}`);
    
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
