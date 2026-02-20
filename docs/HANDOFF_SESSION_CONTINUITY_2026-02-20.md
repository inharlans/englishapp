# 세션 연속 작업 체크리스트 (2026-02-20)

이 문서는 **2026-02-20** 기준, 새 Codex 세션에서 바로 이어서 작업하기 위한 인수인계 가이드다.

## 1) 완료된 작업

- 퀴즈 채점 정규화 개선 반영
  - `...에서` 같은 표기 변형을 의미 후보로 인식하도록 개선
  - 파일: `lib/text.ts`, `lib/text.test.ts`
- 의미 퀴즈 오답 피드백 개선 반영
  - 오답 시 `허용 답안 예` 노출
  - 파일: `app/api/wordbooks/[id]/quiz/submit/route.ts`, `app/wordbooks/[id]/quiz/quizClient.tsx`
- 퀴즈 UX 일부 개선 반영
  - 모바일 파트 선택 드롭다운 추가
  - 오답 시 `다시 풀기` 버튼 추가
  - 파일: `app/wordbooks/[id]/quiz/quizClient.tsx`
- 의미 데이터 정제 스크립트 정리
  - 파일: `scripts/cleanse-meaning-quality.mjs`
- 품질/빌드 검증 완료
  - `npm run test -- lib/text.test.ts` 통과
  - `npm run typecheck` 통과
  - `npm run build` 통과
- 원격 반영 완료
  - 브랜치: `main`
  - 커밋: `ea36d06` (`퀴즈 채점 정규화 및 피드백/모바일 동선 개선`)
- Task Master 설정 완료
  - Codex MCP: `task-master-ai` 등록 완료 (`TASK_MASTER_TOOLS=core`)
  - 프로젝트 초기화: `.taskmaster/config.json` 생성
  - 모델 구성: `main/research/fallback` 모두 `codex-cli` 기반으로 설정

## 2) 아직 해야 할 작업 (미완료)

### A. 결제(PortOne) 마무리
- 상태:
  - `PORTONE_CHANNEL_KEY` 미설정
  - PortOne 콘솔에서 채널 생성 직전까지 진행됨
  - 사업자 정보/긴급 연락처 미완료 시 채널 저장이 막힐 수 있음
- 남은 일:
  1. PortOne에서 사업자/연락처 필수 정보 저장
  2. 테스트 채널 생성(토스 기준: MID/시크릿/클라이언트 키 입력)
  3. 생성된 `CHANNEL_KEY` 복사
  4. Railway에 `PORTONE_CHANNEL_KEY` 추가 후 배포
  5. `/pricing` 결제 성공/취소/플랜 반영 검증

### B. 퀴즈 개선안 잔여 항목(P1 이상)
- 세션 내 오답 재출제 큐(현재는 “다시 풀기” 수동 버튼만 반영됨)
- 채점 진단 이벤트/대시보드(이의 가능 오답률 추적)
- 오답 상세 근거 메시지 고도화(입력값 vs 허용 후보 diff)

### C. Task Master MCP 실사용 세팅
- 상태:
  - Codex MCP 등록 완료 (`task-master-ai`)
  - 환경변수는 `TASK_MASTER_TOOLS=core`만 등록된 상태
- 남은 일:
  1. 실제 사용할 모델/API 키 전략 확정
  2. 필요 시 `codex mcp remove/add`로 env 재등록
  3. 새 세션에서 도구 로드 확인 후 초기화 명령 실행

## 3) 새 세션 시작 직후 실행 순서 (권장)

1. 저장소 최신화
```bash
git pull origin main
```

2. MCP 로드 상태 확인
```bash
codex mcp list
codex mcp get task-master-ai
```

3. 프로젝트 기본 검증
```bash
npm run typecheck
npm run test -- lib/text.test.ts
```

4. 결제 마무리 우선 진행
- PortOne 콘솔에서 채널 생성 완료
- Railway `PORTONE_CHANNEL_KEY` 반영

5. 결제 플로우 검증
- `/pricing` 월간/연간 진입
- 성공 리다이렉트 및 사용자 플랜 갱신 확인
- 취소 플로우 확인

## 4) 작업별 상세 체크리스트

### 결제 마무리 체크리스트
- [ ] PortOne 사업자 정보 저장 완료
- [ ] PortOne 긴급 연락처 업데이트 완료
- [ ] 테스트 채널 생성 완료
- [ ] `CHANNEL_KEY` 확보 완료
- [ ] Railway `PORTONE_CHANNEL_KEY` 반영 완료
- [ ] 배포 후 `/pricing` 성공/취소 시나리오 통과

### 퀴즈 품질 체크리스트
- [ ] 의미 오답 시 허용 답안 예 표시 재확인
- [ ] `at`-`에서` 케이스 정답 처리 재검증
- [ ] 오답 목록의 품사/뜻 자연성 샘플 점검
- [ ] 필요 시 `npm run wordbooks:cleanse-meaning-quality:apply` 실행
- [ ] 품질 리포트 재확인(`npm run wordbooks:report-meaning-quality`)

### MCP(Task Master) 체크리스트
- [ ] 새 세션에서 MCP 서버가 보이는지 확인
- [ ] 도구 호출 가능 여부 확인
- [ ] 프로젝트 태스크 초기화/동기화 루틴 확정

## 5) 자주 쓰는 명령어

```bash
# 현재 MCP 상태
codex mcp list
codex mcp get task-master-ai

# Task Master MCP 재등록 (필요 시)
codex mcp remove task-master-ai
codex mcp add task-master-ai --env TASK_MASTER_TOOLS=core -- npx -y task-master-ai@latest

# 품질 정제/리포트
npm run wordbooks:cleanse-meaning-quality:apply
npm run wordbooks:report-meaning-quality

# 안정성 검증
npm run typecheck
npm run test -- lib/text.test.ts
npm run build
```

## 6) 다음 세션 첫 프롬프트 템플릿

아래 문구를 새 세션 시작 시 그대로 붙여넣으면 이어서 진행하기 쉽다:

```text
docs/HANDOFF_SESSION_CONTINUITY_2026-02-20.md 기준으로 이어서 진행해.
우선 결제(PortOne CHANNEL_KEY) 마무리부터 하고, 끝나면 퀴즈 P1 개선(오답 재출제 큐, 채점 진단 이벤트) 순서로 진행해.
각 단계 끝날 때 테스트/검증 결과와 남은 TODO를 갱신해.
```
