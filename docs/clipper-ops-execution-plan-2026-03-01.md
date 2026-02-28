# 클리퍼 운영/관측 실행 계획서 (2026-03-01)

## 목적
- 확장 -> 단어/예문 저장 -> 큐 누적 -> Gemini enrichment -> DB 반영 플로우를 운영 가능한 형태로 고정한다.
- Plan 결과물을 실행 가능한 체크리스트/산출물로 변환한다.

## 범위
- P0: enrichment reason 단일 소스 + 크론 결과 reasonCounts
- P1: 운영 메트릭 API + SQL 집계 + 캐시 정책
- P2: 스케줄러(gh cron)에서 clipper-enrichment 호출
- P3: 부분 완료 품질 관측 강화

## 불변 규칙
- 클리퍼 저장 API는 즉시 `QUEUED` 저장 원칙 유지
- 큐 상태는 `QUEUED -> PROCESSING -> DONE|FAILED`를 유지
- 실패 사유 코드는 단일 소스(`enrichmentReason.ts`)로만 관리
- 운영 메트릭 API는 기본 no-cache, 운영 부하 시 5분 캐시 전환

## 상태 전이 규칙
| 현재 | 이벤트/조건 | 다음 | 업데이트 |
|---|---|---|---|
| 없음 | `/api/clipper/add` 저장 성공 | QUEUED | `enrichmentStatus=QUEUED`, `enrichmentQueuedAt=now` |
| QUEUED | claim 성공 | PROCESSING | `enrichmentStatus=PROCESSING`, `enrichmentStartedAt=now`, `enrichmentAttempts+=1` |
| PROCESSING | Gemini/parse 성공 | DONE | 의미/품사/예문 반영, `enrichmentCompletedAt=now` |
| PROCESSING | 배치 실패 + fallback 성공 | DONE | fallback 결과 반영, `partOfSpeech=UNKNOWN` |
| PROCESSING | 배치 실패/파싱 실패/항목 누락 | FAILED | `enrichmentError=CODE[:detail]`, `enrichmentCompletedAt=now` |
| FAILED | backoff 만료 && attempts < max | QUEUED | 재큐잉 |
| FAILED | attempts >= max | FAILED(terminal) | 상태 유지(알림 대상) |

## 운영 대시보드 필수 지표(12)
1. `queue.backlog.queued`
2. `queue.backlog.processing`
3. `queue.wait_ms.p50/p95`
4. `queue.process_ms.p50/p95`
5. `queue.throughput.done_per_hour`
6. `enrich.success_rate`
7. `enrich.failure_rate`
8. `enrich.failure_reason.topN`
9. `enrich.retry_rate`
10. `enrich.retry_success_rate`
11. `enrich.terminal_failed`
12. `ux.done_latency_ms.p95`

## SQL 산출물 목록
- backlog 조회 SQL
- wait/process p50/p95 SQL
- throughput(시간당 done/failed) SQL
- success/failure rate SQL
- failure reason TopN SQL
- retry/retry success/terminal SQL
- UX done latency p95 SQL
- token/char estimate SQL(근사치)

## 알림 임계치 정책
- Warn: Slack
- Critical: Pager + Slack
- 동일 알림 30분 억제
- Critical은 10분 연속 초과 시 발송

| 항목 | Warn | Critical | 윈도우 |
|---|---:|---:|---|
| QUEUED backlog | > 500 | > 2000 | 10분 |
| wait p95 | > 180000ms | > 600000ms | 15분 |
| process p95 | > 30000ms | > 90000ms | 15분 |
| success rate | < 0.97 | < 0.90 | 30분 |
| RATE_LIMIT 비율 | > 5% | > 15% | 15분 |
| terminal failed | > 20 | > 100 | 1시간 |
| UX done latency p95 | > 300000ms | > 900000ms | 30분 |

## 캐시 정책
- 기본: no-cache
- 전환 조건: DB CPU 70% 이상이 5분 이상 지속
- 전환 동작: 메트릭 API 5분 TTL 캐시 적용

## 구현 체크리스트

### P0. Reason 코드 단일화
- [ ] `server/domain/internal/enrichmentReason.ts` 추가
- [ ] `service.ts`/`repository.ts`에서 하드코딩 reason 제거
- [ ] `enrichmentError`를 `CODE[:detail]` 형식으로 통일
- [ ] 크론 응답에 `reasonCounts` 추가

### P1. 메트릭 API + SQL
- [ ] `GET /api/internal/ops/clipper-metrics` 라우트 추가
- [ ] 내부 인증/권한 적용
- [ ] 12개 핵심 지표 응답 구조 구현
- [ ] SQL 집계 함수/리포지토리 추가
- [ ] `window`, `includeSeries`, `refresh` 파라미터 지원
- [ ] 캐시 모드 응답 필드(`cache.mode/hit/ttlSec`) 추가

### P2. 스케줄러
- [ ] `.github/workflows/cron-jobs.yml`에 `clipper-enrichment` step 추가
- [ ] 실패 시 상태코드/본문 출력 및 workflow fail 처리

### P3. 품질/부분완료
- [ ] DONE 품질(complete/partial) 계산 지표 추가
- [ ] 운영 응답에 partial 비율 포함

### 검증/문서
- [ ] `npm run codex:workflow:check` 실행
- [ ] 필요시 관련 테스트 실행
- [ ] README 최근 업데이트 항목 반영

## 롤백 기준
- 메트릭 API 쿼리로 DB 부하 급상승 시: 즉시 5분 캐시 ON
- 배치 실패율 30분 평균 2배 이상 상승 시: reason 상세 집계만 비활성화
- clipper-enrichment cron step가 연속 실패 시: step만 임시 비활성화(다른 cron 유지)

## 완료 정의
- P0~P3 체크리스트 완료
- 운영 지표 API에서 12개 지표 확인 가능
- 스케줄러에서 clipper-enrichment가 자동 호출됨
- codex workflow check 통과
