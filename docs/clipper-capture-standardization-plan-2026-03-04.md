# Clipper Capture 표준화 계획서 / 체크리스트 (2026-03-04)

## 목표
- 확장자/모바일/웹에서 개인 캡처 저장 엔드포인트를 `POST /api/clipper/capture`로 표준화한다.
- `defaultWordbookId`가 없더라도 저장이 막히지 않도록 기본 단어장을 자동 부트스트랩한다.
- 저장 결과가 `WordbookItem` 생성 + `enrichmentStatus` 정책(`QUEUED`/`DONE`)에 맞게 일관되게 반영되도록 한다.

## 범위
- API 라우트: `app/api/clipper/capture/route.ts` 신규
- 서비스: `server/domain/clipper/service.ts` 확장
- 보안 allowlist: `lib/requestSecurity.ts` 경로 추가
- 최소 테스트: 서비스/보안 테스트 추가
- 문서: README 표준 엔드포인트/수동 테스트 시나리오 반영

## 설계 결정
- **표준 엔드포인트:** `POST /api/clipper/capture`
- **인증:** `requireTrustedUserMutation` 경유(`requireUserFromRequest` 포함, 모바일 bearer 허용)
- **wordbookId 결정 순서:**
  1) 요청 body `wordbookId`
  2) `User.defaultWordbookId`
  3) 없으면 기본 단어장 자동 연결(기존 소유 단어장 우선 연결, 없으면 새로 생성)
- **normalizedTerm:** `normalizeTermForKey` 사용
- **저장 정책:**
  - `meaning`/`context` 중 하나라도 비면 `QUEUED`
  - 둘 다 충분하면 `DONE`
- **중복 정책(권장안):** `@@unique([wordbookId, normalizedTerm])` 충돌 시
  - 409 대신 idempotent 병합
  - 기존 값이 비어 있거나 placeholder인 경우에만 새 값으로 보강
  - 응답은 성공(200)으로 기존 `itemId`와 최종 `enrichmentStatus` 반환

## 체크리스트
- [x] `/api/clipper/capture` 신규 라우트 구현
- [x] 모바일 bearer allowlist에 `/api/clipper/capture` 추가
- [x] `defaultWordbookId` null일 때 자동 부트스트랩 구현
- [x] 중복 저장 시 non-destructive 병합 정책 구현
- [x] `meaning` 없는 저장이 `QUEUED`로 반영되는지 검증
- [x] API 호출 후 `WordbookItem` 생성/응답 형식 검증
- [x] 최소 단위 테스트 추가(서비스/보안)
- [x] `npm run codex:workflow:check` 통과
- [x] README에 표준 엔드포인트 및 curl 예시 반영

## 수동 테스트 시나리오(curl)

### 1) 기본 저장 (meaning/context 없음 -> QUEUED)
```bash
curl -i -X POST "https://www.oingapp.com/api/clipper/capture" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MOBILE_ACCESS_TOKEN>" \
  -H "x-auth-mode: bearer" \
  -d '{
    "term": "abandoned",
    "sourceUrl": "https://example.com/article",
    "sourceTitle": "Example Article"
  }'
```

예상: `200/201` + `{ itemId, wordbookId, enrichmentStatus: "QUEUED" | "DONE" }`

### 2) 충분 정보 저장 (meaning + context -> DONE)
```bash
curl -i -X POST "https://www.oingapp.com/api/clipper/capture" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MOBILE_ACCESS_TOKEN>" \
  -H "x-auth-mode: bearer" \
  -d '{
    "term": "abandoned",
    "meaning": "버려진",
    "context": "The house was abandoned for years.",
    "sourceUrl": "https://example.com/article"
  }'
```

예상: `200/201` + `{ itemId, wordbookId, enrichmentStatus: "DONE" }`

### 3) 중복 단어 재저장 (idempotent 병합)
```bash
curl -i -X POST "https://www.oingapp.com/api/clipper/capture" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <MOBILE_ACCESS_TOKEN>" \
  -H "x-auth-mode: bearer" \
  -d '{
    "term": "abandoned",
    "meaning": "버려진",
    "context": "An abandoned place can feel eerie."
  }'
```

예상: `200` + 기존 `itemId` 반환, 기존 비어 있는 필드만 보강
