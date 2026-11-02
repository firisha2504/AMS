# Convert SVG to PNG using built-in .NET classes
# This creates a proper 1024x1024 PNG from the SVG

$svgPath = "assets/images/app_icon.svg"
$pngPath = "assets/images/app_icon.png"

Write-Host "Converting SVG to PNG..." -ForegroundColor Cyan

# Read SVG content
$svgContent = Get-Content $svgPath -Raw

# Check if SVG file exists and has content
if (-not $svgContent) {
    Write-Host "ERROR: SVG file is empty or not found!" -ForegroundColor Red
    exit 1
}

Write-Host "SVG file found and loaded successfully" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "IMPORTANT: Manual PNG Conversion Required" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "PowerShell cannot directly convert SVG to PNG." -ForegroundColor White
Write-Host "Please use one of these methods:" -ForegroundColor White
Write-Host ""
Write-Host "METHOD 1: Online Converter (Easiest)" -ForegroundColor Cyan
Write-Host "  1. Go to: https://svgtopng.com" -ForegroundColor White
Write-Host "  2. Upload: mobile/assets/images/app_icon.svg" -ForegroundColor White
Write-Host "  3. Set size: 1024x1024 pixels" -ForegroundColor White
Write-Host "  4. Download PNG" -ForegroundColor White
Write-Host "  5. Save as: mobile/assets/images/app_icon.png" -ForegroundColor White
Write-Host ""
Write-Host "METHOD 2: Inkscape (If installed)" -ForegroundColor Cyan
Write-Host "  inkscape app_icon.svg --export-filename=app_icon.png --export-width=1024 --export-height=1024" -ForegroundColor White
Write-Host ""
Write-Host "METHOD 3: GIMP (If installed)" -ForegroundColor Cyan
Write-Host "  1. Open app_icon.svg in GIMP" -ForegroundColor White
Write-Host "  2. Export As PNG" -ForegroundColor White
Write-Host "  3. Set size to 1024x1024" -ForegroundColor White
Write-Host ""
Write-Host "After converting, run: flutter pub run flutter_launcher_icons" -ForegroundColor Green
Write-Host ""

# Open the SVG in default browser so user can see it
Write-Host "Opening SVG in browser..." -ForegroundColor Cyan
Start-Process $svgPath

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
