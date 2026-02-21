# Iteration 91 (2026-02-21)

## 점검 범위
- MCP 실측 점검: `https://www.oingapp.com/offline/wordbooks/55`
- 오프라인 학습 화면의 상태 메시지 노출 방식 점검

## 확인된 리스크
1. 오프라인 학습 페이지에서도 성공 안내(`info`)가 없을 때 빈 초록 상태 박스가 상시 노출됨
2. 실제 피드백(오류/안내) 대비 시각적 집중도가 떨어지고, 불필요한 성공 상태가 보이는 문제가 발생

## 조치
- `app/offline/wordbooks/[id]/StudyClient.tsx`
  - 성공 상태 박스를 `info`가 있을 때만 렌더링하도록 조건부 처리

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
