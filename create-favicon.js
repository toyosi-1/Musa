const fs = require('fs');
const path = require('path');

// Create a simplified version of the Musa character for favicon
function createFaviconSVG() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="16" cy="16" r="15" fill="#DAA520" stroke="#B8860B" stroke-width="1"/>
  
  <!-- Character simplified for small size -->
  <!-- Cap -->
  <ellipse cx="16" cy="12" rx="8" ry="4" fill="#FFD700"/>
  <ellipse cx="16" cy="11" rx="6" ry="2" fill="#FFFF99"/>
  
  <!-- Face -->
  <circle cx="16" cy="18" r="6" fill="#8B4513"/>
  
  <!-- Eyes -->
  <circle cx="14" cy="16" r="1" fill="#000"/>
  <circle cx="18" cy="16" r="1" fill="#000"/>
  
  <!-- Nose -->
  <circle cx="16" cy="18" r="0.5" fill="#654321"/>
  
  <!-- Beard -->
  <ellipse cx="16" cy="22" rx="4" ry="2" fill="#2F2F2F"/>
  
  <!-- Kurta (simplified) -->
  <rect x="12" y="24" width="8" height="6" fill="#B8860B" rx="2"/>
  <circle cx="14" cy="26" r="0.5" fill="#FFD700"/>
  <circle cx="18" cy="26" r="0.5" fill="#FFD700"/>
</svg>`;
}

// Create ICO file data (simplified approach)
function createFaviconICO() {
  // For a more complete solution, you'd convert SVG to ICO
  // For now, we'll create the SVG and then convert manually or use it directly
  const svgContent = createFaviconSVG();
  
  // Write SVG version for browsers that support it
  fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), svgContent);
  
  return svgContent;
}

// Create the favicon
console.log('Creating Musa favicon...');
const svgContent = createFaviconICO();

// Also create a 16x16 and 32x32 PNG version using a simple SVG approach
const svg16 = svgContent.replace('width="32" height="32"', 'width="16" height="16"');
const svg32 = svgContent;

fs.writeFileSync(path.join(__dirname, 'public', 'favicon-16x16.svg'), svg16);
fs.writeFileSync(path.join(__dirname, 'public', 'favicon-32x32.svg'), svg32);

console.log('✅ Favicon SVG files created!');
console.log('📝 Files created:');
console.log('  - public/favicon.svg');
console.log('  - public/favicon-16x16.svg'); 
console.log('  - public/favicon-32x32.svg');
console.log('');
console.log('💡 To complete the setup:');
console.log('1. Update your HTML to reference the new favicon');
console.log('2. Consider converting the SVG to ICO format for better browser support');
