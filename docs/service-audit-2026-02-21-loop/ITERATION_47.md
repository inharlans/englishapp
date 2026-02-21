# ITERATION 47 (2026-02-22)

## 범위
- MCP 실측 기반 `/wordbooks/new` 입력 탭/테이블 접근성 보강

## 변경 체크리스트 (10개)
- [x] 입력 방식 버튼 그룹에 `role=tablist` 추가
- [x] 붙여넣기 버튼에 `tab` 역할/연결 속성 추가
- [x] 파일 업로드 버튼에 `tab` 역할/연결 속성 추가
- [x] 수동 입력 버튼에 `tab` 역할/연결 속성 추가
- [x] 붙여넣기 패널에 `tabpanel`/`aria-labelledby` 추가
- [x] 파일 업로드 패널에 `tabpanel`/`aria-labelledby` 추가
- [x] 수동 입력 패널에 `tabpanel`/`aria-labelledby` 추가
- [x] 파싱/초기화 버튼 로딩 중 비활성화 추가
- [x] 파일 업로드 input 로딩 중 비활성화 추가
- [x] 수동/검증 테이블에 `aria-label` 및 행 삭제 버튼 `aria-label` 추가

## 구현 파일
- `app/wordbooks/new/page.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
