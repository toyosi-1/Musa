const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Ensure the splash directory exists
const splashDir = path.join(__dirname, '../public/images/splash');
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

// Source icon (use the existing favicon.svg as base)
const sourceIcon = path.join(__dirname, '../public/favicon.svg');

// Splash screen configurations for different devices
const splashSizes = [
  // iPhone 5/SE
  { name: 'iphone5_splash', width: 640, height: 1136, ratio: 2 },
  // iPhone 6/7/8
  { name: 'iphone6_splash', width: 750, height: 1334, ratio: 2 },
  // iPhone 6/7/8 Plus
  { name: 'iphoneplus_splash', width: 1242, height: 2208, ratio: 3 },
  // iPhone X/XS/11 Pro
  { name: 'iphonex_splash', width: 1125, height: 2436, ratio: 3 },
  // iPad
  { name: 'ipad_splash', width: 1536, height: 2048, ratio: 2 },
  // iPad Pro 10.5
  { name: 'ipadpro1_splash', width: 1668, height: 2224, ratio: 2 },
  // iPad Pro 11
  { name: 'ipadpro2_splash', width: 1668, height: 2388, ratio: 2 },
  // iPad Pro 12.9
  { name: 'ipadpro3_splash', width: 2048, height: 2732, ratio: 2 },
];

async function generateSplashScreens() {
  console.log('Generating splash screens...');
  
  try {
    // Create a base SVG template for splash screens
    const baseSvg = `
      <svg width="{{width}}" height="{{height}}" viewBox="0 0 {{width}} {{height}}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#3b82f6"/>
        <g transform="translate({{centerX}}, {{centerY}})">
          <circle cx="0" cy="0" r="{{iconSize}}" fill="#ffffff">
            <animate attributeName="r" values="{{iconSize}};{{iconSize * 0.9}};{{iconSize}}" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="0" y="{{textY}}" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#ffffff">
            Musa
          </text>
        </g>
      </svg>
    `;

    for (const size of splashSizes) {
      const iconSize = Math.min(size.width, size.height) * 0.2;
      const centerX = size.width / 2;
      const centerY = size.height / 2;
      const textY = centerY + iconSize + 60;
      
      // Replace placeholders in the SVG template
      const svgContent = baseSvg
        .replace(/{{width}}/g, size.width)
        .replace(/{{height}}/g, size.height)
        .replace(/{{centerX}}/g, centerX)
        .replace(/{{centerY}}/g, centerY)
        .replace(/{{iconSize}}/g, iconSize)
        .replace(/{{textY}}/g, textY);
      
      const outputPath = path.join(splashDir, `${size.name}.png`);
      
      // Convert SVG to PNG using sharp
      await sharp(Buffer.from(svgContent))
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${outputPath} (${size.width}x${size.height})`);
    }
    
    console.log('\n🎉 All splash screens generated successfully!');
  } catch (error) {
    console.error('Error generating splash screens:', error);
    process.exit(1);
  }
}

generateSplashScreens();
