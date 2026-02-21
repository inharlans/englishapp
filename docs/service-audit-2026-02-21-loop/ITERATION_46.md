# ITERATION 46 (2026-02-22)

## 범위
- MCP 실측 기반 `/wordbooks/blocked`, `/logout` 개선

## 변경 체크리스트 (10개)
- [x] 차단 목록 페이지 제목 용어를 `블랙리스트`에서 `차단 목록`으로 통일
- [x] 차단 목록 설명 문구를 `차단` 기준으로 정리
- [x] 비로그인 상태에서 `로그인하러 가기(next 포함)` 링크 제공
- [x] 빈 상태 문구에 `role=status`/`aria-live` 추가
- [x] 차단 목록 컨테이너에 `role=list`/`listitem` 구조 추가
- [x] 차단일 표기를 `toISOString`에서 `Asia/Seoul` 날짜 포맷으로 변경
- [x] 차단 해제 버튼 로딩 상태 `aria-busy` 추가
- [x] 차단 해제 성공 메시지(`role=status`) 추가
- [x] 차단 해제 오류 메시지 `role=alert` 추가
- [x] 로그아웃 실패 시 오류 메시지 노출 및 상태 문구(`aria-live`) 보강

## 구현 파일
- `app/wordbooks/blocked/page.tsx`
- `app/wordbooks/blocked/unblockOwnerButton.tsx`
- `app/logout/page.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
