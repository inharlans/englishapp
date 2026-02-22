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
  $prompt = "$($payload.prompt)"
  if ([string]::IsNullOrWhiteSpace($prompt)) { exit 0 }

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

  $koPlanningTokens = @([Regex]::Unescape('\uACC4\uD68D'), [Regex]::Unescape('\uD50C\uB79C'), [Regex]::Unescape('\uC124\uACC4'), [Regex]::Unescape('\uC544\uD0A4\uD14D\uCC98'))
  $koReviewTokens = @([Regex]::Unescape('\uAC80\uD1A0'), [Regex]::Unescape('\uB9AC\uBDF0'))
  $koRefactorTokens = @([Regex]::Unescape('\uB9AC\uD329\uD130'), [Regex]::Unescape('\uB9AC\uD329\uD1A0\uB9C1'), [Regex]::Unescape('\uAD6C\uC870 \uAC1C\uC120'), [Regex]::Unescape('\uCF54\uB4DC \uC815\uB9AC'))
  $koFrontendTokens = @([Regex]::Unescape('\uD504\uB860\uD2B8 \uC5D0\uB7EC'), [Regex]::Unescape('\uB9AC\uC561\uD2B8 \uC5D0\uB7EC'), [Regex]::Unescape('\uB7F0\uD0C0\uC784 \uC5D0\uB7EC'), [Regex]::Unescape('\uCF58\uC194 \uC5D0\uB7EC'))
  $koResearchTokens = @([Regex]::Unescape('\uB9AC\uC11C\uCE58'), [Regex]::Unescape('\uCC3E\uC544\uBD10'), [Regex]::Unescape('\uC870\uC0AC'), [Regex]::Unescape('\uAC80\uC0C9'), [Regex]::Unescape('\uAE43\uD5C8\uBE0C \uC774\uC288'))
  $koDocsTokens = @([Regex]::Unescape('\uBB38\uC11C'), [Regex]::Unescape('\uBB38\uC11C\uD654'), [Regex]::Unescape('\uB9AC\uB4DC\uBBF8'), [Regex]::Unescape('\uD578\uB4DC\uC624\uD504'))

  $recommend = New-Object System.Collections.Generic.List[string]

  $hasHangul = $prompt -match "[\uAC00-\uD7AF]"
  $isPlanning = $prompt -match "(^|\W)(plan|planning|roadmap|design|architecture|\uACC4\uD68D|\uD50C\uB79C|\uC124\uACC4|\uC544\uD0A4\uD14D\uCC98)(\W|$)"
  $isPlanReview = $prompt -match "(plan.*review|review.*plan|proposal review|strategy review|\uACC4\uD68D.*\uAC80\uD1A0|\uD50C\uB79C.*\uAC80\uD1A0|\uB9AC\uBDF0)"
  $isTsError = $prompt -match "(typescript|tsc|type error|compile error|build error|ts\\d{4}|\uD0C0\uC785 \uC5D0\uB7EC|\uCEF4\uD30C\uC77C \uC5D0\uB7EC|\uBE4C\uB4DC \uC5D0\uB7EC)"
  $isComplexBuild = $prompt -match "(feature|implement|refactor|migration|end-to-end|multi-step|large|major|\uAE30\uB2A5|\uAD6C\uD604|\uB9AC\uD329\uD130|\uB9C8\uC774\uADF8\uB808\uC774\uC158|\uB300\uADDC\uBAA8|\uBCF5\uC7A1)"
  $isRefactor = $prompt -match "(refactor|restructure|cleanup|technical debt|code smell|module split|\uB9AC\uD329\uD130|\uB9AC\uD329\uD1A0\uB9C1|\uAD6C\uC870 \uAC1C\uC120|\uCF54\uB4DC \uC815\uB9AC)"
  $isFrontendError = $prompt -match "(frontend error|react error|runtime error|console error|hydration|ui bug|browser error|\uD504\uB860\uD2B8 \uC5D0\uB7EC|\uB9AC\uC561\uD2B8 \uC5D0\uB7EC|\uB7F0\uD0C0\uC784 \uC5D0\uB7EC|\uCF58\uC194 \uC5D0\uB7EC|ui \uBC84\uADF8)"
  $isAuthRoute = $prompt -match "(auth route|authentication route|401|403|jwt|cookie auth|login api|forbidden|unauthorized|\uC778\uC99D \uB77C\uC6B0\uD2B8|\uC778\uC99D \uC624\uB958|\uB85C\uADF8\uC778 api|\uAD8C\uD55C \uC5C6\uC74C|\uC778\uC99D \uC2E4\uD328)"
  $isRouteTest = $prompt -match "(route test|endpoint test|api test|integration test route|verify endpoint|\uB77C\uC6B0\uD2B8 \uD14C\uC2A4\uD2B8|\uC5D4\uB4DC\uD3EC\uC778\uD2B8 \uD14C\uC2A4\uD2B8|api \uD14C\uC2A4\uD2B8|\uAC80\uC99D)"
  $isWebResearch = $prompt -match "(research|look up|investigate online|find discussions|github issue|stackoverflow|reddit|\uB9AC\uC11C\uCE58|\uCC3E\uC544\uBD10|\uC870\uC0AC|\uAC80\uC0C9|\uAE43\uD5C8\uBE0C \uC774\uC288)"
  $isDocsWork = $prompt -match "(document|documentation|readme|write docs|api docs|handoff|\uBB38\uC11C|\uBB38\uC11C\uD654|\uB9AC\uB4DC\uBBF8|\uD578\uB4DC\uC624\uD504)"
  $isArchReview = $prompt -match "(architecture review|code review|design review|review implementation|best practices review|\uC544\uD0A4\uD14D\uCC98 \uB9AC\uBDF0|\uCF54\uB4DC \uB9AC\uBDF0|\uC124\uACC4 \uB9AC\uBDF0|\uAD6C\uD604 \uB9AC\uBDF0)"

  if (-not $isPlanning -and (ContainsAny $prompt $koPlanningTokens)) { $isPlanning = $true }
  if (-not $isPlanReview -and (ContainsAny $prompt $koReviewTokens)) { $isPlanReview = $true }
  if (-not $isRefactor -and (ContainsAny $prompt $koRefactorTokens)) { $isRefactor = $true }
  if (-not $isFrontendError -and (ContainsAny $prompt $koFrontendTokens)) { $isFrontendError = $true }
  if (-not $isWebResearch -and (ContainsAny $prompt $koResearchTokens)) { $isWebResearch = $true }
  if (-not $isDocsWork -and (ContainsAny $prompt $koDocsTokens)) { $isDocsWork = $true }

  if ($isPlanning) { $recommend.Add("planner") }
  if ($isPlanReview) { $recommend.Add("plan-reviewer") }
  if ($isTsError) { $recommend.Add("auto-error-resolver") }
  if ($isRefactor) { $recommend.Add("refactor-planner") }
  if ($isRefactor -and ($prompt -match "(execute refactor|apply refactor|perform refactor|implement refactor)")) {
    $recommend.Add("code-refactor-master")
  }
  if ($isFrontendError) { $recommend.Add("frontend-error-fixer") }
  if ($isAuthRoute) { $recommend.Add("auth-route-debugger") }
  if ($isRouteTest) { $recommend.Add("auth-route-tester") }
  if ($isWebResearch) { $recommend.Add("web-research-specialist") }
  if ($isDocsWork) { $recommend.Add("documentation-architect") }
  if ($isArchReview) { $recommend.Add("code-architecture-reviewer") }

  if ($recommend.Count -eq 0 -and $isComplexBuild) {
    $recommend.Add("planner")
    $recommend.Add("plan-reviewer")
  }

  if ($recommend.Count -eq 0 -and $hasHangul) {
    $recommend.Add("planner")
    $recommend.Add("plan-reviewer")
  }

  if ($recommend.Count -eq 0) {
    $recommend.Add("planner")
  }

  $unique = $recommend | Select-Object -Unique
  $agentLines = $unique | ForEach-Object { "- $_ (`".claude/agents/$_.md`")" }

  Write-Output "SUBAGENT ROUTER (englishapp)"
  Write-Output "Recommended agents:"
  $agentLines | ForEach-Object { Write-Output $_ }
  Write-Output ""
  Write-Output "Execution policy:"
  Write-Output "- For multi-step work, run planner first."
  Write-Output "- Before implementation, run plan-reviewer for risky plans."
  Write-Output "- For TypeScript compile issues, run auto-error-resolver then re-run tsc."
  Write-Output "- For refactoring, start with refactor-planner before code-refactor-master."
  Write-Output "- For frontend runtime/build errors, prioritize frontend-error-fixer."
  Write-Output "- For auth and route failures, run auth-route-debugger then auth-route-tester."
  Write-Output "- For unclear or ecosystem issues, run web-research-specialist."
  Write-Output "- For final write-up, use documentation-architect."
}
catch {
  exit 0
}
