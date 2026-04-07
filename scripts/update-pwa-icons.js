const fs = require('fs');
const path = require('path');

// Get current timestamp to use as version
const timestamp = new Date().getTime();
const iconVersion = `v${timestamp}`;

// Update manifest.json
const manifestPath = path.join(__dirname, '../public/manifest.json');
const manifest = require(manifestPath);

// Update icon paths with version parameter
manifest.icons = manifest.icons.map(icon => {
  const [basePath, ext] = icon.src.split('.');
  return {
    ...icon,
    src: `${basePath}.${ext}?version=${iconVersion}`
  };
});

// Write updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Updated manifest.json with versioned icon paths');

// Now update the layout.tsx file to add version parameter to iOS specific icons
const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Add version parameter to all icon references
layoutContent = layoutContent.replace(
  /(\/(images|)\/icon-[0-9x]+\.png)(?!\?version)/g, 
  `$1?version=${iconVersion}`
);

// Also update apple-touch-icon.png reference
layoutContent = layoutContent.replace(
  /(\/(apple-touch-icon\.png))(?!\?version)/g, 
  `$1?version=${iconVersion}`
);

fs.writeFileSync(layoutPath, layoutContent);
console.log('Updated layout.tsx with versioned icon paths');

console.log(`\nPWA icons updated with version: ${iconVersion}`);
console.log('This will force iOS to load the new icons on next app installation.');
console.log('\nIMPORTANT: You need to remove and re-add the app to your home screen to see the changes.');
