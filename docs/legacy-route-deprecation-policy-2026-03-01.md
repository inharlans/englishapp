# 레거시 경로 격리/폐기 정책 (2026-03-01)

## 목적
- 레거시 API/페이지를 제거 전까지 안전하게 호환한다.
- 모든 레거시 경로는 호출량을 관측하고, 합의된 제거 일정에 따라 단계적으로 폐기한다.

## 공통 원칙
- 신규 구현은 반드시 대체 경로를 사용한다.
- 레거시 API는 `Deprecation`, `Sunset`, `X-Legacy-*` 헤더를 포함한다.
- 레거시 API 호출은 JSON 로그 이벤트 `legacy_route_access`로 집계한다.
- 정책 요약 페이지: `/legacy-policy`

## 정책표

| 대상 경로 | 대체 경로 | 처리 방식 | 유지 기간 | 제거 예정일 | fallback 문서 URL |
| --- | --- | --- | --- | --- | --- |
| `/api/quiz/submit` | `/api/wordbooks/{id}/quiz/submit` | `200 + deprecation` | 2026-06-30까지 | 2026-09-30 | `/legacy-policy#api-quiz-submit` |
| `/api/words` | `/api/wordbooks/{id}/items` | `200 + deprecation` | 2026-06-30까지 | 2026-09-30 | `/legacy-policy#api-words` |
| `/api/words/{id}` | `/api/wordbooks/{id}/items/{itemId}` | `200 + deprecation` | 2026-06-30까지 | 2026-09-30 | `/legacy-policy#api-words-id` |
| `/api/words/import` | `/api/wordbooks/{id}/import` | `200 + deprecation` | 2026-06-30까지 | 2026-09-30 | `/legacy-policy#api-words-import` |
| `/quiz-word` | `/wordbooks` | `307` | 2026-06-30까지 | 2026-09-30 | `/legacy-policy` |
| `/quiz-meaning` | `/wordbooks` | `307` | 2026-06-30까지 | 2026-09-30 | `/legacy-policy` |
| `/list-correct` | `/wordbooks` | `307` | 2026-06-30까지 | 2026-09-30 | `/legacy-policy` |
| `/list-wrong` | `/wordbooks` | `307` | 2026-06-30까지 | 2026-09-30 | `/legacy-policy` |
| `/list-half` | `/wordbooks` | `307` | 2026-06-30까지 | 2026-09-30 | `/legacy-policy` |

## 운영 체크
- 주 1회 `legacy_route_access` 상위 경로 호출량 점검
- 제거 후보 조건: 최근 14일 호출량 0건 + 대체 경로 호출 안정
- 제거 전 공지: 릴리즈 노트/README 최근 업데이트 섹션 반영
