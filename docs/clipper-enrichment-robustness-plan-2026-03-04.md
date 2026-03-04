# Clipper Enrichment Robustness Plan (2026-03-04)

## 목표
- `QUEUED -> PROCESSING -> DONE` 전이가 실제로 동작하는지 종단 검증한다.
- 실패 시 `attempts`/`error` 기록을 일관되게 남기고 재시도 정책을 확인한다.
- 운영자가 크론 1회 실행 결과를 바로 볼 수 있도록 요약/로그 관측성을 강화한다.

## 구현 계획
1. 내부 크론 서비스(`server/domain/internal/service.ts`)에 실행 요약 필드(`picked`, `succeeded`, `failed`, `skipped`, `durationMs`)를 추가한다.
2. 아이템 실패와 배치 실패를 `captureAppError`로 남겨 `itemId`, `attempt`, `reasonCode`, `error`를 추적 가능하게 만든다.
3. 기존 동시성 안전장치(`WHERE enrichmentStatus='QUEUED'` + claim 시 `PROCESSING` 전이)를 유지하고, 응답의 `skipped`로 경합 상황을 드러낸다.
4. `runClipperEnrichmentCron` 단위 테스트를 추가해 정상/실패/경합/빈큐 시나리오를 고정한다.
5. 운영 점검 시나리오 문서를 추가해 수동 검증 절차를 표준화한다.

## 작업 체크리스트
- [x] 크론 응답에 실행 요약 필드 추가
- [x] 배치 실패/아이템 실패 AppErrorEvent 기록 강화
- [x] 경합 시 중복 처리 방지 시나리오 테스트 추가
- [x] 실패 시 attempts 연계 로그 검증 테스트 추가
- [x] `DONE` 재처리 방지(빈 큐) 시나리오 테스트 추가
- [x] 운영자용 수동 점검 문서 추가
- [ ] 스테이징/운영에서 수동 호출 실측(환경 의존)
