# App Icon

This folder contains the app icon that will be used to generate launcher icons.

## How to Update App Icon

### Option 1: Use Logo from Dashboard (Recommended)
Run the script to download the logo from your server:
```bash
./update_app_icon.sh
```

Or specify a custom server URL:
```bash
./update_app_icon.sh http://your-server-url:5000
```

### Option 2: Manual Update
1. Place your logo image here as `app_icon.png`
2. Run: `flutter pub run flutter_launcher_icons`

The icon should be:
- Square aspect ratio (1024x1024 or larger recommended)
- PNG format
- No transparency for Android (use solid background)

## After Updating
Rebuild the APK:
```bash
flutter build apk --release
```
