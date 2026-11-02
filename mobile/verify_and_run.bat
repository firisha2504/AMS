@echo off
echo.
echo ========================================
echo  Afosha Mobile App - Build Script
echo ========================================
echo.
echo Package ID: com.afosha.mobile
echo Version: 1.0.0+1
echo.
echo ========================================
echo  Step 1: Cleaning previous builds...
echo ========================================
call flutter clean
echo.
echo ========================================
echo  Step 2: Getting dependencies...
echo ========================================
call flutter pub get
echo.
echo ========================================
echo  Step 3: Verifying package structure...
echo ========================================
if exist "android\app\src\main\kotlin\com\afosha\mobile\MainActivity.kt" (
    echo [OK] MainActivity.kt found in correct location
) else (
    echo [ERROR] MainActivity.kt not found!
    pause
    exit /b 1
)

if exist "android\app\src\main\kotlin\com\example\ams_mobile\MainActivity.kt" (
    echo [WARNING] Old MainActivity.kt still exists - should be deleted
) else (
    echo [OK] Old MainActivity.kt properly removed
)
echo.
echo ========================================
echo  Step 4: Building and running...
echo ========================================
echo.
echo Make sure:
echo  1. Your phone is connected via USB
echo  2. USB debugging is enabled
echo  3. Old ams_mobile apps are UNINSTALLED
echo.
pause
echo.
call flutter run
echo.
echo ========================================
echo  Build Complete!
echo ========================================
echo.
echo If successful, you should now have:
echo  - Only ONE ams_mobile app on your phone
echo  - New package ID: com.afosha.mobile
echo  - Beautiful redesigned screens
echo  - Full bilingual support
echo.
echo Test the language toggle and navigate
echo through different screens!
echo.
pause
