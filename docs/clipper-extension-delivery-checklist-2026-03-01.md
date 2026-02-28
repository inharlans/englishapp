# Clipper Extension Delivery Checklist (2026-03-01)

## 목표
- 웹/확장 모두에서 설치 가능 상태 확보
- 확장 -> 브릿지 -> `/api/clipper/add` E2E 1개 고정
- Web Store unlisted 배포 준비 완료

## 실행 계획

### 1) 패키징/다운로드
- [x] `GET /api/clipper/extension` 다운로드 엔드포인트 추가
- [x] ZIP 생성 시 manifest 기반 allowlist + 필수 파일 검증 적용
- [x] `extension.zip` 로컬 빌드 스크립트 추가 (`npm run extension:zip`)

### 2) 설치 가이드 페이지
- [x] `/clipper/extension` 페이지 추가
- [x] 설치/테스트 절차 안내 추가
- [x] 스크린샷 체크 포인트(설치/옵션/동작 화면) 명시
- [x] 권한/업데이트 방법 섹션 추가

### 3) 확장 옵션 UI
- [x] `options.html` + `options.js` 추가
- [x] `bridgeOrigin` 저장/복원 UI 구현
- [x] storage 에러 처리 추가

### 4) Web Store Unlisted
- [ ] Chrome Web Store 개발자 계정/앱 생성
- [ ] unlisted 등록 및 테스트 그룹 초대
- [x] 실행 런북 초안 작성 (`docs/clipper-extension-webstore-unlisted-runbook.md`)
- [x] 스토어 설명/권한/스크린샷 메타데이터 템플릿 작성 (`docs/clipper-extension-webstore-metadata-template.md`)

### 5) E2E 고정
- [x] `웹 -> 확장 -> 브릿지 -> /api/clipper/add` 시나리오 1개 추가 (`tests/e2e/clipper-extension-flow.mjs`)
- [x] 로컬 실행 명령 문서화

## 진행 메모
- 현재 브랜치에 확장 관련 변경이 스테이징되어 있으며, 다른 세션 작업 파일은 stash로 격리.
- Web Store 등록은 계정 권한/콘솔 접근이 필요.

## 작업 원칙 (요청 반영)
- 체크리스트 단위(의미 있는 묶음)로 구현/검증 후 커밋합니다.
- 파일 수정 직후마다 커밋/푸시하지 않습니다.
- 커밋 기준 예시: "설치/옵션/UI + 스크립트 + E2E + 문서" 같이 테스트 가능한 묶음 완료 시.
