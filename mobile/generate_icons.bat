@echo off
echo ================================================
echo  Afosha Mobile App - Icon Generator
echo ================================================
echo.

cd /d "%~dp0"

echo Step 1: Checking if PNG icon exists...
if exist "assets\images\app_icon.png" (
    echo [OK] PNG icon found!
    echo.
    goto :generate
) else (
    echo [!] PNG icon NOT found!
    echo.
    echo You need to convert the SVG to PNG first:
    echo   File: assets\images\app_icon.svg
    echo   Convert to: assets\images\app_icon.png
    echo   Size: 1024x1024 pixels
    echo.
    echo Options:
    echo   1. Use online converter: https://svgtopng.com
    echo   2. Use ImageMagick (if installed)
    echo   3. Use Inkscape (if installed)
    echo.
    echo See GENERATE_APP_ICON.md for detailed instructions.
    echo.
    pause
    exit /b 1
)

:generate
echo Step 2: Running Flutter icon generator...
echo.
flutter pub get
if errorlevel 1 (
    echo [ERROR] Failed to get dependencies!
    pause
    exit /b 1
)

flutter pub run flutter_launcher_icons
if errorlevel 1 (
    echo [ERROR] Failed to generate icons!
    pause
    exit /b 1
)

echo.
echo ================================================
echo  Icons Generated Successfully!
echo ================================================
echo.
echo Next steps:
echo   1. Run: flutter clean
echo   2. Run: flutter pub get
echo   3. Run: flutter run
echo.
echo The new green icon will appear on your device!
echo.
pause
