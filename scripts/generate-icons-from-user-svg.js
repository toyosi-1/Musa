const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Icon sizes needed for the app
const iconSizes = [
  // Favicon sizes
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  
  // Apple Touch Icons
  { size: 57, name: 'apple-touch-icon-57x57.png' },
  { size: 60, name: 'apple-touch-icon-60x60.png' },
  { size: 72, name: 'apple-touch-icon-72x72.png' },
  { size: 76, name: 'apple-touch-icon-76x76.png' },
  { size: 114, name: 'apple-touch-icon-114x114.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 144, name: 'apple-touch-icon-144x144.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // Default Apple touch icon
  
  // Android Chrome Icons
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
  
  // PWA Icons in images directory
  { size: 72, name: 'images/icon-72x72.png' },
  { size: 96, name: 'images/icon-96x96.png' },
  { size: 128, name: 'images/icon-128x128.png' },
  { size: 144, name: 'images/icon-144x144.png' },
  { size: 152, name: 'images/icon-152x152.png' },
  { size: 180, name: 'images/icon-180x180.png' },
  { size: 192, name: 'images/icon-192x192.png' },
  { size: 384, name: 'images/icon-384x384.png' },
  { size: 512, name: 'images/icon-512x512.png' },
  
  // Additional icon sizes
  { size: 57, name: 'images/icon-57x57.png' },
  { size: 60, name: 'images/icon-60x60.png' },
  { size: 76, name: 'images/icon-76x76.png' },
  { size: 114, name: 'images/icon-114x114.png' },
  { size: 120, name: 'images/icon-120x120.png' },
  { size: 167, name: 'images/icon-167x167.png' },
  
  // Special logo file
  { size: 512, name: 'new-musa-logo.png' }
];

async function generateIconFromSVG(svgPath, outputPath, size) {
  try {
    // Read SVG content
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // Create a data URL from SVG
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    
    // Load the SVG as an image
    const img = await loadImage(svgDataUrl);
    
    // Create canvas with the desired size
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, size, size);
    
    // Draw the SVG image scaled to fit the canvas
    ctx.drawImage(img, 0, 0, size, size);
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`Generated ${outputPath} (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`Error generating ${outputPath}:`, error);
    return false;
  }
}

async function generateAllIcons() {
  const projectRoot = path.join(__dirname, '..');
  const svgPath = path.join(projectRoot, 'public', 'favicon.svg');
  const publicDir = path.join(projectRoot, 'public');
  
  // Ensure directories exist
  const imagesDir = path.join(publicDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  console.log(`Generating icons from your custom SVG: ${svgPath}`);
  console.log('Creating all required icon sizes...\n');
  
  let successCount = 0;
  
  for (const iconConfig of iconSizes) {
    const outputPath = path.join(publicDir, iconConfig.name);
    const outputDir = path.dirname(outputPath);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const success = await generateIconFromSVG(svgPath, outputPath, iconConfig.size);
    if (success) {
      successCount++;
    }
  }
  
  console.log(`\n✅ Successfully generated ${successCount}/${iconSizes.length} icons from your custom design!`);
  
  // Update version in manifest.json and layout.tsx
  await updateIconVersions();
}

async function updateIconVersions() {
  const timestamp = new Date().getTime();
  const version = `v${timestamp}`;
  
  console.log('\nUpdating icon versions to prevent caching...');
  
  // Update manifest.json
  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.icons = manifest.icons.map(icon => {
      const [basePath, ext] = icon.src.split('.');
      const cleanPath = basePath.split('?')[0]; // Remove existing version
      return {
        ...icon,
        src: `${cleanPath}.${ext}?version=${version}`
      };
    });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Updated manifest.json with new icon versions');
  }
  
  // Update layout.tsx
  const layoutPath = path.join(__dirname, '..', 'src', 'app', 'layout.tsx');
  if (fs.existsSync(layoutPath)) {
    let layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    // Update icon references with version parameter
    const iconReferences = [
      '/favicon.ico',
      '/favicon-16x16.png',
      '/favicon-32x32.png',
      '/apple-touch-icon.png',
      '/apple-touch-icon-180x180.png'
    ];
    
    iconReferences.forEach(iconPath => {
      const regex = new RegExp(`${iconPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?version=v\\d+)?`, 'g');
      layoutContent = layoutContent.replace(regex, `${iconPath}?version=${version}`);
    });
    
    fs.writeFileSync(layoutPath, layoutContent);
    console.log('✅ Updated layout.tsx with new icon versions');
  }
  
  console.log(`\n🎉 All icons updated with your custom design and version: ${version}`);
}

// Run the icon generation
generateAllIcons().catch(console.error);
