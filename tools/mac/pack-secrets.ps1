# Windows PowerShell: bundle ONLY the files that are not in git (secrets + state) into one .tgz on the Desktop.
# Run: powershell -ExecutionPolicy Bypass -File E:\workspace\side_project\aztomz\tools\mac\pack-secrets.ps1
# The bundle contains secrets. Move it by AirDrop/USB (never GitHub/cloud chat), then delete it on both machines.
# ASCII only on purpose (Windows PowerShell 5.1 reads BOM-less UTF-8 as ANSI).
param([string]$OutFile = '')
$ErrorActionPreference = 'Stop'
$root  = 'E:\workspace\side_project'
$stage = Join-Path $env:TEMP 'az2mz-secrets-stage'
$out   = if ($OutFile) { $OutFile } else { Join-Path ([Environment]::GetFolderPath('Desktop')) 'az2mz-secrets.tgz' }
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force "$stage\side_project" | Out-Null

# 1) fixed files (relative to $root). Missing ones are reported, not fatal.
$files = @(
  'hermes\.env',                       # DISCORD_BOT_TOKEN, GEMINI_API_KEY, YOUTUBE_API_KEY, ANTHROPIC_*, ...
  'hermes\auth.json',                  # model provider logins (openai-codex, anthropic)
  'hermes\auth\google_oauth.json',
  'aztomz\.env',                       # PEXELS_API_KEY
  'aztomz\.claude\settings.json',
  'aztomz\.claude\settings.local.json',
  'aztomz\.claude\launch.json',
  'aztomz\backend\out\blog\posted-naver.json',
  'aztomz\backend\out\blog\queue-skipped.json',
  'aztomz\backend\out\blog\cover-refresh.json'
)
# 2) whole folders: bot run records + review queue
$dirs = @('aztomz\backend\out\pipeline', 'aztomz\.pipeline')
# 3) blog drafts of the last 10 days (queue only posts verified drafts built within 7 days)
$blog = Get-ChildItem "$root\aztomz\backend\out\blog" -File | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-10) -and $_.Extension -in '.json','.md','.html','.png','.jpg' }

$missing = @()
foreach ($f in $files) {
  $src = Join-Path $root $f
  if (Test-Path -LiteralPath $src) {
    $dst = Join-Path "$stage\side_project" $f
    New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
    Copy-Item -LiteralPath $src -Destination $dst
  } else { $missing += $f }
}
foreach ($d in $dirs) {
  $src = Join-Path $root $d
  if (Test-Path $src) { Copy-Item -Recurse -Force $src (Join-Path "$stage\side_project" $d) -ErrorAction SilentlyContinue }
  else { $missing += $d }
}
$bd = "$stage\side_project\aztomz\backend\out\blog"
New-Item -ItemType Directory -Force $bd | Out-Null
$blog | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $bd -Force }

# 4) Claude Code global instructions (settings.json is NOT copied: it has Windows-only hooks/statusline)
$cl = "$env:USERPROFILE\.claude"
New-Item -ItemType Directory -Force "$stage\claude-home" | Out-Null
if (Test-Path "$cl\CLAUDE.md") { Copy-Item "$cl\CLAUDE.md" "$stage\claude-home\CLAUDE.md" } else { $missing += '.claude\CLAUDE.md' }
$mem = "$cl\projects\E--workspace-side-project-aztomz\memory"
if (Test-Path $mem) { Copy-Item -Recurse $mem "$stage\claude-home\memory" }

if (Test-Path $out) { Remove-Item -Force $out }
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'   # bsdtar; a GNU tar earlier on PATH mistakes C: for a host
& $tar -czf $out -C $stage .
if ($LASTEXITCODE -ne 0) { throw 'tar failed' }
Remove-Item -Recurse -Force $stage
$mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "OK: $out ($mb MB)"
if ($missing.Count) { Write-Host ('MISSING (skipped): ' + ($missing -join ', ')) }
Write-Host "List contents: & `"$tar`" -tzf `"$out`""
