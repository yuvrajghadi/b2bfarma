# ====================================
# Port Management Scripts for Windows
# ====================================

# Check what's using port 3000
Write-Host "Checking port 3000..." -ForegroundColor Cyan
$process = netstat -ano | findstr :3000
if ($process) {
    Write-Host "Port 3000 is in use:" -ForegroundColor Yellow
    Write-Host $process
    
    # Extract PID (last column)
    $pid = ($process -split '\s+')[-1]
    Write-Host "`nProcess ID: $pid" -ForegroundColor Yellow
    
    # Show process details
    $processInfo = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($processInfo) {
        Write-Host "Process Name: $($processInfo.ProcessName)" -ForegroundColor Yellow
        Write-Host "Path: $($processInfo.Path)" -ForegroundColor Yellow
    }
    
    # Ask to kill
    $confirm = Read-Host "`nDo you want to kill this process? (y/n)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        taskkill /PID $pid /F
        Write-Host "✅ Process killed successfully!" -ForegroundColor Green
    } else {
        Write-Host "Process not killed. Change PORT in .env to use a different port." -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ Port 3000 is available!" -ForegroundColor Green
}
