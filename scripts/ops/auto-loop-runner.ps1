param(
  [int]$IntervalMinutes = 9,
  [string]$CycleCommand = "npm run typecheck",
  [int]$TimeoutMinutes = 15,
  [int]$MaxConsecutiveFailures = 3,
  [string]$LogPath = ".\auto-loop.log"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($IntervalMinutes -lt 1) {
  throw "IntervalMinutes must be >= 1."
}
if ($TimeoutMinutes -lt 1) {
  throw "TimeoutMinutes must be >= 1."
}
if ($MaxConsecutiveFailures -lt 1) {
  throw "MaxConsecutiveFailures must be >= 1."
}

$logDir = Split-Path -Parent $LogPath
if ($logDir -and -not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}
if (-not (Test-Path $LogPath)) {
  New-Item -ItemType File -Path $LogPath | Out-Null
}

function Write-Log {
  param(
    [string]$Message
  )

  $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $line = "[$ts] $Message"
  Write-Host $line
  Add-Content -Path $LogPath -Value $line
}

function Invoke-Cycle {
  param(
    [string]$Command
  )

  Write-Log ""
  Write-Log "Cycle started"
  Write-Log "Command: $Command"
  Write-Log "Timeout: $TimeoutMinutes minute(s)"

  # cmd.exe /c is more robust for chained commands (&&, ;, quoted args).
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = "cmd.exe"
  $startInfo.Arguments = "/c $Command"
  $startInfo.WorkingDirectory = (Get-Location).Path
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo
  [void]$process.Start()

  $timeout = New-TimeSpan -Minutes $TimeoutMinutes
  $exited = $process.WaitForExit([int]$timeout.TotalMilliseconds)

  if (-not $exited) {
    Write-Log "Cycle timed out -> killing process tree"
    try {
      $process.Kill($true)
    } catch {
      Write-Log "Kill failed: $($_.Exception.Message)"
    }
    return 124
  }

  $code = $process.ExitCode
  if ($code -eq 0) {
    Write-Log "Cycle succeeded (exit code 0)"
  }
  else {
    Write-Log "Cycle failed (exit code $code)"
  }

  return $code
}

Write-Log "Auto loop started"
Write-Log "- Interval: $IntervalMinutes minute(s)"
Write-Log "- Cycle command: $CycleCommand"
Write-Log "- Timeout: $TimeoutMinutes minute(s)"
Write-Log "- Max consecutive failures: $MaxConsecutiveFailures"
Write-Log "- Log: $LogPath"
Write-Log "- Stop with Ctrl + C"

$consecutiveFailures = 0
$script:StopRequested = $false
try {
  $script:CancelHandler = [ConsoleCancelEventHandler]{
    param($sender, $eventArgs)
    $script:StopRequested = $true
    Write-Log "Stop requested (Ctrl+C) -> exiting after current step"
    $eventArgs.Cancel = $true
  }
  [Console]::add_CancelKeyPress($script:CancelHandler)
} catch {
  Write-Log "CancelKeyPress handler unavailable in this host -> $($_.Exception.Message)"
}

while (-not $script:StopRequested) {
  $exitCode = Invoke-Cycle -Command $CycleCommand

  if ($exitCode -eq 0) {
    $consecutiveFailures = 0
  } else {
    $consecutiveFailures++
    Write-Log "Consecutive failures: $consecutiveFailures / $MaxConsecutiveFailures"

    if ($consecutiveFailures -ge $MaxConsecutiveFailures) {
      Write-Log "Reached MaxConsecutiveFailures -> stopping loop"
      break
    }
  }

  if ($script:StopRequested) {
    break
  }

  Write-Log ""
  Write-Log "Waiting $IntervalMinutes minute(s) before next cycle..."
  Start-Sleep -Seconds ($IntervalMinutes * 60)
}

if ($script:CancelHandler) {
  try {
    [Console]::remove_CancelKeyPress($script:CancelHandler)
  } catch {
    Write-Log "CancelKeyPress handler cleanup failed -> $($_.Exception.Message)"
  }
}
