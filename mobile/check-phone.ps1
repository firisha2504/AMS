# Afosha MS - Check What's on the Phone
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "          Checking Phone for Afosha MS Apps" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if ADB is available
$adbPath = $null
$possiblePaths = @(
    "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Android\sdk\platform-tools\adb.exe",
    "adb.exe"
)

foreach ($path in $possiblePaths) {
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        $adbPath = $path
        break
    }
}

if (-not $adbPath) {
    Write-Host "ADB not found. Using Flutter commands instead." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Checking connected devices..." -ForegroundColor Green
    flutter devices
    Write-Host ""
    
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "To manually check apps on your phone:" -ForegroundColor Yellow
    Write-Host "  1. Go to Settings on your phone" -ForegroundColor White
    Write-Host "  2. Tap on Apps or Applications" -ForegroundColor White
    Write-Host "  3. Look for these app names:" -ForegroundColor White
    Write-Host "     - Afosha MS" -ForegroundColor White
    Write-Host "     - ams_mobile" -ForegroundColor White
    Write-Host "     - AMS Mobile" -ForegroundColor White
    Write-Host "  4. Note how many you find (should be only 1, or 0 if not installed)" -ForegroundColor White
    Write-Host "========================================================================" -ForegroundColor Cyan
} else {
    Write-Host "Found ADB at: $adbPath" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Checking connected devices..." -ForegroundColor Green
    & $adbPath devices
    Write-Host ""
    
    Write-Host "Searching for Afosha-related apps on phone..." -ForegroundColor Green
    $packages = & $adbPath shell pm list packages | Select-String -Pattern "afosha|ams_mobile"
    
    if ($packages) {
        Write-Host ""
        Write-Host "Found the following related packages:" -ForegroundColor Yellow
        foreach ($pkg in $packages) {
            Write-Host "  $pkg" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "You should see only ONE package: package:com.afosha.mobile" -ForegroundColor Yellow
        Write-Host "If you see more, you need to uninstall the extras!" -ForegroundColor Red
    } else {
        Write-Host ""
        Write-Host "No Afosha MS apps found on phone." -ForegroundColor Yellow
        Write-Host "This is GOOD if you're about to do a fresh install." -ForegroundColor Green
    }
    Write-Host ""
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Checking local build files..." -ForegroundColor Green
Write-Host ""

# Check if icon exists
if (Test-Path "assets\images\app_icon.png") {
    $iconFile = Get-Item "assets\images\app_icon.png"
    Write-Host "[OK] Icon file found:" -ForegroundColor Green
    Write-Host "     Path: $($iconFile.FullName)" -ForegroundColor White
    Write-Host "     Size: $([math]::Round($iconFile.Length / 1KB, 2)) KB" -ForegroundColor White
    Write-Host "     Modified: $($iconFile.LastWriteTime)" -ForegroundColor White
    
    if ($iconFile.Length -lt 10KB) {
        Write-Host ""
        Write-Host "     WARNING: Icon file is very small!" -ForegroundColor Red
        Write-Host "     It should be at least 50KB for a high-quality 1024x1024 icon." -ForegroundColor Red
        Write-Host "     The current icon might be low quality or a placeholder." -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] Icon file NOT found!" -ForegroundColor Red
    Write-Host "        Expected at: assets\images\app_icon.png" -ForegroundColor Red
}
Write-Host ""

# Check if generated icons exist
if (Test-Path "android\app\src\main\res\mipmap-hdpi\ic_launcher.png") {
    Write-Host "[OK] Generated launcher icons found:" -ForegroundColor Green
    Get-ChildItem "android\app\src\main\res\mipmap-*\ic_launcher.png" | ForEach-Object {
        Write-Host "     $($_.FullName.Replace($PWD.Path + '\', ''))" -ForegroundColor White
    }
} else {
    Write-Host "[ERROR] Generated icons NOT found!" -ForegroundColor Red
    Write-Host "        You need to run: flutter pub run flutter_launcher_icons" -ForegroundColor Yellow
}
Write-Host ""

# Check if APK exists
if (Test-Path "build\app\outputs\flutter-apk\app-release.apk") {
    $apkFile = Get-Item "build\app\outputs\flutter-apk\app-release.apk"
    Write-Host "[OK] Release APK found:" -ForegroundColor Green
    Write-Host "     Path: $($apkFile.FullName)" -ForegroundColor White
    Write-Host "     Size: $([math]::Round($apkFile.Length / 1MB, 2)) MB" -ForegroundColor White
    Write-Host "     Built: $($apkFile.LastWriteTime)" -ForegroundColor White
} else {
    Write-Host "[INFO] No release APK found yet" -ForegroundColor Yellow
    Write-Host "       You need to run: flutter build apk --release" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. If you see multiple packages on phone: Uninstall ALL of them manually" -ForegroundColor White
Write-Host "  2. If icon file is missing/wrong: Replace it with correct green 'A' logo" -ForegroundColor White
Write-Host "  3. If generated icons missing: Run 'flutter pub run flutter_launcher_icons'" -ForegroundColor White
Write-Host "  4. Then run: ULTIMATE_FIX.bat" -ForegroundColor White
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to close"
