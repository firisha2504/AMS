@echo off
echo ========================================================================
echo          AFOSHA MS - DIAGNOSTIC CHECK
echo ========================================================================
echo.

echo [1] Checking if Flutter is working...
echo ------------------------------------------------------------------------
call flutter --version
echo.

echo [2] Checking connected devices...
echo ------------------------------------------------------------------------
call flutter devices
echo.

echo [3] Checking if app icon file exists...
echo ------------------------------------------------------------------------
if exist "assets\images\app_icon.png" (
    echo [OK] Icon file found: assets\images\app_icon.png
    dir assets\images\app_icon.png
) else (
    echo [ERROR] Icon file NOT found at assets\images\app_icon.png
)
echo.

echo [4] Checking if generated icons exist...
echo ------------------------------------------------------------------------
if exist "android\app\src\main\res\mipmap-hdpi\ic_launcher.png" (
    echo [OK] Generated icons found in android\app\src\main\res\
    echo.
    echo Icon files:
    dir /b android\app\src\main\res\mipmap-*\ic_launcher.png
) else (
    echo [ERROR] Generated icons NOT found!
    echo This means flutter_launcher_icons hasn't run yet.
)
echo.

echo [5] Checking AndroidManifest.xml configuration...
echo ------------------------------------------------------------------------
if exist "android\app\src\main\AndroidManifest.xml" (
    findstr /C:"android:label" android\app\src\main\AndroidManifest.xml
    findstr /C:"applicationId" android\app\build.gradle 2>nul
) else (
    echo [ERROR] AndroidManifest.xml not found
)
echo.

echo [6] Checking if APK exists...
echo ------------------------------------------------------------------------
if exist "build\app\outputs\flutter-apk\app-release.apk" (
    echo [OK] Release APK found:
    dir build\app\outputs\flutter-apk\app-release.apk
) else (
    echo [INFO] No release APK built yet
)
echo.

echo [7] Checking pubspec.yaml flutter_launcher_icons config...
echo ------------------------------------------------------------------------
findstr /C:"flutter_launcher_icons" pubspec.yaml
findstr /C:"image_path" pubspec.yaml
echo.

echo ========================================================================
echo                    DIAGNOSTIC COMPLETE
echo ========================================================================
echo.
echo If you see any [ERROR] messages above, those need to be fixed first.
echo.
echo Next steps:
echo   - If icon file exists and generated icons exist: Run ULTIMATE_FIX.bat
echo   - If generated icons don't exist: Run "flutter pub run flutter_launcher_icons"
echo   - If icon file doesn't exist: Create the green "A" logo first
echo.
pause
