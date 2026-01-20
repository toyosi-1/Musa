#!/bin/bash
# Musa App - Capacitor Android Setup Script

echo "🚀 Setting up Musa App for Android with Capacitor..."

# Install Capacitor
echo "📦 Installing Capacitor..."
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android

# Initialize Capacitor
echo "⚙️ Initializing Capacitor..."
npx cap init "Musa Estate Management" "com.musa.security" --web-dir=out

# Update package.json with export script if not exists
echo "📝 Updating build scripts..."
npm pkg set scripts.export="next build && next export"

# Build for production
echo "🔨 Building Next.js app..."
npm run build

# Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync

# Add Android platform
echo "📱 Adding Android platform..."
npx cap add android

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Open Android Studio: npx cap open android"
echo "2. Build → Generate Signed Bundle / APK"
echo "3. Create keystore and generate release APK"
echo ""
echo "Note: Make sure you have Android Studio installed"
