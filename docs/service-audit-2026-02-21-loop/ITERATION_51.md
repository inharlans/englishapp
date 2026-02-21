# ITERATION 51 (2026-02-22)

## 범위
- 전역 PWA 설치 배너 노출 범위 재조정 (`PwaInstallPrompt`)

## 변경 체크리스트 (10개)
- [x] PWA 배너 억제 경로 집합(`SUPPRESSED_PATHS`) 추가
- [x] `/login`에서 배너 억제
- [x] `/logout`에서 배너 억제
- [x] `/pricing`에서 배너 억제
- [x] `/terms`에서 배너 억제
- [x] `/privacy`에서 배너 억제
- [x] `/admin`에서 배너 억제
- [x] `/admin/*` 하위 경로 억제 처리 추가
- [x] 기존 학습 집중 경로(`STUDY_PATH_RE`) 억제 로직 유지
- [x] typecheck/lint 회귀 검증

## 구현 파일
- `components/PwaInstallPrompt.tsx`

## 검증
- `npm run typecheck` 통과
- `npm run lint` 통과
