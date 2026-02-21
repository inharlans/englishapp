# Iteration 72 (2026-02-21)

## 점검 범위
- MCP Playwright 실동작 점검: `https://www.oingapp.com/wordbooks/market`
- 마켓 필터 폼의 검색 입력 접근성 상태 점검

## 확인된 리스크
1. 검색 입력 접근 이름이 과도하게 길게 노출됨
2. 원인: 검색 라벨 내부에 도움말 문구까지 포함되어 스크린리더 라벨이 `검색 + 도움말` 전체로 결합됨
3. MCP 스냅샷에서 검색 입력명이 `검색 제목/설명/제작자 이메일로 검색할 수 있습니다.`로 확인됨

## 조치
- `app/wordbooks/market/page.tsx`
  - 검색 필드를 wrapper `label` 구조에서 `label[htmlFor] + input[id] + help text` 구조로 분리
  - 접근 이름은 `검색`으로 유지하고, 설명은 `aria-describedby`로만 제공

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
