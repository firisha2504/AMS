@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════════
echo  🔧 Fix Mobile App Icon ^& Duplicate Installation Issue
echo ═══════════════════════════════════════════════════════════════
echo.
echo This script will:
echo  ✓ Regenerate app icons to match web favicon
echo  ✓ Clean previous builds
echo  ✓ Install fresh app (single installation)
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

echo ⚠️  IMPORTANT: Before continuing...
echo.
echo Please MANUALLY uninstall ALL existing ams_mobile apps from your phone:
echo.
echo 1. Go to Settings → Apps on your phone
echo 2. Find any apps named "ams_mobile" or "Afosha Management System"
echo 3. Uninstall EACH one
echo 4. Come back here and press any key to continue
echo.
pause

echo.
echo ═══════════════════════════════════════════════════════════════
echo  Step 1/4: Cleaning previous builds...
echo ═══════════════════════════════════════════════════════════════
echo.
call flutter clean
if errorlevel 1 (
    echo ❌ Error during flutter clean
    pause
    exit /b 1
)
echo ✅ Clean complete
echo.

echo ═══════════════════════════════════════════════════════════════
echo  Step 2/4: Getting dependencies...
echo ═══════════════════════════════════════════════════════════════
echo.
call flutter pub get
if errorlevel 1 (
    echo ❌ Error getting dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo ═══════════════════════════════════════════════════════════════
echo  Step 3/4: Generating launcher icons...
echo ═══════════════════════════════════════════════════════════════
echo.
echo Generating icons from assets/images/app_icon.png
echo This creates icons for all Android densities (mdpi, hdpi, xhdpi, etc.)
echo.
call flutter pub run flutter_launcher_icons
if errorlevel 1 (
    echo ❌ Error generating icons
    pause
    exit /b 1
)
echo ✅ Icons generated successfully
echo.

echo ═══════════════════════════════════════════════════════════════
echo  Step 4/4: Building and installing app...
echo ═══════════════════════════════════════════════════════════════
echo.
echo Make sure your phone is:
echo  • Connected via USB
echo  • USB debugging enabled
echo  • Screen unlocked
echo.
pause

call flutter run
if errorlevel 1 (
    echo.
    echo ❌ Installation failed
    echo.
    echo Possible reasons:
    echo  • Phone not connected
    echo  • USB debugging not enabled
    echo  • Old app still installed (uninstall manually)
    echo.
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo  ✅ Installation Complete!
echo ═══════════════════════════════════════════════════════════════
echo.
echo Please verify on your phone:
echo  ✓ Only ONE ams_mobile icon appears
echo  ✓ Icon has green background (not blue)
echo  ✓ Icon has white "A" letter
echo  ✓ Icon has golden circle in top-right
echo  ✓ App launches successfully
echo.
echo If you still see duplicate apps:
echo  1. Uninstall ALL ams_mobile apps again
echo  2. Run this script again
echo  3. Or restart your phone
echo.
echo ═══════════════════════════════════════════════════════════════
echo.
pause
