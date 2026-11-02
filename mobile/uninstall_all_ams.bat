@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════════
echo  🗑️  Uninstall All AMS Mobile Apps via ADB
echo ═══════════════════════════════════════════════════════════════
echo.
echo This script uses ADB to uninstall all ams_mobile apps.
echo.
echo Requirements:
echo  • Phone connected via USB
echo  • USB debugging enabled
echo  • ADB installed and in PATH
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

echo Checking ADB connection...
adb devices
if errorlevel 1 (
    echo.
    echo ❌ ADB not found or not in PATH
    echo.
    echo Please install ADB or uninstall manually:
    echo  1. Go to Settings → Apps on your phone
    echo  2. Find all ams_mobile apps
    echo  3. Uninstall each one
    echo.
    pause
    exit /b 1
)

echo.
echo Searching for all AMS-related packages...
echo.

adb shell pm list packages | findstr /i "ams afosha example" > temp_packages.txt

if not exist temp_packages.txt (
    echo ❌ Could not list packages
    pause
    exit /b 1
)

echo Found packages:
type temp_packages.txt
echo.

echo Uninstalling packages...
echo.

for /f "tokens=2 delims=:" %%a in (temp_packages.txt) do (
    echo Uninstalling %%a...
    adb uninstall %%a
    if errorlevel 1 (
        echo   ⚠️  Could not uninstall %%a
    ) else (
        echo   ✅ Uninstalled %%a
    )
)

del temp_packages.txt

echo.
echo ═══════════════════════════════════════════════════════════════
echo  ✅ Uninstall Complete
echo ═══════════════════════════════════════════════════════════════
echo.
echo All AMS packages have been uninstalled.
echo.
echo Next steps:
echo  1. Check your phone - no ams_mobile icons should appear
echo  2. Run fix_and_install.bat to install fresh
echo.
echo ═══════════════════════════════════════════════════════════════
echo.
pause
