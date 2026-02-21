# Iteration 99 (2026-02-21)

## 점검 범위
- MCP 실측 점검: `https://www.oingapp.com/offline/wordbooks/55`
- 오프라인 학습 화면 키보드 단축키 처리(`StudyClient`) 점검

## 확인된 리스크
1. 전역 키보드 핸들러가 버튼/링크 포커스 상태에서도 동작할 수 있음
2. `Enter`/`Space` 입력 시 요소 기본 동작과 단축키 동작이 중첩되어 예측 불가능한 토글/이동이 발생할 여지 존재

## 조치
- `app/offline/wordbooks/[id]/StudyClient.tsx`
  - 키 이벤트 대상이 `input/textarea/select/button/a/contenteditable`(또는 해당 하위)인 경우 단축키 핸들러를 즉시 종료
  - 단축키는 비인터랙티브 영역 포커스일 때만 동작하도록 제한

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과

## 비고
- 결제 관련 경로/코드는 변경하지 않음
