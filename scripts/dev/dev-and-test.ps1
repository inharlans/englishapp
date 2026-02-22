param(
  [ValidateSet("smoke", "ui", "all")]
  [string]$Suite = "all",
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 3000,
  [int]$WaitSeconds = 120
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $projectRoot ".loop"
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$devOutLog = Join-Path $runtimeDir "dev-server.out.log"
$devErrLog = Join-Path $runtimeDir "dev-server.err.log"

$existingServer = $false
$existingConn = Get-NetTCPConnection -LocalAddress $BindHost -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existingConn) {
  $existingServer = $true
}

if (-not $existingServer) {
  if (Test-Path $devOutLog) { Remove-Item $devOutLog -Force }
  if (Test-Path $devErrLog) { Remove-Item $devErrLog -Force }
}

function Wait-Server {
  param(
    [string]$Url,
    [int]$MaxSeconds
  )

  for ($i = 0; $i -lt $MaxSeconds; $i++) {
    try {
      $res = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
      if ($res.StatusCode -ge 200) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  return $false
}

$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
if (-not $npmCmd) {
  throw "npm.cmd was not found in PATH."
}

$devArgs = @("run", "dev", "--", "--hostname", $BindHost, "--port", "$Port")
$devProcess = $null
if (-not $existingServer) {
  $devProcess = Start-Process -FilePath $npmCmd.Source -ArgumentList $devArgs -PassThru -WindowStyle Hidden -WorkingDirectory $projectRoot -RedirectStandardOutput $devOutLog -RedirectStandardError $devErrLog
}

try {
  $baseUrl = "http://$BindHost`:$Port"
  $ready = Wait-Server -Url "$baseUrl/login" -MaxSeconds $WaitSeconds
  if (-not $ready) {
    $outTail = if (Test-Path $devOutLog) { (Get-Content $devOutLog -Tail 40) -join "`n" } else { "" }
    $errTail = if (Test-Path $devErrLog) { (Get-Content $devErrLog -Tail 40) -join "`n" } else { "" }
    if ($devProcess -and $devProcess.HasExited) {
      throw "Dev server exited early with code $($devProcess.ExitCode).`n--- stdout ---`n$outTail`n--- stderr ---`n$errTail"
    }
    throw "Dev server was not ready within $WaitSeconds seconds."
  }

  if ($Suite -eq "smoke" -or $Suite -eq "all") {
    Write-Host "[runner] running smoke e2e"
    & node tests/e2e/http-smoke.mjs
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }

  if ($Suite -eq "ui" -or $Suite -eq "all") {
    Write-Host "[runner] running ui e2e"
    & node tests/e2e/ui-flow.mjs
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
}
finally {
  if (-not $existingServer -and $devProcess -and -not $devProcess.HasExited) {
    Stop-Process -Id $devProcess.Id -Force
  }
}
