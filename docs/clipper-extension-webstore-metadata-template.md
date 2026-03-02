# Clipper Extension Web Store 메타데이터 템플릿

## 기본 정보
- 아이템 이름: EnglishApp PDF Clipper
- 요약 설명(132자 이내): 웹/PDF에서 드래그한 영어 단어를 EnglishApp 단어장으로 바로 추가하는 보조 확장 프로그램
- 카테고리: Productivity
- 공개 범위: Unlisted

## 상세 설명(초안)
EnglishApp PDF Clipper는 브라우저에서 선택한 영어 단어를 EnglishApp 단어장에 빠르게 저장할 수 있도록 돕는 확장 프로그램입니다.

주요 기능:
- 페이지에서 단어를 드래그하면 `단어장에 추가` 버튼 노출
- 버튼 클릭 시 탭 이동 없이 `POST /api/clipper/add`로 즉시 저장
- 저장 결과를 토스트(`created`/`duplicate`/`auth-required`/`error`)로 즉시 피드백
- 옵션 페이지에서 `bridgeOrigin`을 환경별로 설정 가능

필수 권한 안내:
- `storage` only: 옵션(`bridgeOrigin`) 저장/복원을 위해 사용
- 콘텐츠 스크립트 대상: `https://www.oingapp.com/*`, `https://oingapp.com/*`, `https://127.0.0.1/*`, `https://localhost/*`, `http://127.0.0.1/*`, `http://localhost/*`
- `web_accessible_resources(page-bridge.js)` 대상: `https://www.oingapp.com/*`, `https://oingapp.com/*`, `https://127.0.0.1/*`, `https://localhost/*`, `http://127.0.0.1/*`, `http://localhost/*`
- 운영 안내 문구: Englishapp(oingapp) 페이지에서 동작하며, 로컬 디버그는 localhost/127.0.0.1 범위에서만 지원

개인정보/보안:
- 로그인은 EnglishApp 웹 애플리케이션에서 처리
- 확장 내부에 사용자 비밀번호를 저장하지 않음
- 저장 요청은 사용자가 버튼을 누른 경우에만 전송

## 스토어 제출 체크리스트
- [ ] 아이콘(128x128 포함) 업로드
- [ ] 스크린샷 3장 업로드
  - [ ] 설치 화면 (`chrome://extensions`)
  - [ ] 옵션 화면 (`bridgeOrigin` 저장)
  - [ ] 동작 화면 (드래그 후 플로팅 버튼)
- [ ] 상세 설명/권한 설명 입력
- [ ] 지원 URL/개인정보처리방침 URL 확인
- [ ] Unlisted 설정 확인

## 릴리즈 노트 템플릿
- 초기 배포: 웹/PDF에서 선택 단어를 EnglishApp 단어장으로 추가하는 기본 기능 제공
- 옵션 페이지에서 `bridgeOrigin` 설정 지원
- 설치/테스트 가이드 페이지(`/clipper/extension`) 제공
