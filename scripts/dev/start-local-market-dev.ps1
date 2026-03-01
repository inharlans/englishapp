param(
  [string]$ServerName = "englishapp-local",
  [string]$DebugEmail = "debug@local.oingapp",
  [string]$DebugPassword = "debug1234!",
  [string]$E2eSecret = ""
)

$ErrorActionPreference = "Stop"

. "$PSScriptRoot/setup-local-market-debug.ps1" -ServerName $ServerName -DebugEmail $DebugEmail -DebugPassword $DebugPassword

$lsOutput = npx prisma dev ls | Out-String
$match = [regex]::Match($lsOutput, "prisma\+postgres://localhost:\d+/\?api_key=([^\u0007\s]+)")
if (-not $match.Success) {
  throw "Unable to parse prisma dev DATABASE_URL from 'prisma dev ls' output."
}

$apiKey = $match.Groups[1].Value
$decodedJson = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String(($apiKey.Replace('-', '+').Replace('_', '/').PadRight([Math]::Ceiling($apiKey.Length / 4) * 4, '='))))
$dbInfo = $decodedJson | ConvertFrom-Json
$rawDbUrl = [string]$dbInfo.databaseUrl

$uri = [Uri]$rawDbUrl
$query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
$query["pgbouncer"] = "true"
$query["sslmode"] = "disable"
$query.Remove("single_use_connections")
$query["connection_limit"] = "8"
$builder = New-Object System.UriBuilder($uri)
$builder.Query = $query.ToString()
$env:DATABASE_URL = $builder.Uri.AbsoluteUri
if ($E2eSecret) {
  $env:E2E_SECRET = $E2eSecret
  Write-Host "[local-market-dev] E2E_SECRET configured for internal e2e login"
}

Write-Host "[local-market-dev] starting Next.js dev server with local DB"
npm run dev
