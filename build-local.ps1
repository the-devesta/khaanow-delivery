# Build APK with Local Backend
# This script builds an APK that connects to your local backend  

param(
    [string]$IP = "10.176.171.122"
)

Write-Host "🚀 Building APK for Local Backend Testing..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL: http://$IP:7071/api" -ForegroundColor Green
Write-Host ""

# Check if backend is running
Write-Host "Checking if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$IP:7071/api/" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Warning: Cannot reach backend at http://$IP:7071/api/" -ForegroundColor Yellow
    Write-Host "Make sure 'func start' is running in the backend directory" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

# Check if EAS CLI is installed
if (!(Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Host "❌ EAS CLI not found. Installing..." -ForegroundColor Red
    npm install -g eas-cli
}

# Update eas.json with current IP
Write-Host ""
Write-Host "Updating eas.json with IP: $IP" -ForegroundColor Cyan
$easJson = Get-Content eas.json | ConvertFrom-Json
$easJson.build.'production-local'.env.EXPO_PUBLIC_API_URL = "http://$IP:7071/api"
$easJson | ConvertTo-Json -Depth 10 | Set-Content eas.json

# Start build
Write-Host ""
Write-Host "Starting build..." -ForegroundColor Cyan
eas build --platform android --profile production-local

Write-Host ""
Write-Host "✅ Build queued!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Note: Your phone must be on the same network as this computer" -ForegroundColor Yellow
Write-Host "⚠️  Backend must be running for the APK to work" -ForegroundColor Yellow
