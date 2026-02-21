# 16회차 점검 보고서 (2026-02-21)

## 점검 방식 (MCP)
- MCP Playwright로 `https://www.oingapp.com/wordbooks/55/quiz-word` 진입
- 실제 입력(`zzz`) 후 제출, 파트 이동/건너뛰기/상태 변화 관찰
- 네트워크/응답 확인: `/api/wordbooks/55/quiz`, `/api/wordbooks/55/quiz/submit`

## 발견/반영 체크리스트 (10건)
1. 오답 제출 시 피드백이 바로 사라지는 구조적 버그 발견(오답 큐 상태 변경 -> `loadNext` effect 재실행) -> `retryQueueRef` 기반으로 큐 소비 로직 분리
2. `loadNext` 의존성에 `retryQueue`가 있어 불필요 재호출 유발 -> 의존성 제거 및 ref 동기화로 안정화
3. 키보드로 파트 전환이 어려움 -> `[` 이전 파트, `]` 다음 파트 단축키 추가
4. 단축키 안내가 실제 지원 기능과 일치하지 않음 -> 안내 문구에 `[`/`]` 반영
5. 파트 버튼 목적 전달이 약함 -> 파트 버튼 `aria-label` 보강(선택 상태 포함)
6. 로딩 문구 접근성 부족 -> `role=status`/`aria-live` 부여
7. 정답 입력에서 자동완성/자동대문자/맞춤법 보정으로 오입력 가능 -> `autoComplete=off`, `autoCapitalize=none`, `spellCheck=false`
8. 입력 모드(의미/단어)별 답안 규칙이 즉시 드러나지 않음 -> 입력 아래 모드 안내 문구 추가
9. 상태 요약에 오답 큐 길이가 없어 재출제 예상이 어려움 -> `오답 큐 N` 표시 추가
10. 파트 단축키 동작 시 상태 초기화 일관성 부족 -> 파트 전환 시 `partAttempts`/피드백/메시지 리셋 일관 적용

## 수정 파일
- `app/wordbooks/[id]/quiz/quizClient.tsx`

## 검증 결과
- `npm run typecheck`: pass
- `npm run lint`: pass
- Railway 배포 확인: 커밋/푸시 후 확인 예정

## 다음 회차 우선순위
1. MCP로 배포 반영 후 오답 제출 시 피드백 유지 여부 재검증
2. `/wordbooks/[id]/cards`와 퀴즈 간 전환 시 컨텍스트(파트/밀도/표시모드) 유지 보강
