# Afosha MS - Manual Fix Script
# Run in PowerShell: .\fix-manual.ps1

Write-Host "========================================================================" -ForegroundColor Green
Write-Host "             AFOSHA MS - MANUAL FIX (PowerShell)" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""

# Step 3: Get dependencies
Write-Host "[Step 3/6] Getting dependencies..." -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------------" -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Flutter pub get failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Done.`n" -ForegroundColor Green

# Step 4: Generate icons
Write-Host "[Step 4/6] Generating app icons (Green 'A' logo)..." -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------------" -ForegroundColor Yellow
flutter pub run flutter_launcher_icons
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Icon generation failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Done.`n" -ForegroundColor Green

# Step 5: Build APK
Write-Host "[Step 5/6] Building release APK..." -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------------" -ForegroundColor Yellow
flutter build apk --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Done.`n" -ForegroundColor Green

# Step 6: Install
Write-Host "[Step 6/6] Installing on your phone..." -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------------" -ForegroundColor Yellow
adb install build\app\outputs\flutter-apk\app-release.apk
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Installation failed! Is your phone connected?" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Done.`n" -ForegroundColor Green

Write-Host "========================================================================" -ForegroundColor Green
Write-Host "                    INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Please check your phone:" -ForegroundColor Cyan
Write-Host ""
Write-Host "[✓] Only ONE 'Afosha MS' app should appear" -ForegroundColor Green
Write-Host "[✓] Icon should be GREEN with white 'A' (not blue scissors)" -ForegroundColor Green
Write-Host "[✓] App name shows as 'Afosha MS'" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
