# Musa App - Store Submission Guide

## Architecture

Musa uses **Capacitor** to wrap your deployed Next.js web app (`https://musa-security-app.windsurf.build`) in a native shell for Android and iOS. The native app loads your web app via HTTPS — no static export needed.

**Advantages:**
- App updates deploy instantly (just redeploy web app)
- No need to resubmit to stores for content/UI changes
- Full access to native APIs (camera, status bar, splash screen)

---

## Prerequisites

### For Android (Google Play)
1. **Android Studio** — Download from https://developer.android.com/studio
2. **Java JDK 17+** — Usually bundled with Android Studio
3. **Google Play Developer Account** — $25 one-time fee at https://play.google.com/console

### For iOS (App Store)
1. **Xcode 15+** — Download from Mac App Store
2. **Apple Developer Account** — $99/year at https://developer.apple.com
3. **macOS** — Required for iOS builds

---

## Android: Build & Submit to Google Play

### Step 1: Generate a Signing Keystore

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore musa-release-key.keystore \
  -alias musa-key \
  -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- **Keystore password** — Choose a strong password, save it securely
- **Key password** — Can be same as keystore password
- **Your name, organization, etc.** — Fill in your details

> **IMPORTANT:** Store `musa-release-key.keystore` safely. If you lose it, you cannot update your app on Google Play.

### Step 2: Configure Signing

Create/edit `android/gradle.properties` and add:

```properties
MUSA_RELEASE_STORE_FILE=../../musa-release-key.keystore
MUSA_RELEASE_STORE_PASSWORD=your_keystore_password
MUSA_RELEASE_KEY_ALIAS=musa-key
MUSA_RELEASE_KEY_PASSWORD=your_key_password
```

> **Never commit this file to git.** Add `musa-release-key.keystore` and the password lines to `.gitignore`.

### Step 3: Build the Signed AAB

```bash
# From project root
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle (AAB)** — required by Google Play
3. Choose your keystore and key alias
4. Select **release** build variant
5. Click **Create**

The AAB will be at: `android/app/release/app-release.aab`

**Or build from command line:**
```bash
cd android
./gradlew bundleRelease
```

### Step 4: Submit to Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. **Create app** → Fill in app name "Musa", default language, app type (App), free/paid
3. **Complete the setup checklist:**
   - **App content** — Privacy policy URL, app access instructions, ads declaration, content rating, target audience
   - **Store listing** — Title, short description, full description, screenshots, feature graphic, app icon
4. **Production → Create new release**
5. Upload your `.aab` file
6. Add release notes
7. **Review and roll out**

### Required Store Assets
| Asset | Size |
|-------|------|
| App icon | 512 x 512 px (PNG, 32-bit, no alpha) |
| Feature graphic | 1024 x 500 px |
| Phone screenshots | Min 2, 16:9 or 9:16, JPEG/PNG |
| 7-inch tablet screenshots | Optional but recommended |
| 10-inch tablet screenshots | Optional but recommended |

### Suggested Store Listing

**Title:** Musa - Estate Access Control

**Short description (80 chars):**
Secure estate access with QR codes. Generate, share & verify access instantly.

**Full description:**
Musa is a smart estate access control system that makes managing visitor access simple and secure.

**For Residents:**
- Generate unique access codes for visitors and guests
- Share QR codes instantly via any messaging app
- Manage household members and permissions
- Track access history in real-time
- Connect with your estate community via the social feed

**For Security Guards:**
- Verify visitor access codes instantly
- Scan QR codes or enter codes manually
- View destination address for verified visitors
- Track verification statistics and history

**Key Features:**
- Role-based access (Resident, Guard, Admin)
- Estate-scoped security — data isolated per estate
- Real-time notifications
- Dark mode support
- Works offline with cached data

---

## iOS: Build & Submit to App Store

### Step 1: Configure Xcode Project

```bash
# From project root
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Select the **App** target
2. Under **Signing & Capabilities**:
   - Check **Automatically manage signing**
   - Select your **Team** (Apple Developer account)
   - Set **Bundle Identifier** to `com.musa.security`
3. Set **Version** to `1.0.0` and **Build** to `1`
4. Select a real device or "Any iOS Device" as build target

### Step 2: Build the Archive

1. **Product → Archive**
2. Wait for the build to complete
3. In the **Organizer** window, select your archive
4. Click **Distribute App**
5. Choose **App Store Connect**
6. Follow the wizard (Upload)

### Step 3: Submit via App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. **My Apps → + New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Musa
   - **Primary Language:** English
   - **Bundle ID:** com.musa.security
   - **SKU:** com.musa.security
4. Complete the **App Information** tab:
   - Privacy policy URL
   - Category: Utilities or Lifestyle
5. Add **Screenshots** for each required device size
6. Write **Description** and **Keywords**
7. Select the build you uploaded
8. **Submit for Review**

### Required iOS Screenshots
| Device | Size |
|--------|------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 px |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 px |
| iPhone 5.5" (8 Plus) | 1242 x 2208 px |
| iPad Pro 12.9" | 2048 x 2732 px (if supporting iPad) |

---

## Version Management

When releasing updates, increment version numbers:

**Android** — Edit `android/app/build.gradle`:
```gradle
versionCode 2       // Increment by 1 each release
versionName "1.1"   // Semantic version
```

**iOS** — Edit in Xcode target settings:
- **Version (CFBundleShortVersionString):** `1.1`
- **Build (CFBundleVersion):** `2`

---

## Development Workflow

```bash
# 1. Make changes to your Next.js app
# 2. Deploy web app (updates are instant for users)

# 3. Only need to rebuild native app if you:
#    - Change Capacitor config
#    - Add/remove native plugins
#    - Change app icon or splash screen
#    - Need to update store listing

# Sync changes to native projects
npx cap sync

# Open in IDE
npx cap open android   # Opens Android Studio
npx cap open ios       # Opens Xcode
```

---

## Troubleshooting

### Android build fails
- Ensure Android Studio has SDK 34+ installed
- Run `cd android && ./gradlew clean` then retry

### iOS signing issues
- Ensure you have a valid Apple Developer membership
- In Xcode: Preferences → Accounts → verify your team
- Try: Product → Clean Build Folder, then Archive again

### App shows blank/white screen
- Verify `https://musa-security-app.windsurf.build` is accessible
- Check that all Firebase env vars are set on the deployment
- Look at Safari Web Inspector (iOS) or Chrome DevTools (Android) for errors

### Camera not working for QR scanning
- Android: Camera permission is in AndroidManifest.xml
- iOS: `NSCameraUsageDescription` is in Info.plist
- The web app uses `html5-qrcode` which requests camera via browser APIs
