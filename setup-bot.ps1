# Install / verify TF2Autobot (PriceDB fork) next to the GUI panel on Windows.
# Default layout: D:\panel + D:\tf2autobot
$ErrorActionPreference = 'Stop'

$GuiDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BotDir = if ($env:BOT_DIR) { $env:BOT_DIR } else { Join-Path (Split-Path -Parent $GuiDir) 'tf2autobot' }
$BotRepo = 'https://github.com/uwu6967/tf2autobot-pricedb.git'
$AccountDir = Join-Path $GuiDir 'files'

Write-Host ''
Write-Host '=========================================='
Write-Host '  TF2Autobot (PriceDB) + GUI panel'
Write-Host '=========================================='
Write-Host ''
Write-Host "GUI panel:   $GuiDir"
Write-Host "Bot folder:  $BotDir"
Write-Host ''

if (-not (Test-Path (Join-Path $BotDir 'dist\app.js'))) {
    if (-not (Test-Path (Join-Path $BotDir '.git'))) {
        Write-Host '>> Cloning tf2autobot-pricedb...'
        git clone --depth 1 $BotRepo $BotDir
    }
    Write-Host '>> Installing bot dependencies...'
    Push-Location $BotDir
    npm install
    Write-Host '>> Building bot...'
    npm run build
    Pop-Location
} else {
    Write-Host "Bot already built at $BotDir"
}

# Optional: share account data between panel and bot (bot reads files/<account>/)
$BotFiles = Join-Path $BotDir 'files'
if (-not (Test-Path $BotFiles)) {
    if (Test-Path $AccountDir) {
        Write-Host ">> Linking bot files/ -> panel files/"
        cmd /c mklink /J "$BotFiles" "$AccountDir" | Out-Null
    } else {
        Write-Host ">> Creating bot files/ (panel files/ not found yet)"
        New-Item -ItemType Directory -Path $BotFiles -Force | Out-Null
    }
}

$BotEnv = Join-Path $BotDir '.env'
if (-not (Test-Path $BotEnv)) {
    Write-Host ''
    Write-Host '>> Creating bot .env from template — add Steam credentials:'
    Copy-Item (Join-Path $BotDir 'template.env') $BotEnv
}

$envLines = Get-Content $BotEnv
$hasIpc = $false
$hasTls = $false
$updated = @()
foreach ($line in $envLines) {
    if ($line -match '^\s*IPC\s*=') {
        $updated += 'IPC=true'
        $hasIpc = $true
    } elseif ($line -match '^\s*TLS\s*=') {
        $updated += 'TLS=false'
        $hasTls = $true
    } else {
        $updated += $line
    }
}
if (-not $hasIpc) { $updated += 'IPC=true' }
if (-not $hasTls) { $updated += 'TLS=false' }
Set-Content -Path $BotEnv -Value $updated -Encoding UTF8

if (Test-Path $AccountDir) {
    Get-ChildItem $AccountDir -Directory | ForEach-Object {
        $optionsPath = Join-Path $_.FullName 'options.json'
        if (-not (Test-Path $optionsPath)) {
            Write-Host ">> Copying default options.json -> $($_.Name)/"
            Copy-Item (Join-Path $BotDir '.example\options.json') $optionsPath
        }
    }
}

Write-Host ''
Write-Host '=========================================='
Write-Host '  Next steps (same PC required for IPC)'
Write-Host '=========================================='
Write-Host ''
Write-Host '1. Edit bot credentials:'
Write-Host "   notepad $BotEnv"
Write-Host ''
Write-Host '2. Add your SteamID64 to ADMINS in bot .env (and options.json admins if used).'
Write-Host ''
Write-Host '3. Start the WEB PANEL first (terminal 1):'
Write-Host "   cd $GuiDir"
Write-Host '   npm run build'
Write-Host '   node dist/server/index.js'
Write-Host ''
Write-Host '4. Start the TRADING BOT (terminal 2):'
Write-Host "   cd $BotDir"
Write-Host '   node dist/app.js'
Write-Host ''
Write-Host '5. Panel should log "bot connected: <name>". Top bar shows Bot: <name>.'
Write-Host '   Health check: http://127.0.0.1:3000/health/bot'
Write-Host ''
