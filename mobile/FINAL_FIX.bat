@echo off
echo ========================================================================
echo          AFOSHA MS - FINAL COMPLETE FIX
echo ========================================================================
echo.
echo This will:
echo   1. Uninstall ALL versions from phone
echo   2. Delete old build files
echo   3. Regenerate app icons (GREEN logo)
echo   4. Build fresh release APK
echo   5. Install ONLY the new version
echo.
echo BEFORE running this:
echo   - Connect phone via USB
echo   - Enable USB Debugging
echo   - Manually uninstall BOTH "Afosha MS" apps from phone
echo.
echo ========================================================================
pause
echo.

echo [1/7] Uninstalling via Flutter...
echo ------------------------------------------------------------------------
call flutter devices
call flutter install --uninstall-only
echo.

echo [2/7] Deleting old build files...
echo ------------------------------------------------------------------------
rmdir /s /q build 2>nul
rmdir /s /q android\.gradle 2>nul
rmdir /s /q android\app\build 2>nul
echo Done.
echo.

echo [3/7] Flutter clean...
echo ------------------------------------------------------------------------
call flutter clean
echo.

echo [4/7] Get dependencies...
echo ------------------------------------------------------------------------
call flutter pub get
echo.

echo [5/7] Generating GREEN app icons...
echo ------------------------------------------------------------------------
call flutter pub run flutter_launcher_icons
echo.

echo [6/7] Building RELEASE APK with new icons...
echo ------------------------------------------------------------------------
call flutter build apk --release
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo.

echo [7/7] Installing on phone...
echo ------------------------------------------------------------------------
call flutter install --release
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Install failed!
    pause
    exit /b 1
)
echo.

echo ========================================================================
echo                    SUCCESS!
echo ========================================================================
echo.
echo NOW CHECK YOUR PHONE:
echo.
echo 1. Look for "Afosha MS" app
echo 2. Icon should be GREEN with white "A"
echo 3. Should be only ONE app (not two)
echo 4. Open it and check login screen
echo.
echo If STILL wrong icon:
echo   - Phone might be caching old icon
echo   - Restart your phone
echo   - Or clear launcher cache: Settings - Apps - Launcher - Clear Cache
echo.
echo ========================================================================
pause
