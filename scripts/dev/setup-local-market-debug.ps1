param(
  [string]$ServerName = "englishapp-local",
  [string]$DebugEmail = "debug@local.oingapp",
  [string]$DebugPassword = "debug1234!"
)

$ErrorActionPreference = "Stop"

Write-Host "[local-market-debug] starting prisma dev server: $ServerName"
npx prisma dev -d -n $ServerName --debug | Out-Null

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
$localDbUrl = $builder.Uri.AbsoluteUri

$env:DATABASE_URL = $localDbUrl
$env:LOCAL_DEBUG_EMAIL = $DebugEmail
$env:LOCAL_DEBUG_PASSWORD = $DebugPassword

Write-Host "[local-market-debug] DATABASE_URL set to $($builder.Host):$($builder.Port) (pgbouncer=true, connection_limit=8)"
Write-Host "[local-market-debug] applying migrations"
npx prisma migrate deploy

Write-Host "[local-market-debug] seeding local market fixtures"
node scripts/dev/seed-local-market-minimal.mjs

Write-Host "[local-market-debug] done"
Write-Host "[local-market-debug] login: $DebugEmail / $DebugPassword"
