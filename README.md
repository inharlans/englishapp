# English 1500 Memorizer (MVP)

Next.js(App Router) + TypeScript + Prisma + SQLite 기반 영단어 암기 웹앱입니다.
인증 없이 단일 사용자 기준으로 동작합니다.

## 1. 실행 방법

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

- 기본 주소: `http://localhost:3000`

## 2. 데이터 로드 방식

- 루트의 `words.tsv`를 서버가 자동으로 읽어 DB에 초기 적재합니다.
- 별도 Import 버튼 없이 `/memorize` 첫 접근 시 자동 로드됩니다.
- 단어는 50개 단위로 묶여 `week1` ~ `week30`으로 학습합니다.

예시(TSV):

```tsv
index	en	ko
1	ready	준비가 된
2	often	자주, 종종
3	future	미래
```

`words.tsv` 형식:

- 첫 줄은 헤더
- `en`, `ko` 컬럼 필수(대소문자 무시)
- `index` 컬럼은 무시
- `en`, `ko` trim 후 빈 값이면 스킵
- 중복 영단어(`en`)는 최초만 채택

## 3. 페이지 사용 흐름

### `/memorize`

- 카드로 영단어+뜻 표시
- `week1` ~ `week30` 선택 (각 50개)
- 1개/5개 보기 토글
- 이전/다음 이동
- 맞춘 단어 숨김 기본 ON (`correctStreak >= 1` 숨김)
- 카드에서 한국어 뜻을 수정 후 저장 가능(저장 시 DB 반영)

### `/quiz-meaning`

- 영단어 제시 -> 한국어 뜻 입력
- 오답 시 카드가 빨간색으로 변하고 정답(`en/ko`) 노출
- 다음 문제 버튼으로 다음 출제

### `/quiz-word`

- 한국어 뜻 제시 -> 영단어 입력
- 오답 UI는 `/quiz-meaning`과 동일

### `/list-correct`

- `lastResult = CORRECT` 목록

### `/list-wrong`

- `lastResult = WRONG` 목록

### `/list-half`

- `everCorrect = true` AND `everWrong = true` 목록
- 우상단 시험 버튼으로 half 목록 범위 퀴즈 진입:
  - `/quiz-meaning?scope=half`
  - `/quiz-word?scope=half`

## 4. 핵심 로직 요약

- 정답 시 `correctStreak += 1`, `nextReviewAt` 갱신
  - 1회: +1시간
  - 2회: +1일
  - 3회: +7일
  - 4회 이상: +30일
- 오답 시 `wrongActive=true`, `wrongRecoveryRemaining=10`
- 오답 복구 중(`wrongActive=true && wrongRecoveryRemaining>0`)은 출제 우선순위 1순위
- 복구 중 정답마다 `wrongRecoveryRemaining -= 1`, 0이면 `wrongActive=false`
- 오답 시 `correctStreak`는 리셋하지 않음

## 5. 출제 우선순위(퀴즈 공통)

1. `wrongActive=true && wrongRecoveryRemaining>0`
2. `nextReviewAt <= now`
3. `correctStreak=0` (신규)

`scope=half`면 half 목록 집합에서만 위 우선순위를 적용합니다.

## 6. API

- `POST /api/words/import`
  - body: `{ rawText: string }`
- `GET /api/words?mode=memorize|quiz|listCorrect|listWrong|listHalf&batch=1|5&page=0&scope=half&hideCorrect=true`
- `POST /api/quiz/submit`
  - body: `{ wordId:number, quizType:'MEANING'|'WORD', userAnswer:string, scope?:'half' }`

## 7. Prisma 모델

- `Word(id, en unique, ko, createdAt)`
- `Progress(wordId PK/FK, correctStreak, nextReviewAt, wrongActive, wrongRecoveryRemaining)`
- `ResultState(wordId PK/FK, everCorrect, everWrong, lastResult, updatedAt)`
