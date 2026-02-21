# 15회차 점검 보고서 (2026-02-21)

## 점검 방식 (MCP)
- MCP Playwright로 `https://www.oingapp.com/wordbooks/market` 진입
- 마켓 카드 클릭으로 `/wordbooks/55` 상세 이동
- 상세에서 `/wordbooks/55/memorize`, `/wordbooks/55/quiz-meaning` 순서로 실제 탭 이동/입력 점검

## 발견/반영 체크리스트 (10건)
1. 퀴즈 정답률 표기가 `0/1`처럼 표시되어 시도 0건 상태를 오해하게 함 -> `corrects/attempts` 그대로 표기
2. 파트 진행률이 세션 전체 정답/오답 기준으로 계산돼 파트 단위 진행률과 불일치 -> `partAttempts` 상태로 파트 기준 진행률 계산
3. 파트 변경 시 진행 카운트가 이전 파트 값을 유지함 -> 파트 변경 시 `partAttempts` 초기화
4. 파트 크기(n) 변경 시 파트 진행 카운트가 유지되어 혼동 -> 크기 변경 시 `partAttempts` 초기화
5. 퀴즈에서 키보드 단축키가 부족해 풀이 속도가 느림 -> `/` 입력 포커스, `S` 건너뛰기, `N` 다음 추가
6. 건너뛰기 액션 후 상태 피드백이 없어 흐름 인지가 어려움 -> `문제를 건너뛰었습니다.` 메시지 추가
7. 파트 전환 UI가 숫자 버튼/셀렉트만 있어 연속 학습 시 불편 -> `이전 파트`/`다음 파트` 버튼 추가
8. 정답 입력 길이 제한이 없어 비정상 장문 입력 가능 -> `maxLength=120` 추가
9. 세션 상태(시도/정답/오답/현재 파트 풀이량) 즉시 확인이 어려움 -> 라이브 상태 라인 추가
10. 퀴즈 미로그인 시 로그인 후 원래 퀴즈 페이지로 복귀되지 않음 -> `next=/wordbooks/{id}/quiz-*` 복귀 경로 반영

## 수정 파일
- `app/wordbooks/[id]/quiz/quizClient.tsx`
- `app/wordbooks/[id]/quiz-meaning/page.tsx`
- `app/wordbooks/[id]/quiz-word/page.tsx`

## 검증 결과
- `npm run typecheck`: pass
- `npm run lint`: pass
- Railway 배포 확인: 커밋/푸시 후 확인 예정

## 다음 회차 우선순위
1. MCP로 `/wordbooks/[id]/quiz-word` 직접 풀이(정답/오답/다시풀기/다음) 검증
2. `/wordbooks/[id]` 상세의 페이지네이션에서 학습 탭 복귀 컨텍스트 유지 개선
