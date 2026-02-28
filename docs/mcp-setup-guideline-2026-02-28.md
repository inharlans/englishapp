# OpenCode MCP 설정 가이드라인 (실행용)

이 문서는 `englishapp`에서 MCP를 직접 붙여보려는 운영자를 위한 실전 가이드입니다.

## 0) 전제
- 지금 목표는 "내가 직접 MCP 연결 확인"입니다.
- 우선 read-only 성격 MCP부터 연결하고, write 권한은 나중에 열어야 안전합니다.
- 권장 시작 세트(이 프로젝트 기준):
  - `github`
  - `context7`
  - `playwright`
  - `chrome-devtools`
  - `postgres` (read-only)

## 1) 설치/상태 확인

### A. OpenCode CLI가 있는 경우
```bash
opencode --version
opencode mcp list
```

### B. Browser 세션에서 확인
- 우측 상단 MCP 영역에 서버명이 표시되는지 확인
- 비어 있으면 아래 6단계 설치 후 세션을 재시작

## 2) 로컬에서 CMD/Powershell로 바로 시작하기

- 공통 원칙: `opencode.json`은 로컬 우선값이므로, 프로젝트 루트에서 실행해야 한다.
- 핵심 포인트: `postgres`/`sentry`/`context7` MCP는 `.env` 또는 세션 env 값을 런타임에 읽는 래퍼로 동작한다.
  - `postgres`: `scripts/ops/start-postgres-mcp.cmd`
  - `sentry`: `scripts/ops/start-sentry-mcp.cmd`
  - `context7`: `scripts/ops/start-context7-mcp.cmd`

### PowerShell

```powershell
Set-Location "C:\dev\englishapp"

# 민감 값은 실제 값으로 치환해서 사용
$env:GITHUB_TOKEN = "YOUR_GITHUB_TOKEN"
$env:SENTRY_ACCESS_TOKEN = "YOUR_SENTRY_TOKEN"
$env:UPSTASH_CONTEXT7_API_KEY = "YOUR_CONTEXT7_API_KEY"

# DB URL은 .env에서 자동 로드되며, 필요하면 아래처럼 직접 지정 가능
$env:DATABASE_URL = "postgres://..."

opencode mcp list --print-logs
```

### CMD

```cmd
cd /d C:\dev\englishapp

rem 민감 값은 실제 값으로 치환해서 사용
set GITHUB_TOKEN=YOUR_GITHUB_TOKEN
set SENTRY_ACCESS_TOKEN=YOUR_SENTRY_TOKEN
set UPSTASH_CONTEXT7_API_KEY=YOUR_CONTEXT7_API_KEY

rem DB URL은 .env에서 자동 로드되며, 필요하면 아래처럼 직접 지정 가능
set DATABASE_URL=postgres://...

opencode mcp list --print-logs
```

- 점검 방법: 위 명령 실행 후 출력에 `postgres`, `github`, `sentry`, `prisma`, `playwright`, `context7`, `chrome-devtools`가 모두 `connected`로 표시되는지 확인한다.
- 실패 시: 값이 비어 있거나 공백만 있을 경우 해당 MCP만 `ERR_INVALID_URL`/`missing` 계열로 빠르게 실패한다.

## 3) 설정 파일 방식 (수동)

공식 문서 기준으로는 `opencode.json` 또는 `opencode.jsonc`에 MCP를 선언합니다.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "context7": {
      "type": "local",
      "enabled": true,
      "command": ["npx", "-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]
    },
    "web-browser": {
      "type": "remote",
      "enabled": false,
      "url": "https://example.com/mcp",
      "headers": {
        "BROWSER_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

## 4) CLI 방식 (권장)

대부분은 CLI가 더 빠르고 실수도 적습니다.

```bash
opencode mcp add
opencode mcp list
```

OAuth가 필요한 서버는:

```bash
opencode mcp auth <name>
```

## 5) 서버별 최소 권한 원칙

### github
- 시작 권한: read 위주 (`repo:read`, `actions:read`)
- `issues:write`, `pull_requests:write`는 필요 시만 추가

### postgres
- production은 read-only 계정만 사용
- DDL/DROP/TRUNCATE 금지

### playwright / chrome-devtools
- 테스트 계정/테스트 URL 중심으로 사용
- 쿠키/헤더 로그의 민감정보 노출 주의

### context7
- read-only API 키 사용

## 6) 연결 검증 체크리스트
- [ ] `opencode mcp list`에 서버가 표시됨
- [ ] Browser 우측 상단 MCP에 서버명 노출
- [ ] 각 서버에서 간단한 호출 1회 성공
- [ ] 오류 로그(권한/네트워크/명령어) 없음

## 7) 실패 시 4단계 점검
1. 세션 재시작
2. 설정 파일 경로 일치 확인
3. `npx` 실행 가능 여부 확인
4. MCP 시작 로그에서 실제 에러 확인

관련 문서:
- `docs/mcp-1minute-checklist-2026-02-28.md`
- `docs/mcp-browser-screen-checkpoints-2026-02-28.md`
- `docs/mcp-access-policy-2026-02-28.md`

## 8) 이 프로젝트에서의 참고점
- 현재 레포에는 별도 Codex 설정 파일도 존재합니다: `.codex/config.toml`
- Browser 세션이 비어 보이는 경우, "설정 파일은 있는데 세션에서 로드 실패" 케이스가 많습니다.
- 먼저 최소 1개(`chrome-devtools`) 연결부터 확인한 뒤, 나머지를 순차적으로 붙이세요.
