#requires -Version 5.1
<#
.SYNOPSIS
    Khoi dong lai toan bo SecurePharma (Backend + Frontend).

.DESCRIPTION
    - Kill moi process dang chiem port BE (8080) va FE (4444).
    - Kill cac cua so BE/FE cua lan chay truoc (neu con sot).
    - Mo 2 cua so PowerShell rieng: 1 cho BE, 1 cho FE.
    - Doi ca 2 cong Listen san sang roi in thong tin truy cap.
    - Ctrl+C o cua so nay se dung ca 2 server.

.EXAMPLE
    .\dev.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$bePort = 8080
$fePort = 4444
$beTitle = 'SecurePharma - Backend (8080)'
$feTitle = 'SecurePharma - Frontend (4444)'

# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
function Stop-Port {
    param([int]$Port)

    # Parse `netstat -ano` de bat duoc ca IPv4 (0.0.0.0:PORT) lan IPv6 ([::]:PORT).
    # Get-NetTCPConnection tren mot so ban Windows chi liet ke IPv4 -> de bo sot
    # socket dual-stack nhu cua Node.js -> server moi van EADDRINUSE.
    $lines = & netstat.exe -ano 2>$null
    $pids  = New-Object System.Collections.Generic.HashSet[int]
    foreach ($ln in $lines) {
        if ($ln -match '^\s*TCP\s+\S+:{0}\s+\S+\s+LISTENING\s+(\d+)\s*$' -f $Port) {
            $null = $pids.Add([int]$Matches[1])
        }
    }
    foreach ($p in $pids) {
        if ($p -eq $PID) { continue }
        try {
            $proc = Get-Process -Id $p -ErrorAction Stop
            Write-Host ("  [kill] Port {0} -> PID {1} ({2})" -f $Port, $p, $proc.ProcessName) -ForegroundColor Yellow
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        } catch {
            # Process co the da thoat giua chung, bo qua
        }
    }
}

function Close-Windows {
    param([string[]]$Titles)
    Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
        $t = $_.MainWindowTitle
        $Titles | Where-Object { $t -eq $_ }
    } | ForEach-Object {
        Write-Host "  [kill] Closing window: $($_.MainWindowTitle)" -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}

function Wait-Port {
    param([int]$Port, [int]$TimeoutSec = 45)
    for ($i = 0; $i -lt $TimeoutSec; $i++) {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conn) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

# ---------------------------------------------------------------
# 1. Cleanup moi thu tu lan chay truoc
# ---------------------------------------------------------------
Write-Host ""
Write-Host "[dev] Cleaning up old BE/FE..." -ForegroundColor Cyan
Write-Host ""

Stop-Port $bePort
Stop-Port $fePort
Close-Windows @($beTitle, $feTitle)

Start-Sleep -Milliseconds 800

# ---------------------------------------------------------------
# 2. Start BE + FE trong 2 cua so PowerShell rieng
# ---------------------------------------------------------------
Write-Host "[dev] Starting Backend and Frontend..." -ForegroundColor Cyan
Write-Host ""

# Dung here-string literal (@'...'@) de tranh parser vo voi ky tu dac biet.
# PS 5.x va PS 7 deu parse dung vi moi thu ben trong la chuoi tho, khong can escape.
$beCmdTemplate = @'
$Host.UI.RawUI.WindowTitle='__BETITLE__'
Write-Host ''
Write-Host '=== SecurePharma Backend ===' -ForegroundColor Cyan
npm run dev
'@

$feCmdTemplate = @'
$Host.UI.RawUI.WindowTitle='__FETITLE__'
Write-Host ''
Write-Host '=== SecurePharma Frontend ===' -ForegroundColor Green
npm run dev
'@

$beCmd = $beCmdTemplate.Replace('__BETITLE__', $beTitle)
$feCmd = $feCmdTemplate.Replace('__FETITLE__', $feTitle)

$beProc = Start-Process powershell `
    -ArgumentList @('-NoExit', '-Command', $beCmd) `
    -WorkingDirectory (Join-Path $root 'backend') `
    -PassThru

$feProc = Start-Process powershell `
    -ArgumentList @('-NoExit', '-Command', $feCmd) `
    -WorkingDirectory (Join-Path $root 'frontend') `
    -PassThru

# ---------------------------------------------------------------
# 3. Doi ports san sang
# ---------------------------------------------------------------
Write-Host ("[dev] Waiting for backend  on :{0} ..." -f $bePort) -NoNewline -ForegroundColor Gray
$beOk = Wait-Port $bePort 45
if ($beOk) { Write-Host " ready [OK]" -ForegroundColor Green } else { Write-Host " TIMEOUT [FAIL]" -ForegroundColor Red }

Write-Host ("[dev] Waiting for frontend on :{0} ..." -f $fePort) -NoNewline -ForegroundColor Gray
$feOk = Wait-Port $fePort 45
if ($feOk) { Write-Host " ready [OK]" -ForegroundColor Green } else { Write-Host " TIMEOUT [FAIL]" -ForegroundColor Red }

# ---------------------------------------------------------------
# 4. Banner ket qua (thuan ASCII, tranh ky tu box-drawing)
# ---------------------------------------------------------------
Write-Host ""
Write-Host "+========================================================+" -ForegroundColor Cyan
Write-Host "|         SecurePharma dev environment READY             |" -ForegroundColor Cyan
Write-Host "+========================================================+" -ForegroundColor Cyan
Write-Host ("|  App:    http://localhost:{0}                            |" -f $fePort) -ForegroundColor Cyan
Write-Host ("|  API:    http://localhost:{0}/api                       |" -f $bePort) -ForegroundColor Cyan
Write-Host ("|  Health: http://localhost:{0}/api/health                |" -f $bePort) -ForegroundColor Cyan
Write-Host "|  Demo:   admin.huong / Admin@2026                      |" -ForegroundColor Cyan
Write-Host "|                                                        |" -ForegroundColor Cyan
Write-Host "|  - Dong cua so Backend/Frontend dang mo de tat.        |" -ForegroundColor Cyan
Write-Host "|  - Hoac nhan Ctrl+C TRONG cua so nay de stop ca 2.     |" -ForegroundColor Cyan
Write-Host "+========================================================+" -ForegroundColor Cyan
Write-Host ""

if (-not $beOk) { Write-Host "[dev] WARN: Backend chua len sau 45s - xem cua so Backend." -ForegroundColor Yellow }
if (-not $feOk) { Write-Host "[dev] WARN: Frontend chua len sau 45s - xem cua so Frontend." -ForegroundColor Yellow }

# ---------------------------------------------------------------
# 5. Cleanup khi Ctrl+C / dong cua so
# ---------------------------------------------------------------
$cleanup = {
    Write-Host ""
    Write-Host "[dev] Stopping Backend and Frontend..." -ForegroundColor Yellow
    Stop-Port $bePort
    Stop-Port $fePort
    Close-Windows @($beTitle, $feTitle)
    Write-Host "[dev] Cleaned up." -ForegroundColor Green
}

# Dang ky hook khi script ket thuc (dong cua so chinh hoac Ctrl+C)
Register-EngineEvent PowerShell.Exiting -Action $cleanup | Out-Null

try {
    while ($true) { Start-Sleep -Seconds 5 }
}
finally {
    & $cleanup
}