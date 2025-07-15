const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceImagePath = path.join(__dirname, '../public/new-musa-logo.png');
const timestamp = new Date().getTime();
const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
const iconVersion = `v${dateStr}_${timestamp}`;

console.log('🧹 Cleaning up icon files and ensuring proper formats...');

// Function to create favicon PNG files
async function createFaviconPngs() {
  console.log('📌 Creating favicon PNG files...');
  
  // Create favicon-16x16.png
  try {
    await sharp(sourceImagePath)
      .resize(16, 16)
      .toFile(path.join(__dirname, '../public/favicon-16x16.png'));
    console.log('✅ Created favicon-16x16.png');
  } catch (error) {
    console.error('❌ Error creating favicon-16x16.png:', error);
  }
  
  // Create favicon-32x32.png
  try {
    await sharp(sourceImagePath)
      .resize(32, 32)
      .toFile(path.join(__dirname, '../public/favicon-32x32.png'));
    console.log('✅ Created favicon-32x32.png');
  } catch (error) {
    console.error('❌ Error creating favicon-32x32.png:', error);
  }
  
  // Create proper ICO file
  try {
    await sharp(sourceImagePath)
      .resize(32, 32)
      .toFile(path.join(__dirname, '../public/favicon.png'));
    console.log('✅ Created favicon.png (32x32)');
    
    // We don't have a direct ICO generator in sharp, so we'll copy the PNG
    // But in production, you should use a proper ICO generator
    fs.copyFileSync(
      path.join(__dirname, '../public/favicon.png'), 
      path.join(__dirname, '../public/favicon.ico')
    );
    console.log('✅ Updated favicon.ico');
    
    // Clean up the temporary file
    fs.unlinkSync(path.join(__dirname, '../public/favicon.png'));
  } catch (error) {
    console.error('❌ Error updating favicon.ico:', error);
  }
}

// Update manifest.json to clean up duplicate icon entries
function cleanManifestIcons() {
  console.log('📝 Cleaning up manifest.json icon entries...');
  
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  const manifest = require(manifestPath);
  
  // Clean up duplicate entries and standardize icon paths
  const uniqueIcons = new Map();
  
  // Define the priority order for icon formats
  const formatPriority = {
    'any maskable': 3,
    'maskable': 2,
    'any': 1
  };
  
  // Process each icon
  manifest.icons.forEach(icon => {
    const size = icon.sizes;
    // Remove the query parameters for comparison
    const baseSrc = icon.src.split('?')[0];
    
    // Get the purpose/format priority
    const priority = formatPriority[icon.purpose] || 0;
    
    // If we already have this size, check if the current one has higher priority
    if (!uniqueIcons.has(size) || priority > uniqueIcons.get(size).priority) {
      uniqueIcons.set(size, {
        src: `${baseSrc}?v=${iconVersion}`,
        sizes: size,
        type: icon.type || 'image/png',
        purpose: icon.purpose || 'any',
        priority
      });
    }
  });
  
  // Create a new icons array with unique entries
  manifest.icons = Array.from(uniqueIcons.values()).map(({src, sizes, type, purpose}) => ({
    src,
    sizes,
    type,
    purpose
  }));
  
  // Ensure we have the main required icons
  const requiredSizes = ['16x16', '32x32', '72x72', '96x96', '128x128', '144x144', '152x152', '180x180', '192x192', '512x512'];
  
  const existingSizes = new Set(manifest.icons.map(icon => icon.sizes));
  
  // Add missing required sizes
  for (const size of requiredSizes) {
    if (!existingSizes.has(size)) {
      const [width] = size.split('x').map(Number);
      
      // Use the right path based on size
      let src;
      if (width <= 32) {
        src = `/favicon-${size}.png?v=${iconVersion}`;
      } else if (width === 180) {
        src = `/apple-touch-icon.png?v=${iconVersion}`;
      } else {
        src = `/images/icon-${size}.png?v=${iconVersion}`;
      }
      
      manifest.icons.push({
        src,
        sizes: size,
        type: 'image/png',
        purpose: 'any'
      });
    }
  }
  
  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Cleaned up manifest.json');
}

// Update layout.tsx to ensure proper icon references
function updateLayout() {
  console.log('📝 Updating layout.tsx with standardized icon references...');
  
  const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
  let layoutContent = fs.readFileSync(layoutPath, 'utf8');
  
  // Replace favicon references with standard ones
  layoutContent = layoutContent.replace(
    /icon: \[\s*{[^}]*?url: '\/favicon\.ico'[^}]*?},/s,
    `icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/favicon-16x16.png?v=${iconVersion}', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png?v=${iconVersion}', sizes: '32x32', type: 'image/png' },`
  );
  
  // Update apple touch icon references
  layoutContent = layoutContent.replace(
    /'apple-touch-icon': '\/images\/icon-180x180\.png[^']*'/,
    `'apple-touch-icon': '/apple-touch-icon.png?v=${iconVersion}'`
  );
  
  // Fix any incorrect apple-touch-icon references
  layoutContent = layoutContent.replace(
    /\/apple-touch-icon\.png(?!\?v=)/g,
    `/apple-touch-icon.png?v=${iconVersion}`
  );
  
  fs.writeFileSync(layoutPath, layoutContent);
  console.log('✅ Updated layout.tsx with standardized icon references');
}

// Remove unnecessary icon files
function cleanupUnnecessaryFiles() {
  console.log('🧹 Removing unnecessary icon files...');
  
  const filesToRemove = [
    '/favicon-16x16.svg',
    '/favicon-32x32.svg'
  ];
  
  filesToRemove.forEach(file => {
    const fullPath = path.join(__dirname, '../public', file);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`✅ Removed ${file}`);
      } catch (error) {
        console.error(`❌ Error removing ${file}:`, error);
      }
    } else {
      console.log(`ℹ️ File ${file} not found, skipping`);
    }
  });
}

// Run all functions
async function main() {
  console.log('🚀 Starting icon cleanup process...');
  await createFaviconPngs();
  cleanManifestIcons();
  updateLayout();
  cleanupUnnecessaryFiles();
  console.log('\n✨ Icon cleanup complete!');
  console.log(`\n🔄 Icons versioned with: ${iconVersion}`);
  console.log('\n📱 You will need to clear your browser cache and reinstall the PWA to see the changes.');
}

// Run the main function
main();
