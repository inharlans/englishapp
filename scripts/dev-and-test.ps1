param(
  [ValidateSet("smoke", "ui", "all")]
  [string]$Suite = "all",
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 3000,
  [int]$WaitSeconds = 120
)

$ErrorActionPreference = "Stop"

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

$devArgs = @("run", "dev", "--", "--hostname", $BindHost, "--port", "$Port")
$devProcess = Start-Process -FilePath npm -ArgumentList $devArgs -PassThru -WindowStyle Hidden

try {
  $baseUrl = "http://$BindHost`:$Port"
  $ready = Wait-Server -Url "$baseUrl/login" -MaxSeconds $WaitSeconds
  if (-not $ready) {
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
  if ($devProcess -and -not $devProcess.HasExited) {
    Stop-Process -Id $devProcess.Id -Force
  }
}
