# Chrome Web Store 제출용 스크린샷

아래 파일은 `docs/webstore/screenshots/` 기준으로 Chrome Web Store 업로드 순서를 고정한 제출 자산입니다.

1. `01-created.png` - 로그인 상태에서 저장 성공(`created`) 토스트가 표시된 화면
2. `02-duplicate.png` - 같은 단어 재저장 시 중복(`duplicate`) 토스트가 표시된 화면
3. `03-auth-required.png` - 비로그인 상태 저장 시 로그인 필요(401/403) 토스트가 표시된 화면

재생성 절차:

1. 로컬 서버를 `127.0.0.1:3000`으로 실행
2. `E2E_SECRET`를 주입한 뒤 `npm run test:e2e:clipper:extension` 실행
3. `E2E_SCREENSHOT_DIR=docs/webstore/screenshots`를 함께 주입해 스크린샷 파일 갱신

Privacy Policy URL(스토어 입력값):

- `https://www.oingapp.com/privacy`
