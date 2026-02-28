# Clipper Extension Web Store (Unlisted) Runbook

## 준비물
- Chrome Web Store Developer 계정
- 결제 완료된 개발자 등록 상태
- 테스트 그룹으로 초대할 Google 계정 목록

## 배포 절차
1. `npm run extension:zip` 실행 후 `dist/extension/` 산출물 확인
2. Chrome Web Store Dashboard에서 새 아이템 생성
3. ZIP 업로드 후 권한/설명/스크린샷 입력 (`docs/clipper-extension-webstore-metadata-template.md` 참고)
4. Visibility를 `Unlisted`로 설정
5. 테스트 그룹 계정으로 설치 링크 공유

## 점검 항목
- 설치 후 옵션 페이지에서 `bridgeOrigin` 설정 가능 여부
- `/clipper/extension-fixture`와 일반 문서에서 `단어장에 추가` 버튼 노출 여부
- 브릿지 페이지(`/clipper/add`)에서 `created` 또는 `duplicate` 응답 확인

## 롤백
- Dashboard에서 즉시 배포 취소
- 이전 안정 버전 ZIP 재업로드
