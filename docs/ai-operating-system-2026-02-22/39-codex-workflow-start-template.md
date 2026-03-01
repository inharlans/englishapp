# Codex Workflow Start Template (2026-02-23)

Back to [AGENTS.md](../../AGENTS.md)

## Purpose
Standardize task kickoff so Codex reproduces Claude-style routing/guardrail workflow consistently.

## Copy-Paste Start Prompt
```text
이 작업은 advanced-harness Codex workflow로 진행해.

1) 범위가 애매하니 먼저 $workflow-router를 실행해서
   Scope / BLOCK / REQUIRED / Suggested skills / Required checks 를 출력해줘.

2) 출력된 REQUIRED + checks 순서대로 작업해줘.
   - 구현/수정 중에는 AGENTS.md 규칙을 최우선으로 지켜.

3) 종료 전에 반드시 npm run codex:workflow:check를 실행하고
   결과 요약(통과/실패, 수정 내용, 남은 리스크)을 남겨줘.
```

## Operating Notes
- If BLOCK is returned, apply the guardrail skill first before editing.
- REQUIRED means "must apply when matched" but not hard-stop block.
- Do not claim verification without command execution evidence.
