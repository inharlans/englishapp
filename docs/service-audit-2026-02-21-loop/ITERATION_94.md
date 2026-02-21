# Iteration 94 (2026-02-21)

## 점검 범위
- MCP 실측 점검: `https://www.oingapp.com/offline/wordbooks/abc`
- 오프라인 학습 상세(`offline/wordbooks/[id]`)의 잘못된 ID 처리 흐름 점검

## 확인된 리스크
1. 잘못된 ID에서도 학습 레이아웃(제목/단축키/섞기 버튼)을 먼저 렌더링한 뒤 클라이언트 에러만 표시됨
2. 사용자는 학습 가능한 화면처럼 오해할 수 있고, 오류 원인/복귀 동선이 즉시 드러나지 않음

## 조치
- `app/offline/wordbooks/[id]/page.tsx`
  - 서버 단계에서 ID를 선검증
  - 잘못된 ID면 즉시 오류 안내와 `/offline` 복귀 링크를 반환
  - 유효한 ID에만 `StudyClient`를 렌더링

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
