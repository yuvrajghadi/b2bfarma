# ====================================
# Kill all Node.js processes
# USE WITH CAUTION - kills ALL node.exe
# ====================================

Write-Host "⚠️  WARNING: This will kill ALL Node.js processes!" -ForegroundColor Red
$confirm = Read-Host "Are you sure? (yes/no)"

if ($confirm -eq 'yes') {
    Write-Host "Killing all Node.js processes..." -ForegroundColor Yellow
    taskkill /IM node.exe /F
    Write-Host "✅ All Node.js processes terminated!" -ForegroundColor Green
} else {
    Write-Host "Cancelled." -ForegroundColor Yellow
}
