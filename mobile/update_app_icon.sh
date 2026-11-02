#!/bin/bash

# Script to download logo from server and update app icon
# Usage: ./update_app_icon.sh [server_url]

SERVER_URL="${1:-http://10.232.201.115:5000}"
LOGO_URL="$SERVER_URL/api/settings/logo"
ICON_PATH="assets/images/app_icon.png"

echo "🔄 Downloading logo from: $LOGO_URL"

# Download the logo
if curl -f -o "$ICON_PATH" "$LOGO_URL"; then
    echo "✅ Logo downloaded successfully to $ICON_PATH"
    
    # Check if the file is a valid image
    if file "$ICON_PATH" | grep -qE 'image|PNG|JPEG|JPG'; then
        echo "✅ Valid image file detected"
        
        # Generate launcher icons
        echo "🎨 Generating launcher icons..."
        flutter pub get
        flutter pub run flutter_launcher_icons
        
        echo ""
        echo "✅ App icon updated successfully!"
        echo "📱 Now run: flutter build apk --release"
        echo ""
    else
        echo "❌ Downloaded file is not a valid image"
        rm -f "$ICON_PATH"
        exit 1
    fi
else
    echo "❌ Failed to download logo from server"
    echo "   Make sure:"
    echo "   1. Backend server is running ($SERVER_URL)"
    echo "   2. Logo has been uploaded via admin dashboard"
    echo "   3. URL is correct"
    exit 1
fi
