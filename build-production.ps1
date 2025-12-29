# Build Production APK
# This script builds an APK that connects to the production backend

Write-Host "🚀 Building Production APK for KhaoNow Delivery..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: https://khaaonow-be.azurewebsites.net/api" -ForegroundColor Green
Write-Host ""

# Check if EAS CLI is installed
if (!(Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Host "❌ EAS CLI not found. Installing..." -ForegroundColor Red
    npm install -g eas-cli
}

# Login check
Write-Host "Checking EAS login status..." -ForegroundColor Yellow
eas whoami

if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to EAS:" -ForegroundColor Yellow
    eas login
}

# Start build
Write-Host ""
Write-Host "Starting build..." -ForegroundColor Cyan
eas build --platform android --profile production

Write-Host ""
Write-Host "✅ Build queued! Check status at: https://expo.dev" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Download the APK from the Expo dashboard when complete." -ForegroundColor Yellow
