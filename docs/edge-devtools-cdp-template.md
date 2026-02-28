# Edge CDP 연결 템플릿

목적: `chrome-devtools` MCP를 Chrome 대신 Microsoft Edge(CDP)로 안정적으로 연결하기 위한 고정 템플릿입니다.

## 1) Edge 원격 디버깅 실행

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-edge-devtools.ps1
```

기본 포트: `9333`

확인:

```text
http://127.0.0.1:9333/json
```

## 2) MCP 설정 템플릿

### `opencode.json`

```json
{
  "mcp": {
    "chrome-devtools": {
      "type": "local",
      "command": [
        "cmd",
        "/c",
        "npx",
        "-y",
        "chrome-devtools-mcp@latest",
        "--browser-url=http://127.0.0.1:9333"
      ],
      "enabled": true
    }
  }
}
```

### `.codex/config.toml`

```toml
[mcp.servers."chrome-devtools"]
command = "npx"
args = ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9333"]
```

## 3) 실패 시 빠른 점검

- Edge가 `--remote-debugging-port=9333`로 실제 실행 중인지 확인
- `http://127.0.0.1:9333/json/version` 응답 확인
- 사내 보안 정책/백신이 로컬 포트 바인딩을 막는지 확인
- 같은 포트를 다른 프로세스가 점유 중인지 확인

## 4) 포트 변경 템플릿

`9333` 대신 다른 포트를 쓰려면, 아래 세 곳을 같은 값으로 맞춥니다.

- `scripts/start-edge-devtools.ps1`의 `--remote-debugging-port`
- `opencode.json`의 `--browser-url=http://127.0.0.1:<port>`
- `.codex/config.toml`의 `--browser-url=http://127.0.0.1:<port>`
