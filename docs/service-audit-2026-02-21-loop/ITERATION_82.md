# Iteration 82 (2026-02-21)

## 점검 범위
- MCP 점검: `https://www.oingapp.com/wordbooks/blocked`
- 차단 목록 노출 정보 확인

## 확인된 리스크
1. 차단 목록 카드에 내부 식별자(`ownerId`)가 `#숫자` 형태로 그대로 노출됨
2. 사용자에게 직접적인 가치가 없는 내부 ID 노출은 정보 최소화 원칙에 어긋남

## 조치
- `app/wordbooks/blocked/page.tsx`
  - 카드 제목에서 `ownerId` 표시 제거
  - 마스킹 이메일만 노출해 사용자 인지에 필요한 정보만 유지

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
