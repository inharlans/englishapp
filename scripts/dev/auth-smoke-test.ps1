param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$Email = "admin@example.com",
  [string]$Password = "change-me-now-123",
  [string]$BootstrapToken = $env:AUTH_BOOTSTRAP_TOKEN
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $BootstrapToken) {
  throw "Missing BootstrapToken (set AUTH_BOOTSTRAP_TOKEN or pass -BootstrapToken)"
}

$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "1) Bootstrap user (idempotent; 409 if already bootstrapped)"
try {
  Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$BaseUrl/api/auth/bootstrap" `
    -Headers @{ "x-bootstrap-token" = $BootstrapToken } `
    -ContentType "application/json" `
    -Body (@{ email=$Email; password=$Password } | ConvertTo-Json) | Out-Null
} catch {
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 409) {
    Write-Host "   already bootstrapped"
  } else {
    throw
  }
}

Write-Host "2) Login"
Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$BaseUrl/api/auth/login" -WebSession $sess `
  -ContentType "application/json" `
  -Body (@{ email=$Email; password=$Password } | ConvertTo-Json) | Out-Null

Write-Host "3) Call protected API"
Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/words?mode=memorize&batch=1&page=0&hideCorrect=true&week=1" -WebSession $sess | Out-Null

Write-Host "4) Logout"
Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$BaseUrl/api/auth/logout" -WebSession $sess | Out-Null

Write-Host "OK"

