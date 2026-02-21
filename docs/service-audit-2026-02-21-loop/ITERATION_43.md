# ITERATION 43 (2026-02-21)

## 범위
- MCP 실측 기반 `/pricing`, `/terms`, `/privacy` 정책/결제 안내 페이지 안정화

## 변경 체크리스트 (10개)
- [x] `terms` 페이지 소스 인코딩 깨짐(모지바케) 복구
- [x] `privacy` 페이지 소스 인코딩 깨짐(모지바케) 복구
- [x] `terms` 제목/본문을 정상 한글 문구로 재작성
- [x] `privacy` 제목/본문을 정상 한글 문구로 재작성
- [x] `terms` 고객센터 fallback 값을 `준비 중`으로 통일
- [x] `privacy` 고객센터 fallback 값을 `준비 중`으로 통일
- [x] `/pricing` 고객센터 fallback 표기를 `준비 중`으로 통일
- [x] `/pricing` 결제 성공 메시지에 `role=status`/`aria-live` 부여
- [x] `/pricing` 결제 취소 메시지에 `role=status`/`aria-live` 부여
- [x] `/pricing` FAQ를 `dl/dt/dd` 구조로 보강해 질문/답변 의미 구조 개선

## 구현 파일
- `app/terms/page.tsx`
- `app/privacy/page.tsx`
- `app/pricing/page.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
