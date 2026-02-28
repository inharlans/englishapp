$ErrorActionPreference = 'Stop'

$edgeExeCandidates = @(
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe"
)

$edgeExe = $edgeExeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edgeExe) {
  Write-Error 'msedge.exe를 찾을 수 없습니다. Microsoft Edge 설치를 확인하세요.'
  exit 1
}

$userDataDir = 'C:\tmp\edge-mcp-profile'
New-Item -ItemType Directory -Force -Path $userDataDir | Out-Null

$arguments = @(
  '--remote-debugging-port=9333',
  "--user-data-dir=$userDataDir",
  '--no-first-run',
  '--new-window'
)

$cmd = "msedge.exe --remote-debugging-port=9333 --user-data-dir=`"$userDataDir`" --no-first-run --new-window"

Start-Process -FilePath $edgeExe -ArgumentList $arguments | Out-Null

Write-Host 'Edge MCP용 디버깅 프로필이 시작되었습니다.'
Write-Host '실행 후 아래 주소에서 디버깅 엔드포인트 확인: http://127.0.0.1:9333/json 확인'
Write-Host ''
Write-Host '실행 커맨드:'
Write-Host $cmd
