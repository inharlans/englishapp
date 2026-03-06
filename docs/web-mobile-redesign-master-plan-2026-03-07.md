# 웹·앱 리디자인 마스터 플랜

기준일: 2026-03-07  
대상 리포지토리:
- `C:\dev\englishapp` (웹)
- `C:\dev\englishapp-mobile` (모바일 앱)

## 1. 문서 목적

- 이 문서는 웹과 앱 리디자인을 실제로 수행하는 에이전트와 개발자를 위한 기준 문서다.
- 디자인 방향, 구현 규칙, 체크리스트, 최종 완료 기준을 한곳에 고정한다.
- 구현자는 이 문서를 우선 기준으로 삼고, 개별 화면에서 임의로 색·간격·컴포넌트 규칙을 새로 만들지 않는다.

## 2. 기준 자료

- 주요 기준 영상:
  - `https://www.youtube.com/watch?v=uos3e3r6wGY`
  - 제목 확인: `바이브코딩 결과물, 3초만에 들통나는 이유`
- 확인된 챕터:
  - `0:12 현실 — 기능은 되는데 디자인이...`
  - `0:39 해답 — 규칙이 필요한 이유`
  - `0:50 규칙 1 — 컬러를 직접 고르지 마세요`
  - `1:11 Coolors 사이트 활용법`
  - `1:35 규칙 2 — 딱 2색만 써라`
  - `2:18 규칙 3 — Stitch 사용법`
  - `2:53 규칙 4 — MCP로 디자인하지 마라`
  - `3:42 규칙 5 — Skills 활용법`
  - `4:21 규칙 6 — Claude 영문 프롬프트 팁`
  - `4:40 보너스 — MUI vs shadcn/ui`
  - `5:30 실전 순서 정리`
  - `6:13 흔한 실수 주의`
- 구현 참고 자료:
  - `https://ui.shadcn.com/`
  - `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- 기존 내부 문서 입력값:
  - `docs/design-system-unification-plan-2026-03-05.md`
  - `docs/design-system-component-spec-v1.md`
  - `docs/design-system-platform-mapping-v1.md`
  - `docs/ai-operating-system-2026-02-22/40-site-improvement-proposal-20260223.md`

## 3. 배경과 문제 정의

- 현재 웹은 `shadcn/ui`, 커스텀 `.ui-*` 클래스, 개별 페이지 하드코딩 스타일이 함께 존재한다.
- 현재 모바일은 `src/theme/*` 토큰이 있지만, 화면 단위에서 `colors.*`, `spacing.*`, `typography.*`를 직접 소비하는 비율이 높다.
- 두 제품 모두 기능은 작동하지만, 다음 문제가 남아 있다.
  - 첫 화면에서 핵심 행동이 즉시 보이지 않는 구간이 있다.
  - 화면마다 정보 밀도와 버튼 우선순위가 다르다.
  - 색상과 상태 표현이 규칙형 시스템보다 페이지별 예외 처리에 가깝다.
  - “AI가 그럴듯하게 만든 화면”처럼 보이는 징후가 남아 있다.
- 이번 작업의 목적은 “화려함”이 아니라 “규칙 기반의 명확한 제품 경험”이다.

## 4. 이번 개편에서 잠근 결정사항

- 브랜드 범위: 부분 리브랜딩
- 시스템 범위: 웹과 앱은 플랫폼별 독립 경험
- 모바일 방향: 네이티브 중심
- 테마 범위: 라이트 우선
- 웹 컴포넌트 정책: `MUI` 도입 금지, `shadcn/ui + semantic wrapper` 사용
- 디자인 결정 정책:
  - MCP에 최종 디자인 결정을 맡기지 않는다.
  - 색상은 즉흥적으로 추가하지 않는다.
  - 영어 프롬프트로 탐색할 수는 있지만, 최종 UI 문구는 한국어로 고정한다.

## 5. 핵심 원칙

### 5.1 영상 기준 원칙

- 컬러를 임의로 고르지 않는다.
- 브랜드 핵심색은 2개만 사용한다.
- 레퍼런스와 생성 도구는 탐색용으로만 사용하고, 구현은 토큰과 규칙으로 다시 쓴다.
- 디자인 작업에도 스킬과 룰을 강제한다.
- 웹은 `shadcn/ui` 중심으로 정리한다.

### 5.2 제품 원칙

- 한 화면의 1차 CTA는 1개만 가장 강하게 보이게 한다.
- 2차 액션은 최대 2개까지만 노출한다.
- 사용자 문구는 항상 `현재 상태 + 다음 행동 1개` 형식으로 정리한다.
- 학습 앱답게 “빠른 이해, 빠른 선택, 빠른 재진입”을 우선한다.
- 장식은 정보 구조를 돕는 수준만 허용한다.

## 6. 디자인 방향

### 6.1 웹

- 아트디렉션: `Editorial Study Desk`
- 방향:
  - 종이 같은 바탕
  - 얇은 그리드/메시 질감
  - 깊은 블루와 브라스 골드의 2색 중심
  - 강한 타이포와 절제된 카드 레이어
  - `shadcn/ui` 프리미티브 위에 semantic wrapper를 얹는 구조

### 6.2 모바일

- 아트디렉션: `Native Study Coach`
- 방향:
  - 큰 제목과 grouped surface
  - 네이티브 리듬의 spacing
  - 과도한 시각 장식 금지
  - 카드, 시트, 상태 패널 중심
  - 학습 플로우를 명확히 보여주는 구조

## 7. 시각 시스템 규격

### 7.1 웹 컬러

- `Ink`: `#18324B`
- `Brass`: `#C4872F`
- `Paper`: `#FBF8F2`
- `Surface`: `#FFFDF9`
- `Mist`: `#EEF3F7`
- `Border`: `#D9E1E8`
- `Text`: `#14202B`
- `TextMuted`: `#596675`
- `Success`: `#2E6F56`
- `Warning`: `#8F6500`
- `Danger`: `#B64A4A`

### 7.2 모바일 컬러

- `DeepNavy`: `#1B3A57`
- `Gold`: `#B98133`
- `GroupedBg`: `#F5F2EB`
- `Card`: `#FFFCF8`
- `SecondarySurface`: `#EDF2F7`
- `Divider`: `#D7DEE6`
- `Text`: `#162531`
- `TextMuted`: `#5F6B78`
- `Success`: `#2F6A55`
- `Warning`: `#8E6709`
- `Danger`: `#B34C4A`

### 7.3 공통 규칙

- 브랜드 강조색은 플랫폼당 2개만 허용한다.
- 소셜 로그인 브랜드 색은 공급자 버튼에서만 예외 허용한다.
- 상태색은 `info/success/warning/danger`로 고정한다.
- 페이지마다 임의의 hex를 추가하지 않는다.

### 7.4 타이포

- 웹
  - `H1`: `56/62`, `800`
  - `H2`: `40/48`, `800`
  - `H3`: `28/36`, `700`
  - `Body`: `16/26`
  - `Caption`: `13/20`
- 모바일
  - `LargeTitle`: `34/41`, `700`
  - `Title1`: `28/34`, `700`
  - `Title2`: `22/28`, `700`
  - `Body`: `16/24`
  - `Caption`: `13/18`

### 7.5 간격과 반경

- 웹 spacing: `4 / 8 / 12 / 16 / 24 / 32 / 48`
- 모바일 spacing: `4 / 8 / 12 / 16 / 24 / 32 / 40`
- 웹 radius: `12 / 16 / 24 / pill`
- 모바일 radius: `14 / 18 / 28 / pill`

### 7.6 모션

- duration: `140ms / 220ms / 320ms`
- 웹: reveal, hover lift, focus 강조 정도만 허용
- 모바일: opacity/transform 위주만 허용
- `prefers-reduced-motion` 대응 필수

## 8. 컴포넌트 시스템 기준

### 8.1 웹

- 공식 primitive 세트:
  - `Button`
  - `Input`
  - `Badge`
  - `Card`
  - `Tabs`
  - `Dialog`
  - `Sheet`
  - `Dropdown`
  - `Tooltip`
  - `Skeleton`
  - `Toast`
  - `Separator`
- 구현 계층:
  - 1층: `components/shadcn/ui/*`
  - 2층: `components/ui/*` semantic wrapper
- feature/page 컴포넌트는 색과 상태를 직접 정하지 않는다.

### 8.2 모바일

- 공식 primitive 세트:
  - `PrimaryButton`
  - `OutlineButton`
  - `InputField`
  - `SurfaceCard`
  - `Feedback`
  - `QuotaPill`
- 이후 확장 후보:
  - `SectionHeader`
  - `MetricTile`
  - `StudyProgressCard`
  - `ActionRow`
- 화면 코드는 raw color보다 `componentTokens`를 우선 사용한다.

## 9. 정보 구조와 화면별 개편 방향

### 9.1 웹 핵심 화면

- 홈 `/`
  - Hero에서 목적과 1차 행동을 3초 안에 보여준다.
  - 섹션 수를 줄이고 학습 루프 설명은 더 짧고 선명하게 만든다.
- 로그인 `/login`
  - 소셜 로그인 우선 구조로 정리한다.
  - Google을 기준 CTA로 두고, Naver/Kakao는 보조 강도로 배치한다.
  - 관리자 비밀번호 로그인은 접은 보조 흐름으로 유지한다.
- 마켓 `/wordbooks/market`
  - 필터는 간단하게, 카드 정보는 빠르게 판단 가능한 수준으로만 남긴다.
  - 카드마다 “무엇을 얻는지”와 “지금 할 행동”이 바로 보여야 한다.
- 가격 `/pricing`
  - 요금제 비교보다 무료/유료 경계와 가치 설명을 먼저 보여준다.
- 학습 관련 화면
  - 장식보다 집중을 우선하는 `product mode`로 정리한다.

### 9.2 모바일 핵심 화면

- 홈
  - 오늘의 학습, 바로 시작 CTA, 최근 학습, 보조 정보 순으로 정리한다.
- 로그인
  - 세로 흐름의 간결한 카드 구조로 정리한다.
- 단어장 목록
  - 빠르게 고르는 화면으로 재정렬한다.
- 단어장 상세
  - 메타데이터와 행동 영역을 분리한다.
- 암기/퀴즈
  - 진행률, 현재 문제, 피드백, 다음 행동 순서를 명확히 한다.
- 결과 화면
  - 점수보다 다음 추천 행동을 더 강하게 보여준다.

## 10. 구현 규칙

- 웹
  - `MUI` 추가 금지
  - 페이지 코드에서 임의 `slate/blue/amber/rose` 유틸리티 추가 금지
  - 새 버튼/인풋/배지 스타일은 반드시 wrapper 계층에 먼저 추가
- 모바일
  - 새 화면에서 raw color 직결 금지
  - 버튼 상태는 primitive에서 통제
  - safe area, scroll inset, touch target 44+ 준수
- 공통
  - 더티 워크트리의 기존 변경을 되돌리지 않는다.
  - 디자인 변경은 토큰 -> primitive -> feature/page 순서로 적용한다.
  - README는 실제 구현이 끝난 뒤 사용자 가시 변경만 반영한다.

## 11. 스킬 사용 기준

- 시작 라우팅: `workflow-router`
- 웹 시각 설계: `frontend-design`
- 웹 구현 품질/성능: `vercel-react-best-practices`
- 웹 QA 감사: `web-design-guidelines`
- 모바일 UI 규칙: `building-native-ui`
- 모바일 React Native 규칙: `vercel-react-native-skills`
- 모바일 성능/리스트/애니메이션: `react-native-best-practices`
- 디버깅: `systematic-debugging`
- 외부 스킬 탐색이 꼭 필요할 때만 `find-skills`

## 12. 단계별 실행 순서

### Phase 1. Audit And Freeze

- 하드코딩 색상/타입/간격/버튼 변형 전수 조사
- 웹 raw utility 사용처 목록화
- 모바일 raw token 직접 사용처 목록화
- 최종 토큰과 primitive 규칙 잠금

### Phase 2. Foundation

- 웹 semantic tokens 정리
- 웹 wrapper primitive 정리
- 모바일 theme/component tokens 정리
- 모바일 공용 primitive 정리

### Phase 3. Core Screen Redesign

- 웹: 홈 -> 로그인 -> 마켓 -> 가격 -> 학습 화면
- 모바일: 홈 -> 로그인 -> 단어장 목록 -> 상세 -> 암기 -> 퀴즈 -> 결과

### Phase 4. QA And Hardening

- 접근성, motion, 성능, 상태 피드백 정리
- 남은 예외 스타일 정리
- README, 문서, 검증 명령 정리

## 13. 구현 체크리스트

### 13.1 웹 공통

- [ ] `app/globals.css`의 semantic token 체계를 최종 정리했다.
- [ ] `tailwind.config.ts`가 semantic alias 중심으로 정리됐다.
- [ ] `components/ui/*`가 공식 wrapper 역할을 하도록 정리됐다.
- [ ] feature/page 코드에서 raw utility 의존이 줄었다.
- [ ] 새 hex 추가 없이 기존 토큰만으로 구현했다.

### 13.2 웹 화면

- [ ] 홈 Hero가 제품 목적과 1차 CTA를 3초 안에 보여준다.
- [ ] 로그인 화면이 소셜 로그인 우선 구조다.
- [ ] 마켓 화면이 빠른 비교와 빠른 다운로드 흐름에 맞게 단순화됐다.
- [ ] 가격 화면이 무료/유료 차이를 빠르게 이해시킨다.
- [ ] 학습 화면이 랜딩보다 더 집중형 구조를 가진다.

### 13.3 모바일 공통

- [ ] `src/theme/colors.ts`, `typography.ts`, `spacing.ts`, `components.ts`가 기준 소스다.
- [ ] 공용 버튼/피드백/카드/인풋의 상태 규칙이 통일됐다.
- [ ] safe area와 scroll inset 규칙을 준수했다.
- [ ] touch target 44 이상을 지켰다.
- [ ] 숫자/진도/쿼터가 tabular number로 정렬된다.

### 13.4 모바일 화면

- [ ] 홈이 “오늘의 학습 -> 바로 시작 -> 최근 학습” 구조다.
- [ ] 로그인 화면이 간결한 세로 흐름이다.
- [ ] 단어장 목록이 빠른 선택 중심이다.
- [ ] 상세 화면의 메타데이터와 행동이 분리됐다.
- [ ] 암기 화면이 카드 집중형 구조다.
- [ ] 퀴즈 화면이 문제/피드백/다음 행동 순서가 명확하다.
- [ ] 결과 화면이 다음 추천 행동을 강조한다.

## 14. 최종 검증 체크리스트

### 14.1 웹 검증

- [ ] `npm run codex:workflow:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `/`, `/login`, `/wordbooks/market`, `/pricing`, `/wordbooks` 핵심 경로를 데스크톱/모바일 폭에서 확인했다.
- [ ] `focus-visible`, `contrast`, `keyboard flow`, `form error`가 정상이다.

### 14.2 모바일 검증

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `Expo Go` 또는 시뮬레이터에서 home/login/wordbooks/detail/memorize/quiz/result/settings/share 흐름을 확인했다.
- [ ] safe area, scroll, disabled/loading/error, press feedback가 정상이다.

### 14.3 공통 검증

- [ ] 사용자 노출 문구가 한국어 정책을 지킨다.
- [ ] 인코딩 문제가 없다. UTF-8 without BOM을 유지한다.
- [ ] 기존 더티 워크트리 변경을 실수로 되돌리지 않았다.

## 15. 완료 기준

- 첫 화면 3초 테스트에서 웹 홈, 웹 로그인, 모바일 홈 모두 제품 목적과 1차 행동이 즉시 보인다.
- 웹은 `shadcn/ui` 기반 규칙형 UI 체계로 정리된다.
- 모바일은 네이티브 중심의 명확한 학습 흐름을 갖는다.
- 화면별 예외 스타일이 줄고, 토큰과 primitive 중심 구조로 재정리된다.
- “기능은 되는데 디자인이 조잡한 느낌”이 사라지고, 일관된 제품 경험으로 보인다.

## 16. 구현 시 주의사항

- 이 문서는 디자인 결정을 줄이기 위한 기준 문서다.
- 구현자는 문서 밖에서 새 색상 체계나 버튼 규칙을 임의로 만들지 않는다.
- 불가피한 예외는 해당 PR 또는 커밋 설명에 이유를 남기고, 가능하면 토큰 계층으로 흡수한다.
- 웹과 앱은 같은 브랜드 톤을 공유하지만 같은 레이아웃을 강제하지 않는다.

