# ITERATION 34 (2026-02-21)

## 범위
- 카드 외 영역 확장 점검/개선: `/wordbooks/[id]/list-*`

## 변경 체크리스트 (10개)
- [x] 리스트 파트 이동 경계 메시지 보강(`첫 파트입니다`/`마지막 파트입니다`)
- [x] 키보드 `[`/`]` 경계 처리 일관화
- [x] `info` 상태 메시지 자동 정리(3.5초)
- [x] 모바일 파트 선택 `select` 추가
- [x] 파트 이동 버튼에 `처음`/`마지막` 추가
- [x] 버튼 이동 시 경계 조건 메시지 보강
- [x] 현재 파트 요약에 `남은 파트 n개` 표시 추가
- [x] 모바일에서도 파트별 매칭 수를 선택지에 표시
- [x] 파트 이동 후 기존 info 정리 일관화
- [x] `/list-correct`, `/list-wrong`, `/list-half` 공통 클라이언트에 일괄 반영

## 구현 파일
- `components/wordbooks/WordbookListClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
