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
  $toolName = "$($payload.tool_name)".Trim()
  if ([string]::IsNullOrWhiteSpace($sessionId)) { exit 0 }

  if ($toolName -notmatch "^(Edit|Write|MultiEdit|NotebookEdit)$") { exit 0 }

  $toolInput = $payload.tool_input
  $targetPath = ""
  if ($toolInput -and $toolInput.file_path) { $targetPath = "$($toolInput.file_path)" }
  elseif ($toolInput -and $toolInput.path) { $targetPath = "$($toolInput.path)" }
  $targetPath = $targetPath.Replace("\\", "/")

  if ([string]::IsNullOrWhiteSpace($targetPath)) { exit 0 }
  if ($targetPath -match "(^|/)docs/") { exit 0 }
  if ($targetPath -match "(^|/)\\.claude/") { exit 0 }

  $isCodePath = $targetPath -match "(^|/)(app|components|lib|prisma|scripts|tests)/" -or
    $targetPath -match "(^|/)(middleware\\.ts|next\\.config\\.ts|package\\.json|tsconfig\\.json)$"
  if (-not $isCodePath) { exit 0 }

  $statePath = Join-Path (Join-Path $PSScriptRoot "state") ("plan-gate-" + $sessionId + ".json")
  if (-not (Test-Path $statePath)) { exit 0 }

  $state = Get-Content -Raw $statePath | ConvertFrom-Json -ErrorAction Stop
  if (-not $state.requirePlan) { exit 0 }

  [Console]::Error.WriteLine("PLAN GATE BLOCKED")
  [Console]::Error.WriteLine("Major-task session requires approved plan before code edits.")
  [Console]::Error.WriteLine("Required sequence: planner -> plan-reviewer -> send 'plan approved'.")
  [Console]::Error.WriteLine("Allowed now: editing docs and planning artifacts.")
  exit 2
}
catch {
  # Fail open
  exit 0
}

