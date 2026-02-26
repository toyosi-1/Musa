# Screenshot Capture Guide for Musa Security App

## Quick Start

### Option 1: Use Browser DevTools (Easiest)
1. Open http://localhost:3000 in Chrome/Edge
2. Press F12 to open DevTools
3. Click the device toolbar icon (Ctrl+Shift+M / Cmd+Shift+M)
4. Select device: "iPhone 14 Pro Max" or "Pixel 5"
5. Navigate to each page and capture (Ctrl+Shift+P → "Capture screenshot")

### Option 2: Use Android Studio Emulator
1. Open Android Studio
2. Run: `cd android && ./gradlew assembleDebug`
3. Install APK on emulator
4. Use emulator's camera button to capture screenshots
5. Screenshots saved to: `~/Desktop/`

### Option 3: Use iOS Simulator (Mac only)
1. Open Xcode
2. Run: `npx cap open ios`
3. Select simulator device (iPhone 14 Pro Max)
4. Run the app
5. Cmd+S to save screenshot

---

## Screenshot Checklist

### Required Screenshots (8 total)

#### 1. Landing Page ✓
**URL:** http://localhost:3000
**What to show:**
- Musa character logo (animated)
- "Get Started" and "Sign In" buttons
- Clean, professional layout
- Dark/Light mode toggle visible

**Caption:** "Welcome to Modern Estate Security"

---

#### 2. Resident Dashboard ✓
**URL:** http://localhost:3000/dashboard/resident
**Login as:** Resident user
**What to show:**
- Active access codes displayed
- "Generate New Code" button
- Household section
- Clean card layout

**Caption:** "Manage Your Access Codes Easily"

---

#### 3. QR Code Display ✓
**URL:** After generating a code
**What to show:**
- Large QR code prominently displayed
- Visitor name and details
- Expiration time
- Share and Download buttons

**Caption:** "Share Secure QR Codes Instantly"

---

#### 4. Guard Scanner ✓
**URL:** http://localhost:3000/dashboard/scan
**Login as:** Guard user
**What to show:**
- QR scanner interface
- Camera viewfinder
- Scan instructions
- Recent scans list below

**Caption:** "Quick & Secure Code Verification"

---

#### 5. Community Feed ✓
**URL:** http://localhost:3000/dashboard/feed
**What to show:**
- Multiple posts from residents
- Like, comment, share buttons
- "Create Post" floating button
- Engaging content

**Caption:** "Connect With Your Community"

---

#### 6. Access History ✓
**URL:** http://localhost:3000/dashboard/history
**What to show:**
- Timeline of visitor entries
- Timestamps and status badges
- Filter/search options
- Clean list layout

**Caption:** "Track All Access Activities"

---

#### 7. Household Management ✓
**URL:** http://localhost:3000/dashboard/resident (scroll to household section)
**What to show:**
- Household members list
- "Invite Member" button
- Pending invitations
- Member roles

**Caption:** "Manage Your Household Members"

---

#### 8. More Menu (Mobile) ✓
**URL:** Any dashboard page (mobile view)
**What to show:**
- Bottom sheet slide-up menu
- User profile card at top
- Menu options (Profile, Theme, Notifications, Settings)
- Sign Out button
- App version footer

**Caption:** "Personalize Your Experience"

---

## Device Specifications

### Google Play Store
**Phone Screenshots (Required):**
- Resolution: 1080 x 1920 px minimum
- Format: PNG or JPEG
- Quantity: 2-8 screenshots

**Tablet Screenshots (Optional):**
- 7-inch: 1200 x 1920 px
- 10-inch: 1920 x 1200 px

### Apple App Store
**iPhone Screenshots (Required):**
- 6.7" (iPhone 14 Pro Max): 1290 x 2796 px
- 6.5" (iPhone 11 Pro Max): 1242 x 2688 px
- 5.5" (iPhone 8 Plus): 1242 x 2208 px

**iPad Screenshots (Optional):**
- 12.9" iPad Pro: 2048 x 2732 px

---

## Screenshot Settings

### Recommended Settings
- **Theme:** Light mode (more universal appeal)
- **Time:** 9:41 AM (Apple's signature time)
- **Battery:** Full (100%)
- **Signal:** Full bars
- **Notifications:** Clear/hide

### Sample Data to Use
```javascript
// Resident Name
"John Doe"

// Visitor Names
"Sarah Johnson"
"Michael Chen"
"David Williams"

// Phone Numbers
"+234 XXX XXX XXXX"

// Addresses
"Block A, Unit 12"
"Block B, Unit 5"

// Estate Name
"Palm Grove Estate"
```

---

## Browser DevTools Screenshot Commands

### Chrome/Edge DevTools
1. Open DevTools (F12)
2. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
3. Type "screenshot"
4. Choose:
   - "Capture full size screenshot" (entire page)
   - "Capture screenshot" (visible area)
   - "Capture node screenshot" (specific element)

### Device Emulation Settings
```
Device: iPhone 14 Pro Max
Resolution: 1290 x 2796
Pixel Ratio: 3
User Agent: Mobile Safari
```

---

## Post-Processing (Optional)

### Tools
- **Figma:** Add device frames and annotations
- **Canva:** Quick mockups with text overlays
- **Photoshop:** Professional editing
- **Online Tools:** 
  - mockuphone.com
  - smartmockups.com
  - screely.com

### Enhancements
1. Add device frame (iPhone/Android)
2. Add subtle drop shadow
3. Ensure consistent background color
4. Add captions if store allows
5. Compress images (TinyPNG)

---

## Quick Capture Script

Save this as `capture-screenshots.sh`:

```bash
#!/bin/bash

# Ensure dev server is running
echo "Make sure dev server is running on http://localhost:3000"
echo "Press Enter to continue..."
read

# Create screenshots directory
mkdir -p screenshots

# Open browser with specific pages
open "http://localhost:3000" # Landing
sleep 2
open "http://localhost:3000/dashboard/resident" # Dashboard
sleep 2
open "http://localhost:3000/dashboard/feed" # Feed
sleep 2
open "http://localhost:3000/dashboard/history" # History
sleep 2
open "http://localhost:3000/dashboard/scan" # Scanner

echo "✓ All pages opened in browser"
echo "Now capture screenshots using DevTools (Cmd+Shift+P → Capture screenshot)"
echo "Save to: ./screenshots/"
```

Run: `chmod +x capture-screenshots.sh && ./capture-screenshots.sh`

---

## Naming Convention

Save screenshots as:
```
01-landing-page.png
02-resident-dashboard.png
03-qr-code-display.png
04-guard-scanner.png
05-community-feed.png
06-access-history.png
07-household-management.png
08-more-menu.png
```

---

## Quality Checklist

Before submitting, verify:
- [ ] All screenshots are correct resolution
- [ ] No personal/sensitive data visible
- [ ] UI is clean and professional
- [ ] Text is readable
- [ ] No error messages or bugs visible
- [ ] Consistent theme across all screenshots
- [ ] Status bar looks clean
- [ ] All images are properly compressed
- [ ] File names are descriptive

---

## Upload Locations

### Google Play Console
1. Go to: Play Console → Your App → Store Presence → Main Store Listing
2. Scroll to "Phone screenshots"
3. Upload 2-8 screenshots (drag & drop)

### Apple App Store Connect
1. Go to: App Store Connect → Your App → App Store → Screenshots
2. Select device size (6.7", 6.5", 5.5")
3. Upload screenshots for each size
4. Add captions (optional)

---

## Need Help?

If you encounter issues:
1. Check dev server is running: `npm run dev`
2. Clear browser cache: Ctrl+Shift+Delete
3. Try incognito/private mode
4. Use different browser (Chrome recommended)
5. Check console for errors: F12 → Console tab

---

## Time Estimate

- Capturing 8 screenshots: 15-20 minutes
- Post-processing (optional): 30-45 minutes
- Uploading to stores: 10-15 minutes

**Total: ~1 hour**

---

Good luck with your app store submission! 🚀
