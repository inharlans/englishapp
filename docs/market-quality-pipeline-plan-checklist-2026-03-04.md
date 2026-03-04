# 마켓 단어장 품질 파이프라인 작업 계획서/체크리스트 (2026-03-04)

## 작업 목표

- 마켓의 공개/추천 노출 기준을 운영 가능한 정책으로 고정한다.
- 업로드된 `WordbookItem` 품질(`enrichmentStatus`)을 노출 기준에 반영할 수 있는 최소 코드 경로를 만든다.
- 운영자가 즉시 점검 가능한 품질 점검 쿼리와 액션 가이드를 문서화한다.

## 범위

- 코드
  - `GET /api/wordbooks/market`에 품질 필터 파라미터(`quality`) 추가
  - 마켓 조회 SQL에 curated 품질 조건(기본값은 `all`) 추가
- 문서
  - 마켓 노출/운영 정책 문서 신설
  - 운영 점검 SQL/Prisma 예시 추가

## 결정 사항

- 기본 필터: `quality=all` (기존 동작 호환)
- 옵트인 필터: `quality=curated`
- curated 기준(1차)
  - `hiddenByAdmin = false`
  - `isPublic = true`
  - 최소 단어 수 충족(기존 정책 유지)
  - `enrichmentStatus = DONE` 비율 80% 이상
  - `ratingCount` 최소 3 이상

## 구현 체크리스트

- [x] 정책 문서 초안 작성 (`docs/market-quality-policy.md`)
- [x] 계획/체크리스트 문서 생성 (현재 문서)
- [x] 마켓 API에 `quality` 파라미터 파싱 추가
- [x] 도메인 계약/서비스에 `quality` 전달
- [x] 저장소 SQL에 curated 품질 조건 추가
- [x] 운영 점검 쿼리(SQL/Prisma) 문서화
- [x] README 최근 업데이트 반영
- [x] `npm run codex:workflow:check` 실행

## 검증 계획

1. 타입/린트/테스트 게이트: `npm run codex:workflow:check`
2. 수동 확인(필요 시)
   - `GET /api/wordbooks/market?quality=all`
   - `GET /api/wordbooks/market?quality=curated`
   - `quality=curated`가 `ratingCount`/DONE 비율 조건을 적용하는지 샘플 데이터로 확인
