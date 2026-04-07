# Musa App - Android APK Build Instructions

## Method 1: Using PWABuilder (Recommended - No Code Required)

### Steps:
1. **Visit PWABuilder**: https://www.pwabuilder.com/
2. **Enter your URL**: `https://musa-security-app.windsurf.build`
3. **Click "Start"** and let PWABuilder analyze your PWA
4. **Download Android Package**:
   - Click "Store Package"
   - Select "Android"
   - Choose "Google Play Store" format
   - Download the generated APK/AAB
5. **Upload to Google Play Console**

### Requirements Met:
✅ manifest.json configured
✅ Service worker (sw.js) active
✅ All PWA icons generated
✅ HTTPS enabled on production URL

---

## Method 2: Using Capacitor (Full Native Experience)

### Install Capacitor:
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
```

### Initialize Capacitor:
```bash
npx cap init "Musa Estate Management" "com.musa.security" --web-dir=out
```

### Add Android Platform:
```bash
npx cap add android
```

### Build Next.js for static export:
```bash
npm run build
npx cap sync
```

### Open in Android Studio:
```bash
npx cap open android
```

### Generate APK in Android Studio:
1. Build → Generate Signed Bundle / APK
2. Select APK or AAB
3. Create new keystore or use existing
4. Build release APK

---

## Method 3: Using Bubblewrap (CLI Tool)

### Install Bubblewrap:
```bash
npm install -g @bubblewrap/cli
```

### Initialize TWA:
```bash
bubblewrap init --manifest https://musa-security-app.windsurf.build/manifest.json
```

### Build APK:
```bash
bubblewrap build
```

---

## App Store Information

### App Details:
- **Name**: Musa Estate Management
- **Package**: com.musa.security
- **Version**: 0.1.0
- **URL**: https://musa-security-app.windsurf.build

### Categories:
- Primary: Lifestyle
- Secondary: Productivity

### Privacy Policy URL:
https://musa-security-app.windsurf.build/terms

### Features:
- Estate access control management
- QR code generation and scanning
- Household management
- Guest communication
- Multi-role system (Admin, Estate Admin, Resident, Guard)

---

## Google Play Console Setup

1. **Create Developer Account**: https://play.google.com/console
2. **Pay one-time fee**: $25 USD
3. **Create App**
4. **Upload APK/AAB**
5. **Complete Store Listing**:
   - App name
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots (minimum 2, recommended 8)
   - Feature graphic (1024x500)
   - App icon (512x512)
   - Privacy policy URL

### Screenshots Needed:
- Phone: 16:9 or 9:16 ratio
- Tablet: 16:9 or 9:16 ratio
- Minimum 2 screenshots, maximum 8

---

## Recommended Approach

**Start with Method 1 (PWABuilder)** as it's the fastest and requires no additional setup. The app is already PWA-ready with:
- Service worker
- Manifest file
- All required icons
- HTTPS production URL

This will generate a Trusted Web Activity (TWA) wrapper that works seamlessly with the existing web app.
