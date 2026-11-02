#!/bin/bash
# Quick Reference: Mobile Logo Management
# ======================================

echo "📱 AFOSHA MOBILE LOGO SYSTEM"
echo "============================"
echo ""

# Check if in correct directory
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ Error: Run this from mobile/ directory"
    exit 1
fi

echo "🎨 LOGO MANAGEMENT OPTIONS:"
echo ""
echo "1. Update In-App Logo (Login Screen)"
echo "   ✅ No APK rebuild needed"
echo "   📍 Go to: Admin Dashboard → Settings → Mobile App Logo"
echo "   ⚡ Changes appear instantly on next app open"
echo ""
echo "2. Update App Icon (Home Screen)"
echo "   ⚠️  Requires APK rebuild"
echo "   🔧 Run these commands:"
echo ""
echo "   # Sync icon with dashboard logo"
echo "   ./update_app_icon.sh"
echo ""
echo "   # Rebuild APK"
echo "   flutter build apk --release"
echo ""
echo "   # Copy to Desktop"
echo "   cp build/app/outputs/flutter-apk/app-release.apk ~/Desktop/Afosha-MS-Updated.apk"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Do you want to update the app icon now? (y/n): " choice

if [ "$choice" = "y" ] || [ "$choice" = "Y" ]; then
    echo ""
    echo "🔄 Starting app icon update process..."
    echo ""
    
    # Run the update script
    if ./update_app_icon.sh; then
        echo ""
        read -p "Build APK now? (y/n): " build
        
        if [ "$build" = "y" ] || [ "$build" = "Y" ]; then
            echo ""
            echo "🏗️  Building APK (this takes ~2 minutes)..."
            flutter build apk --release
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ APK built successfully!"
                echo "📦 Location: build/app/outputs/flutter-apk/app-release.apk"
                echo ""
                
                read -p "Copy to Desktop? (y/n): " copy
                if [ "$copy" = "y" ] || [ "$copy" = "Y" ]; then
                    cp build/app/outputs/flutter-apk/app-release.apk ~/Desktop/Afosha-MS-Updated.apk
                    echo "✅ Copied to: ~/Desktop/Afosha-MS-Updated.apk"
                fi
            fi
        fi
    fi
else
    echo ""
    echo "ℹ️  No changes made. Run ./update_app_icon.sh manually when ready."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 For more info: cat assets/images/README.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
