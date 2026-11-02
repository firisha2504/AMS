# Afosha MS - Icon and Duplicate App Fix Guide

## Problem Summary
- **Issue 1**: App icon shows as blue scissors (default Flutter icon) instead of green "A" logo
- **Issue 2**: Two "Afosha MS" apps appear on phone instead of one

## Root Causes

### Why Two Apps Appear:
- Different package names were used during development
- Possible package names that might be installed:
  - `com.afosha.mobile` (correct one)
  - `com.afosha.ams_mobile` (old)
  - `com.example.ams_mobile` (default Flutter template)
- Each package name is treated as a separate app by Android

### Why Icon Doesn't Change:
1. **Android Launcher Cache**: Android caches app icons to improve performance
2. **Icon Not Generated**: The green logo wasn't properly converted to launcher icons
3. **Old Build Files**: Previous builds with wrong icon are still cached
4. **Package Name Change**: If package name changed, old icon cache persists

## Solution Steps

### Step 1: Run Diagnostic Check
```cmd
cd mobile
CHECK_STATUS.bat
```

This will tell you:
- If the icon file exists
- If generated icons exist
- What's configured in AndroidManifest.xml

### Step 2: Manual Cleanup on Phone (CRITICAL!)
**You MUST do this manually - scripts cannot fully uninstall all versions:**

1. On your phone, go to **Settings → Apps**
2. Look for ALL apps with these names:
   - "Afosha MS"
   - "ams_mobile"
   - "AMS Mobile"
   - Any app with green or blue icon that looks related
3. **Uninstall EVERY ONE** you find
4. Go to your phone's Home Screen
5. If any "Afosha MS" icons still appear:
   - Long-press on the icon
   - Select "Remove" or "Uninstall"
6. **Restart your phone** (important for clearing icon cache)

### Step 3: Run Ultimate Fix Script
```cmd
cd mobile
ULTIMATE_FIX.bat
```

This script will:
1. Try to uninstall via Flutter/ADB
2. Delete all build files and caches
3. Verify icon file exists
4. Generate launcher icons from the green logo
5. Build fresh release APK
6. Install on phone

### Step 4: Verify on Phone
After installation, check:
- ✅ Only ONE "Afosha MS" app exists
- ✅ Icon is GREEN with white "A" letter
- ✅ App name is "Afosha MS" (not "ams_mobile")
- ✅ Login screen works properly

## If Icon Is STILL Wrong After Fix

### Solution 1: Restart Phone (Easiest)
```
Just power off and power on your phone
```
This clears the Android launcher cache completely.

### Solution 2: Clear Launcher Cache
1. Settings → Apps
2. Find your launcher app:
   - "Launcher"
   - "Home"
   - "One UI Home" (Samsung)
   - "Pixel Launcher" (Google Pixel)
3. Tap on it
4. Tap "Storage"
5. Tap "Clear Cache" (NOT "Clear Data"!)
6. Press Home button

### Solution 3: Force Stop Launcher
1. Settings → Apps → [Your Launcher]
2. Tap "Force Stop"
3. Press Home button (launcher will restart)

### Solution 4: Rebuild with Different Package Name
If nothing works, the package name might be cached:

1. Edit `android/app/build.gradle`
2. Change `applicationId` to something new like `com.afosha.ms`
3. Edit `android/app/src/main/AndroidManifest.xml`
4. Ensure `package` attribute matches new ID
5. Run `ULTIMATE_FIX.bat` again

## Understanding the Icon Generation Process

### Source Icon
- Location: `mobile/assets/images/app_icon.png`
- Should be: Green background with white "A" letter
- Recommended size: 1024x1024 pixels

### Generated Icons
The `flutter_launcher_icons` plugin generates multiple sizes:
```
android/app/src/main/res/
  ├── mipmap-hdpi/ic_launcher.png (72x72)
  ├── mipmap-mdpi/ic_launcher.png (48x48)
  ├── mipmap-xhdpi/ic_launcher.png (96x96)
  ├── mipmap-xxhdpi/ic_launcher.png (144x144)
  └── mipmap-xxxhdpi/ic_launcher.png (192x192)
```

### Configuration
In `pubspec.yaml`:
```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/images/app_icon.png"
  min_sdk_android: 21
```

## Common Mistakes to Avoid

### ❌ DON'T:
1. Install debug build (`flutter install` without `--release`)
   - Debug builds use default Flutter icon
2. Skip manual uninstall
   - Scripts can't remove all old versions reliably
3. Clear launcher "Data" instead of "Cache"
   - This resets your entire home screen layout
4. Run `flutter build apk` without regenerating icons first
   - Old icons will be bundled in the APK

### ✅ DO:
1. Always build release APK: `flutter build apk --release`
2. Manually uninstall ALL old versions from phone
3. Restart phone after complete uninstall
4. Verify icon file exists before building
5. Run `flutter pub run flutter_launcher_icons` before building

## Verification Checklist

Before considering the issue fixed:

- [ ] Only ONE "Afosha MS" app appears on phone
- [ ] Icon is GREEN (not blue)
- [ ] Icon has white "A" letter
- [ ] App name under icon is "Afosha MS"
- [ ] Opening app shows login screen
- [ ] No duplicate apps in Settings → Apps
- [ ] No other "ams_mobile" or similar apps installed

## Still Not Working?

### Check Icon File
```cmd
cd mobile
dir assets\images\app_icon.png
```

If file doesn't exist or is wrong:
1. Create or replace with correct green "A" logo
2. Ensure it's PNG format
3. Recommended: 1024x1024 pixels, 512x512 minimum

### Check Generated Icons
```cmd
dir android\app\src\main\res\mipmap-*\ic_launcher.png
```

If no files found:
```cmd
flutter pub run flutter_launcher_icons
```

### Check Build Configuration
Ensure `android/app/build.gradle` has correct `applicationId`:
```gradle
defaultConfig {
    applicationId "com.afosha.mobile"
    minSdkVersion 21
    targetSdkVersion flutter.targetSdkVersion
}
```

### Nuclear Option: Complete Reset
If absolutely nothing works:

1. Backup your phone
2. Uninstall ALL "Afosha" apps
3. Restart phone
4. On computer:
   ```cmd
   cd mobile
   rmdir /s /q build
   rmdir /s /q .dart_tool
   rmdir /s /q android\app\build
   flutter clean
   flutter pub cache clean
   flutter pub get
   flutter pub run flutter_launcher_icons
   flutter build apk --release
   ```
5. Copy APK to phone via file explorer
6. Install manually from file manager
7. Restart phone again

## Contact for Help

If you've tried everything and it still doesn't work, provide:
1. Screenshot of phone home screen showing the app(s)
2. Output of `CHECK_STATUS.bat`
3. Output of `flutter devices`
4. Android version and phone model
5. Screenshot of Settings → Apps showing all "Afosha" apps

---

## Quick Command Reference

```cmd
# Diagnostic check
cd mobile
CHECK_STATUS.bat

# Complete fix
cd mobile
ULTIMATE_FIX.bat

# Manual steps
flutter clean
flutter pub get
flutter pub run flutter_launcher_icons
flutter build apk --release
flutter install --release

# Check connected devices
flutter devices

# Uninstall from connected device
flutter install --uninstall-only
```
