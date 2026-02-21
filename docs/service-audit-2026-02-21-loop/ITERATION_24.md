# ITERATION 24 (2026-02-21)

## 범위
- 카드 학습 경로 추가 안정화: `/wordbooks/[id]/cards`

## 변경 체크리스트 (10개)
- [x] 카드 데이터 페이징 로드를 병렬 요청으로 전환해 초기 진입 지연 완화
- [x] 비동기 요청 경합 방지(request sequence)로 stale 응답 덮어쓰기 차단
- [x] 단축키 안내에 `PageUp/PageDown` 파트 이동 추가
- [x] 모바일 파트 선택용 `select` 추가
- [x] 이전/다음 파트 버튼에 이동 대상 aria-label 추가
- [x] 파트 직접 이동 입력 onBlur 정규화(유효 범위 clamp)
- [x] 파트/전체 진행률 바에 `role=progressbar` + `aria-valuenow` 보강
- [x] 에러 시 인라인 `다시 시도` 액션 추가
- [x] 다시 시도는 `reloadTick` 기반으로 안전하게 재요청
- [x] 카드 로드 완료 안내 메시지 정리

## 구현 파일
- `app/wordbooks/[id]/cards/wordbookCardsClient.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
