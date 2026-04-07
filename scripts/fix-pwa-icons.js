const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Get current timestamp and date for versioning
const timestamp = new Date().getTime();
const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
const iconVersion = `v${dateStr}_${timestamp}`;

console.log('🔄 Starting PWA icon fix process...');

// Check if new-musa-logo.png exists
const newIconPath = path.join(__dirname, '../public/new-musa-logo.png');
if (!fs.existsSync(newIconPath)) {
  console.error('❌ Error: new-musa-logo.png not found in public directory!');
  process.exit(1);
}

// 1. Copy the new icon to all required locations
console.log('📋 Copying new icon to required locations...');

// Create apple-touch-icon.png at root level (most important for iOS)
fs.copyFileSync(
  newIconPath, 
  path.join(__dirname, '../public/apple-touch-icon.png')
);
console.log('✅ Created /apple-touch-icon.png');

// Create apple-touch-icon-precomposed.png at root level (for older iOS)
fs.copyFileSync(
  newIconPath, 
  path.join(__dirname, '../public/apple-touch-icon-precomposed.png')
);
console.log('✅ Created /apple-touch-icon-precomposed.png');

// Also create specific sized apple icons (iOS looks for these)
const appleIconSizes = [57, 60, 72, 76, 114, 120, 144, 152, 167, 180];

appleIconSizes.forEach(size => {
  const targetPath = path.join(__dirname, `../public/apple-touch-icon-${size}x${size}.png`);
  fs.copyFileSync(newIconPath, targetPath);
  console.log(`✅ Created /apple-touch-icon-${size}x${size}.png`);
});

// Create favicon.ico
console.log('🔄 Creating favicon.ico from new icon...');
try {
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  fs.copyFileSync(newIconPath, faviconPath);
  console.log('✅ Created /favicon.ico');
} catch (error) {
  console.error('❌ Failed to create favicon.ico:', error.message);
}

// 2. Update manifest.json
console.log('📝 Updating manifest.json...');
const manifestPath = path.join(__dirname, '../public/manifest.json');
const manifest = require(manifestPath);

// Add new icons at the beginning of the array (higher priority)
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

// 3. Update layout.tsx
console.log('📝 Updating layout.tsx...');
const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

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
  // Find the end of the RootLayout component to add meta tags
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

// 4. Create a special HTML file for icon refresh
console.log('📝 Creating icon refresh page...');
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

// 5. Create a service worker update script
console.log('📝 Creating service worker update script...');
const swUpdatePath = path.join(__dirname, '../public/sw-update.js');
const swUpdateContent = `
// Service Worker updater script
// This script helps force update the service worker
const swUpdateTimestamp = ${timestamp};

if ('serviceWorker' in navigator) {
  // Unregister old service workers
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Service worker unregistered');
    }
    
    // After unregistering, clear caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
          console.log('Cache deleted:', cacheName);
        });
      });
    }
    
    // Reload page to register new service worker
    window.location.reload();
  });
}
`;

fs.writeFileSync(swUpdatePath, swUpdateContent);
console.log('✅ Created sw-update.js script');

// Create a clear instructions file
const clearInstructionsPath = path.join(__dirname, '../PWA-ICON-UPDATE-INSTRUCTIONS.md');
const clearInstructionsContent = `# How to Update Musa PWA Icon on Mobile Devices

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

## For Developers

This update includes:

1. Updated root-level \`apple-touch-icon.png\`
2. Added \`apple-touch-icon-precomposed.png\` and size-specific Apple touch icons
3. Updated manifest.json with versioned icon paths
4. Updated layout.tsx with enhanced iOS icon support
5. Created helper pages for icon refresh

To verify the update:
- Inspect network requests in DevTools to ensure icons aren't served from cache
- Check that Service Worker is updated with latest cache version
- Verify that manifest.json and layout.tsx contain versioned icon references
`;

fs.writeFileSync(clearInstructionsPath, clearInstructionsContent);
console.log('✅ Created PWA-ICON-UPDATE-INSTRUCTIONS.md');

console.log(`\n✨ PWA icons update complete with version: ${iconVersion}`);
console.log('🔔 IMPORTANT: Users will need to remove and re-add the app to their home screen to see the new icon.');
console.log('📱 For detailed instructions, see the PWA-ICON-UPDATE-INSTRUCTIONS.md file.');
