$ErrorActionPreference = 'Stop'

$port = 9333
$defaultCandidates = @(
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and $_.Trim().Length -gt 0 }

$edgeExe = $defaultCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $edgeExe) {
  $whereResult = & where.exe msedge 2>$null
  if ($LASTEXITCODE -eq 0 -and $whereResult) {
    $first = ($whereResult | Select-Object -First 1).Trim()
    if (Test-Path $first) {
      $edgeExe = $first
    }
  }
}

if (-not $edgeExe) {
  Write-Error 'msedge.exe not found. Install Microsoft Edge or update script path.'
  exit 1
}

$userDataDir = 'C:\tmp\edge-mcp-profile'
New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null

$arguments = @(
  "--remote-debugging-port=$port",
  "--user-data-dir=$userDataDir",
  '--no-first-run',
  '--new-window',
  'about:blank'
)

Start-Process -FilePath $edgeExe -ArgumentList $arguments | Out-Null

Write-Host 'Edge CDP profile started.'
Write-Host "Debugger endpoint: http://127.0.0.1:$port/json"
Write-Host "Binary: $edgeExe"
