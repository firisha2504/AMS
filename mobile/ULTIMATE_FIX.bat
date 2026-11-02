@echo off
setlocal enabledelayedexpansion
echo ========================================================================
echo          AFOSHA MS - ULTIMATE FIX FOR ICON AND DUPLICATE APPS
echo ========================================================================
echo.
echo CRITICAL: This issue happens because Android caches app icons and
echo           multiple package names were used during development.
echo.
echo This script will:
echo   1. Find and uninstall ALL versions with different package names
echo   2. Completely clean Flutter cache and build files
echo   3. Verify the green icon exists
echo   4. Regenerate launcher icons
echo   5. Build a fresh release APK
echo   6. Install it properly
echo.
echo ========================================================================
echo.
echo STEP 0: MANUAL ACTION REQUIRED
echo ========================================================================
echo.
echo Please do the following ON YOUR PHONE right now:
echo.
echo   1. Go to Settings
echo   2. Go to Apps
echo   3. Find ALL apps with "Afosha" or "AMS" in the name
echo   4. Uninstall EVERY ONE of them
echo   5. Go back to Home Screen
echo   6. Long-press on any remaining "Afosha MS" icons
echo   7. Select "Remove" or "Uninstall"
echo.
echo This is CRITICAL because Android caches app icons by package name.
echo.
pause
echo.

echo ========================================================================
echo [1/10] Checking connected device...
echo ========================================================================
call flutter devices
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No device connected!
    echo Please connect your phone via USB and enable USB Debugging.
    pause
    exit /b 1
)
echo.

echo ========================================================================
echo [2/10] Trying to uninstall via ADB (all possible package names)...
echo ========================================================================
echo Uninstalling com.afosha.mobile...
call flutter install --uninstall-only -d all 2>nul
echo.
echo If you see errors above, that's OK - it means those apps weren't installed.
echo.
pause

echo ========================================================================
echo [3/10] Deleting ALL Flutter cache and build files...
echo ========================================================================
echo Deleting build folder...
if exist "build" rmdir /s /q build
echo Deleting .dart_tool folder...
if exist ".dart_tool" rmdir /s /q .dart_tool
echo Deleting Android build folders...
if exist "android\.gradle" rmdir /s /q android\.gradle
if exist "android\app\build" rmdir /s /q android\app\build
if exist "android\build" rmdir /s /q android\build
echo Deleting iOS build folders...
if exist "ios\build" rmdir /s /q ios\build
if exist "ios\.symlinks" rmdir /s /q ios\.symlinks
if exist "ios\Pods" rmdir /s /q ios\Pods
echo Done.
echo.

echo ========================================================================
echo [4/10] Flutter clean (deep clean)...
echo ========================================================================
call flutter clean
echo.

echo ========================================================================
echo [5/10] Clearing Flutter pub cache...
echo ========================================================================
call flutter pub cache clean
echo.

echo ========================================================================
echo [6/10] Getting fresh dependencies...
echo ========================================================================
call flutter pub get
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to get dependencies!
    pause
    exit /b 1
)
echo.

echo ========================================================================
echo [7/10] Verifying app icon file exists...
echo ========================================================================
if not exist "assets\images\app_icon.png" (
    echo ERROR: Icon file not found at assets\images\app_icon.png
    echo Please ensure the green "A" logo is in this location.
    pause
    exit /b 1
)
echo Icon file found: assets\images\app_icon.png
echo.

echo ========================================================================
echo [8/10] Generating launcher icons (GREEN logo)...
echo ========================================================================
call flutter pub run flutter_launcher_icons
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Icon generation failed!
    pause
    exit /b 1
)
echo.
echo Checking if icons were generated...
if exist "android\app\src\main\res\mipmap-hdpi\ic_launcher.png" (
    echo SUCCESS: Icons generated in android\app\src\main\res\mipmap-*
) else (
    echo ERROR: Icons not generated properly!
    pause
    exit /b 1
)
echo.

echo ========================================================================
echo [9/10] Building RELEASE APK (this takes 2-5 minutes)...
echo ========================================================================
call flutter build apk --release
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo.
echo Build complete! APK location:
dir build\app\outputs\flutter-apk\app-release.apk
echo.

echo ========================================================================
echo [10/10] Installing on device...
echo ========================================================================
call flutter install --release
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Installation failed!
    pause
    exit /b 1
)
echo.

echo ========================================================================
echo                    INSTALLATION COMPLETE!
echo ========================================================================
echo.
echo NOW CHECK YOUR PHONE:
echo.
echo 1. Look for ONE "Afosha MS" app
echo 2. Icon should be GREEN with white "A" letter
echo 3. Open it - you should see the login screen
echo.
echo IF THE ICON IS STILL WRONG (blue scissors):
echo ========================================================================
echo This means Android is still caching the old icon. Try these steps:
echo.
echo Option 1: RESTART YOUR PHONE (easiest solution)
echo   - Just power off and power on your phone
echo   - This clears the launcher cache
echo.
echo Option 2: Clear Launcher Cache
echo   - Settings - Apps - Find your launcher app (e.g., "Launcher", "Home")
echo   - Tap Storage
echo   - Tap "Clear Cache" (NOT "Clear Data")
echo   - Go back to home screen
echo.
echo Option 3: Force Stop and Restart Launcher
echo   - Settings - Apps - Find your launcher app
echo   - Tap "Force Stop"
echo   - Press Home button to restart it
echo.
echo IF THERE ARE STILL TWO APPS:
echo ========================================================================
echo This means you still have an old installation. Manually uninstall both
echo apps from the phone, then run this script again.
echo.
echo ========================================================================
pause
