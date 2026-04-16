# How to Update Musa PWA Icon on Mobile Devices

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
2. Updated root-level `apple-touch-icon.png`
3. Added `apple-touch-icon-precomposed.png` and size-specific Apple touch icons
4. Updated manifest.json with versioned icon paths
5. Updated layout.tsx with enhanced iOS icon support
6. Created helper pages for icon refresh

Icon version: v20250714_1752529900432
