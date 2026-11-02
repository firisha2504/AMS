@echo off
color 0A
echo ========================================================================
echo             AFOSHA MS - COMPLETE FIX
echo ========================================================================
echo.
echo This script will fix:
echo   1. Duplicate app installations
echo   2. Wrong app icon (blue scissors - default Flutter icon)
echo.
echo The app will have:
echo   - Green background with white "A" logo
echo   - Only ONE app on your phone
echo   - "Afosha MS" as the name
echo.
echo ========================================================================
pause
echo.

echo [Step 1/6] Uninstalling ALL old versions...
echo ------------------------------------------------------------------------
echo Removing com.afosha.mobile...
adb uninstall com.afosha.mobile 2>nul
echo Removing com.afosha.ams_mobile...
adb uninstall com.afosha.ams_mobile 2>nul
echo Removing com.example.ams_mobile...
adb uninstall com.example.ams_mobile 2>nul
echo Done.
echo.
timeout /t 2 /nobreak >nul

echo [Step 2/6] Cleaning build cache...
echo ------------------------------------------------------------------------
call flutter clean
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Flutter clean failed!
    pause
    exit /b 1
)
echo Done.
echo.
timeout /t 2 /nobreak >nul

echo [Step 3/6] Getting dependencies...
echo ------------------------------------------------------------------------
call flutter pub get
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Flutter pub get failed!
    pause
    exit /b 1
)
echo Done.
echo.
timeout /t 2 /nobreak >nul

echo [Step 4/6] Generating app icons (Green "A" logo)...
echo ------------------------------------------------------------------------
call flutter pub run flutter_launcher_icons
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Icon generation failed!
    pause
    exit /b 1
)
echo Done.
echo.
timeout /t 2 /nobreak >nul

echo [Step 5/6] Building release APK...
echo ------------------------------------------------------------------------
call flutter build apk --release
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo Done.
echo.
timeout /t 2 /nobreak >nul

echo [Step 6/6] Installing on your phone...
echo ------------------------------------------------------------------------
call adb install build\app\outputs\flutter-apk\app-release.apk
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Installation failed! Is your phone connected?
    pause
    exit /b 1
)
echo Done.
echo.

echo ========================================================================
echo                    INSTALLATION COMPLETE!
echo ========================================================================
echo.
echo Please check your phone:
echo.
echo [✓] Only ONE "Afosha MS" app should appear
echo [✓] Icon should be GREEN with white "A" (not blue scissors)
echo [✓] App name shows as "Afosha MS"
echo.
echo If you still see TWO apps:
echo   1. Manually uninstall both from Settings - Apps
echo   2. Run this script again
echo.
echo ========================================================================
pause
