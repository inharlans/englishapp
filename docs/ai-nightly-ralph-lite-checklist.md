# Ralph-Lite Nightly Checklist (englishapp)

## A. 도입 체크리스트 (구현)
- [ ] `ai/nightly-YYYYMMDD` 브랜치 자동 생성/체크아웃 스크립트 준비
- [ ] 야간 지시서 파일 준비 (`docs/ai-nightly-instructions.md`)
- [ ] 1회 사이클 실행 스크립트 준비 (새 세션 기준)
- [ ] 루프 상태 파일 설계 (`.loop/nightly-state.json`)
- [ ] `npm run compact:sync` 선행 실행 연결
- [ ] `npm run codex:workflow:check` 강제 연결
- [ ] 게이트 실패 시 커밋 금지 로직 적용
- [ ] 연속 실패/반복 횟수 상한 로직 적용
- [ ] 변경량 상한 감지 로직 적용
- [ ] README/운영 문서에 사용법 반영

## B. 야간 실행 체크리스트 (매일 밤)
- [ ] 현재 브랜치가 `ai/nightly-*`인지 확인
- [ ] `main` 직접 반영 차단 상태 확인
- [ ] 지시서 최신화 확인
- [ ] `compact-context` 최신화 확인
- [ ] 루프 제한값(횟수/실패/변경량) 확인
- [ ] 야간 실행 시작
- [ ] 종료 후 리포트 파일 생성 확인

## C. 아침 검토 체크리스트 (매일 아침)
- [ ] `git log --oneline main..HEAD` 확인
- [ ] `git diff --stat main...HEAD` 확인
- [ ] AI 차이 분석 결과 확인
- [ ] `npm run codex:workflow:check` 재검증
- [ ] 로컬 핵심 시나리오 검증
- [ ] 개발 서버 핵심 시나리오 검증
- [ ] 민감 영역(인증/결제/배포/시크릿) 비의도 변경 확인
- [ ] 최종 결정 기록:
  - [ ] Merge
  - [ ] Partial merge
  - [ ] Hold
  - [ ] Drop

## D. 운영 규칙 체크
- [ ] PR 자동 생성은 OFF 유지
- [ ] main 직접 push 없음
- [ ] 실패 원인 로그가 남아 있음
- [ ] 회귀 가능성 항목이 문서화됨
