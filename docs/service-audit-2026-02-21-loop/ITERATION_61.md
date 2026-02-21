# ITERATION 61 (2026-02-22)

## Scope
- MCP 실플레이 재검증: `/wordbooks/55/quiz-word?partSize=15&partIndex=1`
- 퀴즈 데이터 로딩 레이스 조건 점검 및 수정

## 관찰
- URL/입력의 파트 크기는 15인데, 초기 로딩 직후 `1파트 / 30개 단어`처럼 수치가 일시적으로 엇갈리는 케이스 확인
- 원인 후보: 파트 상태 변경 중 이전 요청 응답이 늦게 도착해 최신 상태를 덮어씀

## 적용한 개선점
1. `quizClient`에 `mountedRef` 추가
2. `quizClient`에 `requestSeqRef` 추가
3. `loadNext` 시작 시 요청 시퀀스 번호 증가
4. 큐 재출제 분기에서도 시퀀스 일치 여부 확인
5. 네트워크 응답 성공 분기에서 최신 시퀀스만 상태 반영
6. 예외 분기에서 최신 시퀀스만 오류 상태 반영
7. `finally`에서 최신 시퀀스만 `loading` 해제
8. 언마운트 시 `mountedRef=false` 처리로 안전성 보강

## 변경 파일
- `app/wordbooks/[id]/quiz/quizClient.tsx`

## 검증
- `npm run typecheck`
- `npm run lint`

