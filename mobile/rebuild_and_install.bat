@echo off
echo ========================================
echo  Afosha MS - Rebuild and Install
echo ========================================
echo.

echo Step 1: Uninstalling old versions...
echo ----------------------------------------
adb uninstall com.afosha.ams_mobile
timeout /t 2 /nobreak >nul

echo.
echo Step 2: Cleaning build cache...
echo ----------------------------------------
flutter clean
timeout /t 2 /nobreak >nul

echo.
echo Step 3: Getting dependencies...
echo ----------------------------------------
flutter pub get
timeout /t 2 /nobreak >nul

echo.
echo Step 4: Building APK...
echo ----------------------------------------
flutter build apk --release
timeout /t 2 /nobreak >nul

echo.
echo Step 5: Installing APK...
echo ----------------------------------------
adb install build\app\outputs\flutter-apk\app-release.apk

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo Please check your phone:
echo - Only ONE "Afosha MS" app should be visible
echo - Open it and try logging in
echo - No yellow/black overflow warning
echo - Clean error messages
echo.
pause
