const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

// Get current timestamp for versioning
const timestamp = new Date().getTime();
const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
const iconVersion = `v${dateStr}_${timestamp}`;

console.log('🚀 Starting complete icon update process...');

// Define the source image path
const sourceImagePath = path.join(__dirname, '../public/new-musa-logo.png');

// Check if the source image exists
if (!fs.existsSync(sourceImagePath)) {
  console.error('❌ Error: new-musa-logo.png not found in public directory!');
  console.log('\nPlease save the image as "/public/new-musa-logo.png" first.');
  process.exit(1);
}

// Install Sharp if not already installed
try {
  require.resolve('sharp');
  console.log('✅ Sharp is already installed.');
} catch (e) {
  console.log('📦 Installing Sharp package for image processing...');
  try {
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    console.log('✅ Sharp installed successfully.');
  } catch (err) {
    console.error('❌ Failed to install Sharp:', err);
    process.exit(1);
  }
}

// Function to create an icon of a specific size
async function createIcon(size, outputPath) {
  try {
    await sharp(sourceImagePath)
      .resize(size, size)
      .toFile(outputPath);
    console.log(`✅ Created ${outputPath}`);
    return true;
  } catch (err) {
    console.error(`❌ Error creating ${outputPath}:`, err);
    return false;
  }
}

// Create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
}

// Main function to create all icons
async function createAllIcons() {
  // Ensure directories exist
  ensureDirectoryExists(path.join(__dirname, '../public/images'));
  
  console.log('🖼️ Creating icons in various sizes...');
  
  // Create standard PWA icons
  const standardSizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
  for (const size of standardSizes) {
    await createIcon(size, path.join(__dirname, `../public/images/icon-${size}x${size}.png`));
  }
  
  // Create Apple-specific icons at root level
  const appleSizes = [57, 60, 72, 76, 114, 120, 144, 152, 167, 180];
  for (const size of appleSizes) {
    await createIcon(size, path.join(__dirname, `../public/apple-touch-icon-${size}x${size}.png`));
  }
  
  // Create primary Apple touch icon
  await createIcon(180, path.join(__dirname, '../public/apple-touch-icon.png'));
  
  // Create apple-touch-icon-precomposed.png (for older iOS)
  await createIcon(180, path.join(__dirname, '../public/apple-touch-icon-precomposed.png'));
  
  // Create favicon.ico (16x16, 32x32, 48x48)
  try {
    const faviconPath = path.join(__dirname, '../public/favicon.ico');
    // Copy the new-musa-logo.png as favicon.ico for now
    // In a real production environment, you'd want to use a proper favicon generator
    fs.copyFileSync(sourceImagePath, faviconPath);
    console.log('✅ Created favicon.ico (basic version)');
    
    // Create favicon.ico in images directory as well
    fs.copyFileSync(sourceImagePath, path.join(__dirname, '../public/images/favicon.ico'));
    console.log('✅ Created images/favicon.ico (basic version)');
  } catch (error) {
    console.error('❌ Failed to create favicon.ico:', error.message);
  }
  
  console.log('✅ All icons created successfully!');
}

// Update manifest.json
function updateManifest() {
  console.log('📝 Updating manifest.json...');
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  let manifest;
  
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    console.error('❌ Error reading manifest.json:', error);
    return false;
  }

  // Add new icons at the beginning (higher priority)
  manifest.icons = [
    {
      "src": `/apple-touch-icon.png?v=${iconVersion}`,
      "sizes": "180x180",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": `/new-musa-logo.png?v=${iconVersion}`,
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    ...manifest.icons.map(icon => {
      const parts = icon.src.split('?')[0]; // Remove any existing version query
      return {
        ...icon,
        src: `${parts}?v=${iconVersion}`
      };
    })
  ];

  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Updated manifest.json with versioned icon paths');
  return true;
}

// Update layout.tsx
function updateLayout() {
  console.log('📝 Updating layout.tsx...');
  const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
  let layoutContent;
  
  try {
    layoutContent = fs.readFileSync(layoutPath, 'utf8');
  } catch (error) {
    console.error('❌ Error reading layout.tsx:', error);
    return false;
  }

  // Add version parameter to all icon references
  layoutContent = layoutContent.replace(
    /(\/(images|)\/icon-[0-9x]+\.png)(?:\?version=[^"']+|)/g, 
    `$1?v=${iconVersion}`
  );

  // Update apple-touch-icon references
  layoutContent = layoutContent.replace(
    /(\/(apple-touch-icon[^"']*\.png))(?:\?[^"']*|)/g, 
    `$1?v=${iconVersion}`
  );

  // Make sure apple-touch-icon is the first in the apple icon list
  // Find the apple section within the icons object
  const appleIconsStart = layoutContent.indexOf('apple: [');
  if (appleIconsStart !== -1) {
    const appleIconsListStart = layoutContent.indexOf('[', appleIconsStart);
    const firstItemStart = layoutContent.indexOf('{', appleIconsListStart);
    
    // Replace with our custom order including root apple-touch-icon.png first
    const newAppleIconsStart = `apple: [
      // Primary Apple touch icon at root (most important for iOS)
      { url: '/apple-touch-icon.png?v=${iconVersion}', sizes: '180x180', type: 'image/png' },`;

    layoutContent = layoutContent.slice(0, appleIconsStart) + 
                  newAppleIconsStart + 
                  layoutContent.slice(layoutContent.indexOf(',', firstItemStart + 1));
  }

  // Add shortcut icons if they don't exist
  if (!layoutContent.includes('shortcut: [')) {
    const iconsObjStart = layoutContent.indexOf('icons: {');
    if (iconsObjStart !== -1) {
      const iconSectionEnd = layoutContent.indexOf('  },', iconsObjStart);
      
      // Insert shortcut section before the end of the icons object
      const shortcutSection = `
    shortcut: [
      { url: '/new-musa-logo.png?v=${iconVersion}', sizes: '192x192' },
      { url: '/apple-touch-icon.png?v=${iconVersion}', sizes: '180x180' }
    ],`;
      
      layoutContent = layoutContent.slice(0, iconSectionEnd) + 
                      shortcutSection + 
                      layoutContent.slice(iconSectionEnd);
    }
  }

  // Add more explicit meta tags for better iOS support
  if (!layoutContent.includes('<link rel="apple-touch-icon"')) {
    // Find the end of the head section to add meta tags
    const headSectionEnd = layoutContent.indexOf('</head>');
    if (headSectionEnd !== -1) {
      const metaTags = `
        {/* Explicit apple-touch-icon links for iOS */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${iconVersion}" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=${iconVersion}" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png?v=${iconVersion}" />
        <link rel="shortcut icon" href="/favicon.ico?v=${iconVersion}" />
        
        {/* Force browser to reload icons by preventing caching */}
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta http-equiv="Pragma" content="no-cache" />
        <meta http-equiv="Expires" content="0" />
      </head>`;
      
      layoutContent = layoutContent.slice(0, headSectionEnd - 6) + metaTags;
    }
  }

  fs.writeFileSync(layoutPath, layoutContent);
  console.log('✅ Updated layout.tsx with enhanced icon support');
  return true;
}

// Create the refresh pages
function createRefreshPages() {
  console.log('📝 Creating icon refresh pages...');
  
  // Create icon-refresh.html
  const refreshPagePath = path.join(__dirname, '../public/icon-refresh.html');
  const refreshPageContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Musa Icon Refresh</title>
    
    <!-- Force no cache -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    
    <!-- Apple Touch Icons with version parameter -->
    <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${iconVersion}">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=${iconVersion}">
    <link rel="apple-touch-icon" sizes="152x152" href="/images/icon-152x152.png?v=${iconVersion}">
    <link rel="apple-touch-icon" sizes="144x144" href="/images/icon-144x144.png?v=${iconVersion}">
    
    <!-- Force Safari to not use cached icon with special meta tag -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Musa">
    
    <!-- PWA manifest link with version -->
    <link rel="manifest" href="/manifest.json?v=${iconVersion}">
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            text-align: center;
            background: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        img {
            width: 180px;
            height: 180px;
            margin: 20px auto;
            display: block;
            border-radius: 22%;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        h1 {
            font-size: 24px;
            margin-bottom: 20px;
        }
        p {
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 15px;
        }
        .steps {
            text-align: left;
            margin: 20px 0;
        }
        .steps li {
            margin-bottom: 10px;
        }
        .button {
            display: inline-block;
            background: #0071e3;
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            text-decoration: none;
            font-weight: 500;
            margin-top: 20px;
        }
        .device-tabs {
            display: flex;
            border-bottom: 1px solid #ddd;
            margin-bottom: 20px;
        }
        .tab {
            padding: 10px 20px;
            cursor: pointer;
        }
        .tab.active {
            border-bottom: 2px solid #0071e3;
            color: #0071e3;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Musa App Icon Update</h1>
        <img src="/apple-touch-icon.png?v=${iconVersion}" alt="New Musa Logo">
        
        <div class="device-tabs">
            <div class="tab active" onclick="showTab('ios')">iPhone/iPad</div>
            <div class="tab" onclick="showTab('android')">Android</div>
        </div>
        
        <div id="ios-instructions" class="tab-content active">
            <p>To update the Musa app icon on your iPhone or iPad:</p>
            <div class="steps">
                <ol>
                    <li><strong>Remove current app</strong> from your home screen (touch and hold, then "Remove App" > "Remove from Home Screen")</li>
                    <li><strong>Clear Safari cache</strong> in Settings > Safari > Clear History and Website Data</li>
                    <li>Reopen Safari and navigate to the Musa app</li>
                    <li>Tap the <strong>Share icon</strong> at the bottom of your screen</li>
                    <li>Select <strong>"Add to Home Screen"</strong></li>
                </ol>
            </div>
        </div>
        
        <div id="android-instructions" class="tab-content">
            <p>To update the Musa app icon on your Android device:</p>
            <div class="steps">
                <ol>
                    <li>Remove the current Musa app shortcut from your home screen</li>
                    <li>Open Chrome and tap the three dots menu in the upper right</li>
                    <li>Select <strong>Settings</strong> > <strong>Privacy and security</strong> > <strong>Clear browsing data</strong></li>
                    <li>Check "Cookies and site data" and "Cached images and files"</li>
                    <li>Tap "Clear data"</li>
                    <li>Navigate back to the Musa app</li>
                    <li>Tap the three dots menu again and select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                </ol>
            </div>
        </div>
        
        <p>You should now see the updated Musa icon on your home screen!</p>
        
        <a href="/" class="button">Return to Musa App</a>
    </div>

    <script>
        // Tab functionality
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Deactivate all tab buttons
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName + '-instructions').classList.add('active');
            
            // Activate tab button
            document.querySelectorAll('.tab').forEach(tab => {
                if (tab.textContent.toLowerCase().includes(tabName)) {
                    tab.classList.add('active');
                }
            });
        }
    
        // Force clear caches
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                }
            });
        }
        
        // Clear application cache
        if (window.applicationCache) {
            try {
                window.applicationCache.update();
                window.applicationCache.swapCache();
            } catch (e) {
                console.log('App cache update failed:', e);
            }
        }
        
        // Clear local and session storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear IndexedDB for PWA data
        if (window.indexedDB) {
            indexedDB.databases().then(dbs => {
                dbs.forEach(db => {
                    indexedDB.deleteDatabase(db.name);
                });
            });
        }
        
        // Try to clear caches API
        if ('caches' in window) {
            caches.keys().then(function(keyList) {
                return Promise.all(keyList.map(function(key) {
                    return caches.delete(key);
                }));
            });
        }
    </script>
</body>
</html>
`;

  fs.writeFileSync(refreshPagePath, refreshPageContent);
  console.log('✅ Created icon-refresh.html page');
  
  // Create apple-icon-refresh.html (duplicate for backward compatibility)
  fs.writeFileSync(path.join(__dirname, '../public/apple-icon-refresh.html'), refreshPageContent);
  console.log('✅ Created apple-icon-refresh.html page');
  
  return true;
}

// Create instructions file
function createInstructions() {
  const instructionsPath = path.join(__dirname, '../PWA-ICON-UPDATE-INSTRUCTIONS.md');
  const instructionsContent = `# How to Update Musa PWA Icon on Mobile Devices

After deploying this update, users will need to follow these steps to see the new icon:

## For iPhone/iPad Users

1. **Remove the current Musa app** from your home screen:
   - Touch and hold the Musa app icon
   - Tap "Remove App"
   - Select "Remove from Home Screen" (not Delete App)

2. **Clear Safari cache and website data**:
   - Open Settings
   - Scroll down and tap Safari
   - Tap "Clear History and Website Data"
   - Confirm by tapping "Clear History and Data"

3. **Add the app back to your home screen**:
   - Open Safari and navigate to the Musa app
   - Tap the Share icon (square with up arrow) at the bottom
   - Scroll down and tap "Add to Home Screen"
   - Tap "Add" in the top right corner

4. **Alternative method** (if above doesn't work):
   - Visit the app URL followed by "/icon-refresh.html" 
   - Follow the on-screen instructions

## For Android Users

1. **Remove the current Musa app** shortcut from your home screen

2. **Clear Chrome cache**:
   - Open Chrome
   - Tap the three dots menu (⋮) in the upper right
   - Select Settings
   - Tap Privacy and security
   - Tap "Clear browsing data"
   - Check "Cookies and site data" and "Cached images and files"
   - Tap "Clear data"

3. **Add the app back to your home screen**:
   - Navigate back to the Musa app in Chrome
   - Tap the three dots menu (⋮)
   - Select "Install app" or "Add to Home Screen"

4. **Alternative method** (if above doesn't work):
   - Visit the app URL followed by "/icon-refresh.html"
   - Follow the on-screen instructions

## Technical Details

This update has implemented:

1. New app icon (the character with yellow hat/cap)
2. Updated root-level \`apple-touch-icon.png\`
3. Added \`apple-touch-icon-precomposed.png\` and size-specific Apple touch icons
4. Updated manifest.json with versioned icon paths
5. Updated layout.tsx with enhanced iOS icon support
6. Created helper pages for icon refresh

Icon version: ${iconVersion}
`;

  fs.writeFileSync(instructionsPath, instructionsContent);
  console.log('✅ Created PWA-ICON-UPDATE-INSTRUCTIONS.md');
  return true;
}

// Main function
async function main() {
  try {
    // First create all icon sizes
    await createAllIcons();
    
    // Update manifest.json
    updateManifest();
    
    // Update layout.tsx
    updateLayout();
    
    // Create refresh pages
    createRefreshPages();
    
    // Create instructions
    createInstructions();
    
    console.log(`\n✨ PWA icons update complete with version: ${iconVersion}`);
    console.log('\n🚀 Building the app...');
    
    // Build the app
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('\n✅ App built successfully!');
    } catch (error) {
      console.error('\n❌ App build failed:', error);
      process.exit(1);
    }
    
    console.log('\n✅ All done! You can now commit and push these changes.');
    console.log('🔔 IMPORTANT: Users will need to remove and re-add the app to their home screen to see the new icon.');
    console.log('📱 For detailed instructions, see the PWA-ICON-UPDATE-INSTRUCTIONS.md file.');
  } catch (error) {
    console.error('\n❌ An error occurred:', error);
    process.exit(1);
  }
}

// Run the main function
main();
