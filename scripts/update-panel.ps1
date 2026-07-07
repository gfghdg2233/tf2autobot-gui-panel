$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$DataDir = Join-Path $Root 'data'
$Log = Join-Path $DataDir 'panel-update.log'
$Job = Join-Path $DataDir 'panel-update-job.json'
$Branch = if ($env:PANEL_GIT_BRANCH) { $env:PANEL_GIT_BRANCH } else { 'main' }
$Pm2Name = if ($env:PANEL_PM2_NAME) { $env:PANEL_PM2_NAME } else { 'GUI' }

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

function Write-Log($Message) {
    $Line = "[$(Get-Date -Format o)] $Message"
    Add-Content -Path $Log -Value $Line
    Write-Output $Line
}

function Fail($Message) {
    Write-Log "ERROR: $Message"
    @{
        status = 'failed'
        finishedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        error = $Message
    } | ConvertTo-Json | Set-Content -Path $Job
    exit 1
}

Write-Log "Starting panel update in $Root"
Write-Log "Branch: $Branch"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fail 'git is not installed'
}

if (git status --porcelain) {
    Fail 'Working tree has local changes'
}

git fetch origin $Branch 2>&1 | Tee-Object -FilePath $Log -Append
if ($LASTEXITCODE -ne 0) { Fail 'git fetch failed' }

git pull --ff-only origin $Branch 2>&1 | Tee-Object -FilePath $Log -Append
if ($LASTEXITCODE -ne 0) { Fail 'git pull failed' }

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Fail 'npm is not installed'
}

npm install 2>&1 | Tee-Object -FilePath $Log -Append
if ($LASTEXITCODE -ne 0) { Fail 'npm install failed' }

npm run build 2>&1 | Tee-Object -FilePath $Log -Append
if ($LASTEXITCODE -ne 0) { Fail 'npm run build failed' }

Write-Log 'Build complete.'

if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Log "Restarting PM2 process: $Pm2Name"
    pm2 restart $Pm2Name 2>&1 | Tee-Object -FilePath $Log -Append
    if ($LASTEXITCODE -ne 0) {
        pm2 restart all 2>&1 | Tee-Object -FilePath $Log -Append
    }
} else {
    Write-Log 'PM2 not found — restart the panel manually (npm start).'
}

@{
    status = 'done'
    finishedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
} | ConvertTo-Json | Set-Content -Path $Job

Write-Log 'Update finished.'
