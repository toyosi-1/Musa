const fs = require('fs');
const path = require('path');

// Simple SVG for icons - clean Musa character representation
const iconSVG = `<?xml version="1.0" encoding="UTF-8"?>
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

// Write the icon SVG file
fs.writeFileSync('public/images/musa-icon.svg', iconSVG);

console.log('✅ Created musa-icon.svg');
console.log('');
console.log('To generate PNG icons, you can use online tools like:');
console.log('1. https://realfavicongenerator.net/');
console.log('2. https://favicon.io/favicon-converter/');
console.log('');
console.log('Upload the musa-icon.svg file and it will generate all the required PNG sizes.');
console.log('Or use ImageMagick if you have it installed:');
console.log('');
console.log('brew install imagemagick');
console.log('');
console.log('Then run these commands:');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(size => {
  console.log(`magick public/images/musa-icon.svg -resize ${size}x${size} public/images/icon-${size}x${size}.png`);
});
