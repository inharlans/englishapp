$ErrorActionPreference = "Stop"

try {
  $utf8 = [System.Text.UTF8Encoding]::new($false)
  $OutputEncoding = $utf8
  [Console]::InputEncoding = $utf8
  [Console]::OutputEncoding = $utf8

  $stdin = [Console]::OpenStandardInput()
  $ms = New-Object System.IO.MemoryStream
  $stdin.CopyTo($ms)
  $raw = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
  if ([string]::IsNullOrWhiteSpace($raw)) {
    $raw = [Console]::In.ReadToEnd()
  }
  if ([string]::IsNullOrWhiteSpace($raw)) {
    $raw = ($input | Out-String)
  }
  if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

  $payload = $raw | ConvertFrom-Json -ErrorAction Stop
  $sessionId = "$($payload.session_id)".Trim()
  $prompt = "$($payload.prompt)"
  if ([string]::IsNullOrWhiteSpace($sessionId) -or [string]::IsNullOrWhiteSpace($prompt)) { exit 0 }

  if ($prompt -match '\\u[0-9a-fA-F]{4}') {
    $prompt = [Regex]::Unescape($prompt)
  }
  $prompt = $prompt.Normalize([Text.NormalizationForm]::FormKC).ToLowerInvariant().Trim()
  function ContainsAny([string]$text, [string[]]$tokens) {
    foreach ($t in $tokens) {
      if (-not [string]::IsNullOrWhiteSpace($t) -and $text.Contains($t)) { return $true }
    }
    return $false
  }
  $koMajorTokens = @([Regex]::Unescape('\uAE30\uB2A5'), [Regex]::Unescape('\uAD6C\uD604'), [Regex]::Unescape('\uB9AC\uD329\uD130'), [Regex]::Unescape('\uB9C8\uC774\uADF8\uB808\uC774\uC158'), [Regex]::Unescape('\uC544\uD0A4\uD14D\uCC98'), [Regex]::Unescape('\uB300\uADDC\uBAA8'), [Regex]::Unescape('\uBCF5\uC7A1'))
  $koApproveTokens = @([Regex]::Unescape('\uACC4\uD68D'), [Regex]::Unescape('\uC2B9\uC778'))

  $stateDir = Join-Path $PSScriptRoot "state"
  if (-not (Test-Path $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir | Out-Null
  }
  $statePath = Join-Path $stateDir ("plan-gate-" + $sessionId + ".json")

  $isMajorTask = $prompt -match "(feature|implement|refactor|migration|architecture|multi-step|large|major|system|rollout|\uAE30\uB2A5|\uAD6C\uD604|\uB9AC\uD329\uD130|\uB9C8\uC774\uADF8\uB808\uC774\uC158|\uC544\uD0A4\uD14D\uCC98|\uB300\uADDC\uBAA8|\uBCF5\uC7A1)"
  $isApproval = $prompt -match "(plan approved|approve plan|implementation approved|go implement|approved plan|\uACC4\uD68D \uC2B9\uC778|\uC9C4\uD589 \uC2B9\uC778|\uC2B9\uC778 \uC644\uB8CC)"
  if (-not $isMajorTask -and (ContainsAny $prompt $koMajorTokens)) { $isMajorTask = $true }
  if (-not $isApproval -and $prompt.Contains($koApproveTokens[0]) -and $prompt.Contains($koApproveTokens[1])) { $isApproval = $true }

  if ($isApproval) {
    $approved = [ordered]@{
      requirePlan = $false
      updatedAt = (Get-Date).ToString("o")
      reason = "approved"
    } | ConvertTo-Json -Depth 4
    Set-Content -Path $statePath -Value $approved -Encoding utf8
    exit 0
  }

  if ($isMajorTask) {
    $state = [ordered]@{
      requirePlan = $true
      updatedAt = (Get-Date).ToString("o")
      reason = "major-task-detected"
      promptPreview = $prompt.Substring(0, [Math]::Min(160, $prompt.Length))
    } | ConvertTo-Json -Depth 4
    Set-Content -Path $statePath -Value $state -Encoding utf8

    Write-Output "PLAN GATE NOTICE"
    Write-Output "- Major task detected. Plan approval is required before code edits."
    Write-Output "- Run: planner -> plan-reviewer -> then send 'plan approved' before implementation."
  }
}
catch {
  exit 0
}

