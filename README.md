# Englishapp (English 1500 + ?⑥뼱??留덉폆)

Next.js(App Router) + Prisma + PostgreSQL 湲곕컲 ?⑥뼱 ?숈뒿 ?뱀빋.

- 怨좎젙 ?⑥뼱 由ъ뒪??`words.tsv`) 湲곕컲 ?쏣nglish 1500???숈뒿(?붽린/?댁쫰/?ㅻ떟 蹂듭뒿)
- ?좎? 媛쒖씤 ?⑥뼱???앹꽦/?몄쭛)
- 怨듦컻 ?⑥뼱??留덉폆(?ㅼ슫濡쒕뱶/?됱젏/?뺣젹)
- ?ㅽ봽?쇱씤 ???IndexedDB) + 理쒖냼 Service Worker 罹먯떛
- FREE/PRO ?뚮옖 ?뺤콉??**?쒕쾭?먯꽌 媛뺤젣**

## ?쒗뭹 洹쒖튃(?꾩옱)

- ?⑥뼱?μ뿉??`ownerId`(?뚯쑀??媛 ?덇퀬, **?뚯쑀?먮쭔** ?⑥뼱??硫뷀?/??ぉ???섏젙?????덈떎.
- ?ㅼ슫濡쒕뱶???⑥뼱?μ? **?쎄린 ?꾩슜**?대ŉ, ?ㅼ슫濡쒕뜑???댁슜???섏젙?섍굅???щ같???낅줈???????녿떎.
- ?숈뒿 ?뚮줈?곕뒗 ?⑥뼱???대? 寃쎈줈(`/wordbooks/[id]/memorize`, `/quiz-meaning`, `/quiz-word`, `/list-*`)?먯꽌留??쒓났?쒕떎.
- ?? ?ㅼ슫濡쒕뱶???⑥뼱?μ쓽 ?먮낯 ?띿뒪?몃뒗 諛붾뚯? ?딆쑝硫???????섏젙 湲덉?), ?숈뒿 ?곹깭(?뺣떟/?ㅻ떟/吏꾨룄)留??ъ슜?먮퀎濡???λ맂??
- 留덉폆? ?⑥뼱?λ퀎 `downloadCount`, `ratingAvg`, `ratingCount`瑜??쒖떆?섎ŉ 湲곕낯 ?뺣젹? ?쏷op(?됱젏/?됯????ㅼ슫濡쒕뱶/理쒖떊)?앹씠??

?뚮옖 ?뺤콉(?쒕쾭 媛뺤젣)
- FREE
- 怨듦컻 ?⑥뼱???ㅼ슫濡쒕뱶 **?됱깮 3???쒗븳**
- ?⑥뼱???앹꽦 **?됱깮 1媛??쒗븳**
- ?낅줈???닿? 留뚮뱺) ?⑥뼱?μ? **媛뺤젣 怨듦컻**
- PRO
- ?ㅼ슫濡쒕뱶 **臾댁젣??*
- ?⑥뼱???앹꽦 **臾댁젣??*
- ?낅줈???⑥뼱??怨듦컻/鍮꾧났媛??좏깮 媛??

媛寃??쒖떆?? 寃곗젣 ?곕룞? ?꾩쭅 ?놁쓬)
- PRO ?? 2,900??
- PRO ?? 29,000??

## ?섏씠吏(??

- `/` ??
- `/memorize`, `/quiz-meaning`, `/quiz-word`, `/list-*`??`/wordbooks`濡?由щ떎?대젆??
- ?ㅼ젣 ?숈뒿 ?붾㈃:
  - `/wordbooks/[id]/memorize`
  - `/wordbooks/[id]/quiz-meaning`, `/wordbooks/[id]/quiz-word`
  - `/wordbooks/[id]/list-correct`, `/wordbooks/[id]/list-wrong`, `/wordbooks/[id]/list-half`
- `/wordbooks` ???쇱씠釉뚮윭由??닿? 留뚮뱺 ?⑥뼱??+ ?ㅼ슫濡쒕뱶???⑥뼱??
- `/wordbooks/new` ?⑥뼱???앹꽦
- `/wordbooks/[id]` ?⑥뼱???곸꽭(?뚯쑀???몄쭛, ?ㅼ슫濡쒕뱶蹂몄? ?쎄린 ?꾩슜)
- `/wordbooks/market` 怨듦컻 ?⑥뼱??留덉폆(寃???뺣젹/?ㅼ슫濡쒕뱶)
- `/offline` ?ㅽ봽?쇱씤 ?쇱씠釉뚮윭由?IndexedDB)
- `/offline/wordbooks/[id]` ?ㅽ봽?쇱씤 ?숈뒿(移대뱶)
- `/pricing` ?붽툑/?낃렇?덉씠???덈궡
- `/admin` 愿由ъ옄 肄섏넄(`isAdmin` ?꾩슂)
- `/login`, `/logout` 濡쒓렇??濡쒓렇?꾩썐

李멸퀬: 湲곕낯?곸쑝濡??遺遺꾩쓽 ?섏씠吏/API??濡쒓렇???꾩슂?섎ŉ, ?덉쇅濡?`/login`, `/offline`, `/sw.js`, `/api/auth/*` ?깆? 怨듦컻 寃쎈줈濡?泥섎━?섏뼱 ?덈떎(`middleware.ts`).

## API(App Router route)

?몄쬆(Auth)
- `POST /api/auth/bootstrap` 理쒖큹 愿由ъ옄 ?앹꽦(1?뚯꽦, `AUTH_BOOTSTRAP_TOKEN` ?ㅻ뜑 ?꾩슂)
- `POST /api/auth/login` 濡쒓렇??荑좏궎 ?명똿)
- `POST /api/auth/logout` 濡쒓렇?꾩썐(荑좏궎 ??젣)
- `GET /api/auth/me` ?꾩옱 ?ъ슜??+ ?뚮옖/?ъ슜???뺣낫

English 1500(怨좎젙 ?⑥뼱 由ъ뒪??
- `GET /api/words` ?붽린/?댁쫰/由ъ뒪?몄슜 硫붿씤 API
- `GET /api/words/[id]` ?⑥뼱 ?곸꽭
- `POST /api/words/import` ?⑥뼱 import(?대? ?⑸룄)

?⑥뼱??Wordbooks)
- `GET /api/wordbooks` ?닿? 留뚮뱺 ?⑥뼱??紐⑸줉
- `POST /api/wordbooks` ?⑥뼱???앹꽦(FREE??媛뺤젣 怨듦컻)
  - FREE???앹꽦 1???됱깮) ?쒗븳, PRO??臾댁젣??
- `GET /api/wordbooks/[id]` ?⑥뼱??+ ?꾩씠??議고쉶(?뚯쑀?먮쭔 private 議고쉶 媛?? ??몄? public留?
- `PATCH /api/wordbooks/[id]` ?⑥뼱??硫뷀? ?섏젙(?뚯쑀?먮쭔)
- `DELETE /api/wordbooks/[id]` ?⑥뼱????젣(?뚯쑀?먮쭔)
- `POST /api/wordbooks/[id]/items` ?꾩씠??異붽?(?뚯쑀?먮쭔)
- `PATCH /api/wordbooks/[id]/items/[itemId]` ?꾩씠???섏젙(?뚯쑀?먮쭔)
- `DELETE /api/wordbooks/[id]/items/[itemId]` ?꾩씠????젣(?뚯쑀?먮쭔)
- `POST /api/wordbooks/[id]/publish` 怨듦컻/鍮꾧났媛??좉?(PRO留? FREE??鍮꾧났媛?湲덉?)
- `GET /api/wordbooks/market` 留덉폆 紐⑸줉(寃???뺣젹/?섏씠吏?ㅼ씠??
- `POST /api/wordbooks/[id]/download` ?⑥뼱???ㅼ슫濡쒕뱶(?좎???1??湲곕줉 + `downloadCount` 利앷?, ?뚮옖 ?쒗븳 媛뺤젣)
- `POST /api/wordbooks/[id]/rate` 1~5???됱젏(?뚯쑀???먮뒗 ?ㅼ슫濡쒕뱶???좎?留?媛?? 1??1??upsert + ?됯퇏/媛쒖닔 吏묎퀎)
  - `review`(?볤?) ?꾨뱶 ?④퍡 ???媛??
- `GET /api/wordbooks/[id]/reviews` ?대떦 ?⑥뼱??由щ럭 紐⑸줉(?됱젏 + ?볤? + ?묒꽦??留덉뒪???대찓??
- `GET /api/wordbooks/downloaded` ?닿? ?ㅼ슫濡쒕뱶???⑥뼱??紐⑸줉
- `GET /api/wordbooks/[id]/study` ?ㅼ슫濡쒕뱶 ?⑥뼱???숈뒿 ?곹깭/?꾩씠??議고쉶(?ъ슜???ㅼ퐫??
- `POST /api/wordbooks/[id]/study/items/[itemId]` ?ㅼ슫濡쒕뱶 ?⑥뼱???꾩씠???뺤삤??由ъ뀑 諛섏쁺(?ъ슜???ㅼ퐫??
- `GET /api/wordbooks/[id]/quiz` ?ㅼ슫濡쒕뱶 ?⑥뼱???댁쫰 臾몄젣 濡쒕뱶(?섎?/?⑥뼱 紐⑤뱶)
  - `partSize`, `partIndex` 荑쇰━濡?part 踰붿쐞 異쒖젣 媛??
- `POST /api/wordbooks/[id]/quiz/submit` ?ㅼ슫濡쒕뱶 ?⑥뼱???댁쫰 梨꾩젏/?곹깭 諛섏쁺(?ъ슜???ㅼ퐫??
- `POST /api/wordbooks/[id]/sync-download` ?ㅼ슫濡쒕뱶 ?⑥뼱??理쒖떊 踰꾩쟾 ?숆린???숈뒿?곹깭 ?좎?/珥덇린???좏깮)

愿由ъ옄(Admin)
- `GET /api/admin/users` ?좎? 紐⑸줉(愿由ъ옄留?
- `POST /api/admin/users/[id]/plan` `plan`, `proUntil`, `isAdmin` ?ㅼ젙(愿由ъ옄留?

## ?ㅽ봽?쇱씤(Offline)

- ?쏶ave Offline?앹? ?⑥뼱???꾩씠?쒖쓣 釉뚮씪?곗? IndexedDB????ν븳??
- ???濡쒖쭅: `lib/offlineWordbooks.ts`
- ?쇱씠釉뚮윭由?UI: `/offline`
- ?ㅽ봽?쇱씤 ?숈뒿 UI: `/offline/wordbooks/[id]`
- 理쒖냼 Service Worker: `public/sw.js`
- `/offline` 諛?Next ?뺤쟻 由ъ냼?ㅻ? best-effort 罹먯떛

## ?곗씠??紐⑤뜽(Prisma)

- English 1500 ?숈뒿 ?곗씠?? `Word`, `Progress`, `ResultState`, `QuizProgress`
- ?ъ슜???뚮옖: `User(plan, proUntil, isAdmin)` + `UserPlan` enum
- ?⑥뼱?? `Wordbook`, `WordbookItem`, `WordbookDownload`, `WordbookRating`

## 濡쒖뺄 媛쒕컻

1. `.env.example`??`.env`濡?蹂듭궗
2. `DATABASE_URL`??濡쒖뺄 PostgreSQL ?묒냽 臾몄옄?대줈 ?ㅼ젙
3. ?ㅽ뻾

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Recent Update (2026-02-16)

- Applied a global 2-color design system with tokens in `app/globals.css`:
  - Primary blue: `#2563EB`
  - Accent orange: `#F59E0B`
  - Neutrals: background/card/border/text tokens
- Standardized shared UI classes:
  - `ui-btn-primary`, `ui-btn-accent`, `ui-btn-secondary`, `ui-btn-ghost`
  - `ui-tab-active`, `ui-tab-inactive`
- Refactored key pages/components to use token-based buttons/tabs without layout changes:
  - Navbar, wordbook tabs, density toggle, wordbook library, market, pricing, login, offline, and study/quiz surfaces.
- Enforced CTA mapping:
  - Main CTA buttons use orange only where intended (e.g. download CTA, recommended pricing badge context).
  - Active/selected and navigation emphasis use blue.
- Fixed broken JSX/string issues introduced during prior style churn:
  - `app/wordbooks/[id]/quiz/quizClient.tsx`
  - `app/wordbooks/market/page.tsx`
  - `app/wordbooks/[id]/page.tsx`
  - `components/wordbooks/RateBox.tsx`
- Validation:
  - `npm run typecheck` passed
  - `npm run build` passed

## Railway 諛고룷(沅뚯옣)

????μ냼?먮뒗 `railway.json`???ы븿?섏뼱 ?덇퀬, ?쒕쾭 ?쒖옉 ?꾩뿉 留덉씠洹몃젅?댁뀡???ㅽ뻾?쒕떎.

?꾩닔 ?섍꼍蹂??
- `DATABASE_URL` (Railway PostgreSQL ?먮뒗 ?몃? PostgreSQL)
- `GOOGLE_TRANSLATE_API_KEY` (?좏깮)
- `AUTH_SECRET` (?꾩닔, 32???댁긽 沅뚯옣)
- `AUTH_BOOTSTRAP_TOKEN` (?꾩닔: 理쒖큹 ?ъ슜???앹꽦??bootstrap API 蹂댄샇)
- `CRON_SECRET` (?좏깮: ?대? ?щ줎 API ?몄쬆 ?좏겙)
- `UPSTASH_REDIS_REST_URL` (?좏깮: 遺꾩궛 rate limit)
- `UPSTASH_REDIS_REST_TOKEN` (?좏깮: 遺꾩궛 rate limit)

?꾨줈?뺤뀡 rate limiting
- Upstash ?섍꼍蹂?섍? ?덉쑝硫?Redis瑜??ъ슜(遺꾩궛)
- ?놁쑝硫?PostgreSQL fallback(遺꾩궛)

諛고룷 ?먮쫫
1. GitHub??push
2. Railway: `New Project -> Deploy from GitHub Repo`
3. Railway PostgreSQL 異붽?
4. ???쒕퉬?ㅼ뿉 `DATABASE_URL` ?ㅼ젙
5. 諛고룷 URL ?묒냽

## Prisma ?ㅽ겕由쏀듃

- `npm run prisma:generate` Prisma Client ?앹꽦
- `npm run prisma:migrate` 濡쒖뺄 媛쒕컻??留덉씠洹몃젅?댁뀡
- `npm run prisma:deploy` ?꾨줈?뺤뀡 留덉씠洹몃젅?댁뀡(`migrate deploy`)
- `npm run typecheck` ?ㅽ뻾 ??`next typegen`??癒쇱? ?섑뻾??`.next/types` ?꾨씫?쇰줈 ?명븳 TS6053 ?ㅻ쪟瑜??덈갑

## Railway ?쒖옉 而ㅻ㎤??

```bash
npm run start:railway
```

??而ㅻ㎤?쒕뒗 ?ㅼ쓬???섑뻾?쒕떎.
1. `prisma generate`
2. `prisma migrate deploy`
3. `next start -p $PORT`

珥덇린 ?곗씠?곌? ?꾩슂???뚮쭔 ?쒕뱶 ?ы븿 ?쒖옉 而ㅻ㎤?쒕? ?ъ슜?쒕떎.

```bash
npm run start:railway:seed
```

## ?몄쬆 bootstrap(理쒖큹 愿由ъ옄)

1. `AUTH_BOOTSTRAP_TOKEN`, `AUTH_SECRET` ?섍꼍蹂???ㅼ젙
2. `POST /api/auth/bootstrap` ?몄텧

```json
{ "email": "admin@example.com", "password": "change-me-now" }
```

?댄썑 `/login`?쇰줈 濡쒓렇?명븳??

## 吏湲덇퉴吏 援ы쁽??寃?泥댄겕由ъ뒪??

- [x] Next.js(App Router) 湲곕낯 ??+ Tailwind UI
- [x] JWT 荑좏궎 ?몄쬆 + bootstrap(理쒖큹 愿由ъ옄 ?앹꽦) ?뚮줈??
- [x] English 1500 ?숈뒿: ?붽린/?댁쫰/?뺣떟쨌?ㅻ떟쨌?뚮났 由ъ뒪??+ 蹂듭뒿 ?ㅼ?以꾨쭅
- [x] Rate limiting(Upstash ?ㅼ젙 ??Redis, 誘몄꽕????DB fallback)
- [x] 媛쒖씤 ?⑥뼱?? ?앹꽦/?섏젙/??젣(?뚯쑀?먮쭔), ?꾩씠??CRUD, 踰뚰겕 異붽?
- [x] 留덉폆: 怨듦컻 ?⑥뼱???먯깋(寃???뺣젹/?섏씠吏?ㅼ씠??, ?ㅼ슫濡쒕뱶/?됱젏 吏???쒖떆
- [x] ?ㅼ슫濡쒕뱶: ?좎???1???ㅼ슫濡쒕뱶 湲곕줉 + ?⑥뼱??`downloadCount` 利앷?
- [x] ?됱젏: ?좎???1??upsert), ?쒕쾭?먯꽌 ?됯퇏/媛쒖닔 吏묎퀎?섏뿬 ?⑥뼱?μ뿉 諛섏쁺
- [x] ?ㅽ봽?쇱씤: IndexedDB ???紐⑸줉/??젣 + ?ㅽ봽?쇱씤 移대뱶 ?숈뒿 ?섏씠吏
- [x] 理쒖냼 Service Worker 罹먯떛(`/offline`, Next ?뺤쟻 由ъ냼??
- [x] 諛쒖쓬(TTS): 釉뚮씪?곗? `SpeechSynthesis` 湲곕컲 ?쏶peak??踰꾪듉
- [x] ?뚮옖 ?뺤콉(?쒕쾭 媛뺤젣)
- [x] FREE: 怨듦컻 ?⑥뼱???ㅼ슫濡쒕뱶 ?됱깮 3??
- [x] FREE: ?낅줈???⑥뼱??媛뺤젣 怨듦컻, 鍮꾧났媛?遺덇?
- [x] PRO: ?ㅼ슫濡쒕뱶 臾댁젣?? 怨듦컻/鍮꾧났媛??좉? 媛??
- [x] ?붽툑 ?덈궡 ?섏씠吏(`/pricing`) 異붽?(?쒖떆??
- [x] 愿由ъ옄 肄섏넄(`/admin`) + ?뚮옖/愿由ъ옄 沅뚰븳 ?ㅼ젙 API
- [x] ?⑥뼱???대? ?꾩슜 ?숈뒿 ?쇱슦???곸슜: `/wordbooks/[id]/memorize|quiz|list-*`
- [x] ?ㅼ슫濡쒕뱶 ?⑥뼱??read-only 蹂댁옣(??????섏젙 鍮꾪솢?? + ?ъ슜?먮퀎 ?숈뒿 ?곹깭 ???
- [x] `(紐?(??(??` ?뺥깭 ?섎? ?쒖떆 媛쒖꽑(?덉궗 ?쒓렇 媛?낆꽦 媛뺥솕)
- [x] ???ㅻ퉬/?꾩뿭 ?고듃 諛??덉씠?꾩썐 由щ뵒?먯씤
- [x] UI E2E ?뚮줈???덉젙???숈뒿 踰꾪듉 議댁옱 ?щ????곕Ⅸ 遺꾧린 泥섎━)
- [x] ?ㅼ슫濡쒕뱶 吏곹썑 ?⑤낫??諛곕꼫(?붽린/?댁쫰 利됱떆 吏꾩엯 CTA + 24?쒓컙 ?щ끂異??쒗븳)
- [x] ?숈뒿 ?붾㈃ 怨듯넻 ?ㅽ꽣????+ 留덉?留??숈뒿 ??蹂듭썝 踰꾪듉
- [x] ?섎? ?쒖떆 `媛꾧껐/?먯꽭?? 紐⑤뱶 ?좉?(濡쒖뺄 ??? + ?덉궗 ?쒓렇 媛?낆꽦 媛쒖꽑
- [x] ?ㅼ슫濡쒕뱶 ?⑥뼱??踰꾩쟾 異붿쟻(`contentVersion`) + 蹂寃??붿빟(+/~/-) + ?섎룞 ?숆린??
- [x] ?몄뀡 ?뚭퀬 ?⑤꼸(?ㅼ쓬 ?됰룞 異붿쿇, ?덉긽 ?뚯슂?쒓컙, 猷⑦떞 ?뚮┝ ?좉?)

## ?꾩옱 誘몄셿猷?TODO (?⑥씪 紐⑸줉)

?꾨옒 3媛쒓? ?꾩옱 湲곗? ?⑥씪 TODO?대ŉ, ?????뱀뀡? ?대젰/湲곕줉?⑹엯?덈떎.

- [ ] 寃곗젣 ?곕룞(????援щ룆) + ?먮룞 ?뚮옖 ?쒖꽦??留뚮즺 泥섎━
- [ ] OAuth 濡쒓렇??援ш?/?ㅼ씠踰?移댁뭅?? + 怨꾩젙 ?곌껐
- [ ] 愿痢≪꽦 ?ㅽ깮 異붽?(援ъ“??濡쒓렇, ?먮윭 異붿쟻, ?쇱슦?몃퀎 4xx/5xx/吏????쒕낫??

## Bootstrap + Login ?덉떆

PowerShell(濡쒖뺄 媛쒕컻):

```powershell
$base = "http://127.0.0.1:3000"
$bootstrapToken = $env:AUTH_BOOTSTRAP_TOKEN

Invoke-RestMethod -Method Post "$base/api/auth/bootstrap" `
  -Headers @{ "x-bootstrap-token" = $bootstrapToken } `
  -ContentType "application/json" `
  -Body (@{ email="admin@example.com"; password="change-me-now-123" } | ConvertTo-Json)

# Login (cookie瑜??몄뀡 蹂?섏뿉 ???
$sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -Method Post "$base/api/auth/login" -WebSession $sess `
  -ContentType "application/json" `
  -Body (@{ email="admin@example.com"; password="change-me-now-123" } | ConvertTo-Json) | Out-Null

# 蹂댄샇??API ?몄텧
Invoke-RestMethod -Method Get "$base/api/words?mode=memorize&batch=1&page=0&hideCorrect=true&week=1" -WebSession $sess

# Logout
Invoke-WebRequest -Method Post "$base/api/auth/logout" -WebSession $sess | Out-Null
```

cURL(?꾨줈?뺤뀡):

```bash
BASE="https://your-app.example.com"
BOOTSTRAP_TOKEN="$AUTH_BOOTSTRAP_TOKEN"

curl -sS -X POST "$BASE/api/auth/bootstrap" \
  -H "x-bootstrap-token: $BOOTSTRAP_TOKEN" \
  -H "content-type: application/json" \
  -d '{"email":"admin@example.com","password":"change-me-now-123"}'

curl -i -c cookies.txt -X POST "$BASE/api/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"admin@example.com","password":"change-me-now-123"}'

curl -sS -b cookies.txt "$BASE/api/words?mode=memorize&batch=1&page=0&hideCorrect=true&week=1"

curl -sS -b cookies.txt -X POST "$BASE/api/auth/logout"
```

## Dataset / Wordbooks (Generated)

This repo can generate multiple **en+ko** wordbooks where `ko` is filled in the `(紐?(??...` style.
These are built from open wordlists (NGSL Project) and Korean translations from Kaikki/Wiktionary.

Commands (from `C:\\dev\\englishapp`):

```powershell
# Crawl open wordlists (NGSL family + NDL + MOEL file)
node .\\scripts\\crawl-ngsl-family.mjs

# Generate many fully-filled KO wordbooks (no blank ko rows kept)
node .\\scripts\\generate-many-wordbooks-ko.mjs --chunk 300 --max 2100 --concurrency 6

# Build derived "school level" sets (珥덈벑/以묐벑/怨좊벑/?섎뒫/?좎씡/?뚰솕/鍮꾩쫰?덉뒪/?꾨Ц)
node .\\scripts\\build-derived-level-wordbooks.mjs

# Validate outputs (optional)
node .\\scripts\\validate-wordbooks-ko.mjs

# Generate a root TSV for seeding (does not overwrite words.tsv)
node .\\scripts\\generate-root-words-tsv-ko.mjs --count 1500
```

Outputs:
- `data/wordbooks-ko/**.generated.tsv`
- `words.ko.generated.tsv`

## 2026-02-16 Update

- Study state is now **user-scoped** for all quiz/memorize flows.
- `Progress`, `ResultState`, and `QuizProgress` are keyed by `(userId, wordId)`.
- `/api/words` now returns `isUserScoped: true` for debugging/verification.
- Seed process now imports generated wordbooks from `data/wordbooks-ko/**/*.generated.tsv`
  into public market wordbooks (download-ready).

## 2026-02-16 TODO Sprint (No External Keys)

Done in this sprint:

- [x] Downloaded wordbook personal study state (check/wrong/progress) saved per user.
- [x] Market ranking improvement (Bayesian rating + download + recency score).
- [x] Report/block/moderation flow for public wordbooks.
- [x] Wordbook import/export (TSV/CSV) with optional pronunciation auto-fill.
- [x] Sentence/example fields + wordbook-based quiz mode.
- [x] PWA install prompt + stronger route-level offline caching strategy.

?꾩쭅 ?⑥? ??ぉ(?몃? ?곕룞 ???꾩슂, ?⑥씪 TODO 紐⑸줉怨??숈씪):

- 寃곗젣 ?곕룞(援щ룆 寃곗젣) + ?뚮옖 ?먮룞 ?쒖꽦??留뚮즺 泥섎━
- OAuth 濡쒓렇??援ш?/?ㅼ씠踰?移댁뭅?? + 怨꾩젙 ?곌껐

## 2026-02-16 蹂닿컯 ?낅뜲?댄듃

- 蹂댁븞 媛뺥솕:
  - 二쇱슂 ?곌린 API??mutation ?붿껌 ?좊ː??泥댄겕(`Origin` / `sec-fetch-site`) 異붽?
  - ?좉퀬/李⑤떒/import/?숈뒿/?댁쫰 ?쒖텧 寃쎈줈 rate limit 媛뺥솕
  - `middleware.ts`??蹂댁븞 ?묐떟 ?ㅻ뜑 異붽?:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- ??궧 ?덉젙??
  - `Wordbook.rankScore`, `Wordbook.rankScoreUpdatedAt` 異붽?
  - 留덉폆 `Top` ?뺣젹???곸냽?붾맂 `rankScore` 湲곕컲(DB ?뺣젹)?쇰줈 蹂寃?
  - ?ㅼ슫濡쒕뱶/?됱젏 諛섏쁺 ????궧 ?먯닔 ?먮룞 媛깆떊
  - ?섎룞 ?ш퀎??紐낅졊 異붽?:
    - `npm run wordbooks:recompute-rank`
- E2E ?ㅻえ???뚯뒪??
  - HTTP 湲곕컲 end-to-end ?ㅻえ???뚯뒪???ㅽ겕由쏀듃 異붽?:
    - `npm run test:e2e`
    - `npm run test:e2e:ui` (Playwright UI ?뚮줈??
    - `npm run test:e2e:local` (dev ?쒕쾭 ?먮룞 ?ㅽ뻾 + smoke + ui ?쇨큵)
    - `npm run test:e2e:local:smoke` (dev ?쒕쾭 ?먮룞 ?ㅽ뻾 + smoke)
    - `npm run test:e2e:local:ui` (dev ?쒕쾭 ?먮룞 ?ㅽ뻾 + ui)
  - ?섍꼍 蹂??
    - `E2E_BASE_URL` (default: `http://127.0.0.1:3000`)
    - `E2E_EMAIL` (default: `admin@example.com`)
    - `E2E_PASSWORD` (default: `change-me-now-123`)
    - `AUTH_BOOTSTRAP_TOKEN` (bootstrap ?④퀎?먯꽌 ?좏깮 ?ъ슜)

## TODO ?ъ젙由?(2026-02-16)

湲곗〈 TODO 湲곗? 吏꾪뻾 ?꾪솴:

- [x] ?ㅼ슫濡쒕뱶 ?⑥뼱??媛쒖씤 ?숈뒿 ?곹깭 ???
- [x] 留덉폆 ??궧 媛쒖꽑
- [x] ?좉퀬/李⑤떒/紐⑤뜑?덉씠???꾧뎄
- [x] ?⑥뼱??import/export + ?좏깮??諛쒖쓬 ?먮룞 梨꾩?
- [x] ?덈Ц/臾몄옣 湲곕뒫 + ?⑥뼱???댁쫰 紐⑤뱶
- [x] PWA ?ㅼ튂 UX + ?ㅽ봽?쇱씤 罹먯떛 媛뺥솕
- 寃곗젣 ?곕룞 + ?뚮옖 ?먮룞 ?쇱씠?꾩궗?댄겢 (誘몄셿猷? ?곷떒 ?⑥씪 TODO 李몄“)
- OAuth 濡쒓렇??+ 怨꾩젙 ?곌껐 (誘몄셿猷? ?곷떒 ?⑥씪 TODO 李몄“)

?좉퇋 諛깅줈洹?吏곸젒 ?쒕쾭 ?먭? 諛?遺꾩꽍 湲곕컲):

- [x] ?덇굅???섏씠吏/臾몄꽌???⑥븘?덈뒗 ?쒓? ?몄퐫??源⑥쭚(紐⑥?諛붿?) ?뺣━
- [x] 紐⑤뱺 ?곌린 API??`zod`(?먮뒗 ?숆툒) ?ㅽ궎留?寃利??곸슜
- [x] ?꾩옱 Origin 泥댄겕 ??CSRF ?좏겙(?붾툝 ?쒕툕諛? 異붽?
- [x] 李⑤떒 ?댁젣 UI(`BlockedOwner` 愿由??붾㈃) 異붽?
- [x] 紐⑤뜑?덉씠??媛먯궗 濡쒓렇 ?꾨뱶 媛뺥솕(泥섎━ ?????곹깭, ?ъ쑀 肄붾뱶, 泥섎━??IP ?댁떆)
- [x] ?좉퀬 ?낆슜 諛⑹?(荑⑤떎?? 以묐났 ?좉퀬 ?듭젣, ?좉퀬???좊ː ?먯닔)
- [x] E2E瑜?HTTP ?ㅻえ?ъ뿉??UI ?뚮줈???뚯뒪?멸퉴吏 ?뺤옣
  - 濡쒓렇??-> 留덉폆 -> ?ㅼ슫濡쒕뱶 -> ?숈뒿 -> ?댁쫰 -> ?좉퀬 -> 紐⑤뜑?덉씠??
- [x] CI ?뚯씠?꾨씪?몄뿉 `typecheck + test + test:e2e` 怨좎젙
- [x] ??궧 ?좎?蹂댁닔 ?묒뾽 ?ㅼ?以꾨쭅(???⑥쐞 ?ш퀎??+ ?먯닔 ?쒕━?꾪듃 紐⑤땲?곕쭅)
- 愿痢≪꽦 ?ㅽ깮 異붽?(援ъ“??濡쒓렇, ?먮윭 異붿쟻, ?쇱슦?몃퀎 4xx/5xx/吏????쒕낫?? (誘몄셿猷? ?곷떒 ?⑥씪 TODO 李몄“)
- [x] DB 諛깆뾽/蹂듦뎄 ?곕턿 諛?留덉씠洹몃젅?댁뀡 濡ㅻ갚 ?뚮젅?대턿 異붽?
- [x] ?묎렐??紐⑤컮??QA ?⑥뒪(?ㅻ낫???ㅻ퉬, ?ъ빱???쒖꽌, 紐낅룄 ?鍮? ?ㅽ겕由곕━???쇰꺼)

## 2026-02-16 異붽? ?꾨즺 ??ぉ

- ?곌린 API 蹂닿컯:
  - 二쇱슂 ?곌린 API??`zod` ?ㅽ궎留?湲곕컲 JSON ?낅젰 寃利앹쓣 ?곸슜
  - 濡쒓렇????CSRF ?좏겙 荑좏궎瑜?諛쒓툒?섍퀬, ?대씪?댁뼵?몃뒗 `x-csrf-token` ?ㅻ뜑 ?먮룞 ?꾩넚
  - ?쒕쾭??`Origin`/`sec-fetch-site` + ?붾툝 ?쒕툕諛?CSRF ?좏겙???④퍡 寃利?
- 李⑤떒 愿由?
  - `GET/DELETE /api/blocked-owners` 異붽?
  - `/wordbooks/blocked` 李⑤떒 ?앹꽦??紐⑸줉/?댁젣 ?붾㈃ 異붽?
- ?좉퀬/紐⑤뜑?덉씠??
  - ?좉퀬 API??30珥?荑⑤떎??+ 24?쒓컙 30???쒗븳 異붽?
  - ?좉퀬???좊ː ?먯닔(`reporterTrustScore`) ???
  - 紐⑤뜑?덉씠??媛먯궗 ?꾨뱶 異붽?:
    - `reviewAction`, `previousStatus`, `nextStatus`, `reviewerIpHash`
- ??궧 ?좎?蹂댁닔:
  - ?대? ?щ줎 ?붾뱶?ъ씤??`POST /api/internal/cron/wordbook-rank` 異붽?
  - `CRON_SECRET` Bearer ?몄쬆?쇰줈 蹂댄샇
  - ?ㅽ뻾 ???ш퀎??嫄댁닔 + stale 嫄댁닔(1???댁긽 誘멸갚?? 諛섑솚
- CI:
  - `.github/workflows/ci.yml` 異붽?
  - `typecheck + test + test:e2e`瑜?CI?먯꽌 ?먮룞 ?ㅽ뻾
- ?댁쁺 臾몄꽌:
  - `docs/OPERATIONS.md`??DB 諛깆뾽/蹂듦뎄/留덉씠洹몃젅?댁뀡 濡ㅻ갚 ?뚮젅?대턿 異붽?
- UI E2E + ?묎렐??
  - Playwright 湲곕컲 UI ?뚮줈???뚯뒪??異붽?: `tests/e2e/ui-flow.mjs`
  - ?ㅽ겕由쏀듃 異붽?: `npm run test:e2e:ui`
  - ?묎렐??紐⑤컮??媛쒖꽑:
    - skip link(`蹂몃Ц?쇰줈 嫄대꼫?곌린`) + `main` ?쒕뱶留덊겕 ID
    - ?꾩뿭 focus-visible ?꾩썐?쇱씤 媛뺥솕
    - ?ㅻ퉬寃뚯씠??`aria-label` 諛?二쇱슂 ?곹샇?묒슜 ?붿냼 ?뚯뒪???앸퀎???쇱씠釉??곸뿭 蹂닿컯

## 2026-02-16 ?듯빀 ?숈뒿 UX ?낅뜲?댄듃

- ?숈뒿 吏꾩엯 援ъ“瑜??⑥닚??
  - ?꾩뿭 `/memorize`, `/quiz-*`, `/list-*`??`/wordbooks`濡?由щ떎?대젆??
  - ?숈뒿? `wordbooks/[id]` ?대??먯꽌留?吏꾪뻾
  - ?곸꽭 ?섏씠吏?먯꽌 `memorize/quiz-meaning/quiz-word/list-*` 踰꾪듉?쇰줈 ?대룞
- ?ㅼ슫濡쒕뱶 ?⑥뼱???뺤콉 媛뺥솕:
  - `save meaning` ???먮낯 蹂寃??≪뀡 鍮꾪솢?깊솕(?쎄린 ?꾩슜)
  - ?뺣떟/?ㅻ떟/?뚮났 ?대젰? ?ъ슜?먮퀎 ?곹깭濡쒕쭔 ???
  - `list-half`瑜??꾪빐 ?ㅼ슫濡쒕뱶 ?⑥뼱???곹깭??`everCorrect`, `everWrong` ?대젰 ?꾨뱶 異붽?
- ?섎? ?뚮뜑留?媛쒖꽑:
  - `(??(紐?...` ?⑦꽩???쒓렇 ?뺥깭濡?遺꾨━??移대뱶/寃곌낵 ?붾㈃ 媛?낆꽦 媛쒖꽑
- ???꾩뿭 UI 媛쒗렪:
  - ??移대뱶/?뺤콉 ?곸뿭/CTA ?щ같移?
  - ?꾩뿭 ?고듃(`Manrope`, `Noto Sans KR`) ?곸슜 諛??곷떒 ?ㅻ퉬 ?뺣━

## 2026-02-17 UX ?꾩씠?붿뼱 5醫?援ы쁽

- ?ㅼ슫濡쒕뱶 ?꾪솚 UX:
  - ?ㅼ슫濡쒕뱶 ?깃났 ??`???쇱씠釉뚮윭由? ?곷떒 ?⑤낫??諛곕꼫 ?몄텧
  - `Memorize ?쒖옉 / Quiz Meaning / Quiz Word / ?섏쨷?? CTA ?쒓났
  - `?섏쨷?? ?좏깮 ??24?쒓컙 ?숈씪 ?⑥뼱???щ끂異??쒗븳
- ?숈뒿 ?ㅻ퉬寃뚯씠??UX:
  - ?⑥뼱???숈뒿 ?붾㈃??怨듯넻 ?ㅽ꽣????`Memorize / Quiz / List`) 怨좎젙
  - ???대┃ ??`wordbook_last_tab_{id}` ??? ?곸꽭 ?섏씠吏?먯꽌 `留덉?留??숈뒿 ?댁뼱?? ?쒓났
- ?섎? 媛?낆꽦 UX:
  - ?섎? ?쒖떆 `媛꾧껐/?먯꽭?? ?좉? 異붽?(濡쒖뺄 ???
  - `(紐?(??(??` ?쒓렇瑜?`紐낆궗/?숈궗/?뺤슜?? ???쇰꺼濡??뺢퇋???쒖떆
- ?ㅼ슫濡쒕뱶 踰꾩쟾 UX:
  - `Wordbook.contentVersion` 諛?`WordbookDownload.downloadedVersion` ?꾩엯
  - 蹂寃??붿빟(`+異붽? / ~?섏젙 / -??젣`) ?쒖떆 諛?踰꾩쟾 ?숆린??API 異붽?
  - ?숆린?????숈뒿 ?곹깭 ?좎?/珥덇린???좏깮 吏??
- ?몄뀡 ?뚭퀬 UX:
  - ?붽린/?댁쫰 ?몄뀡?먯꽌 ?쇱젙 ?쒕룞 ?댄썑 ?뚭퀬 ?⑤꼸 ?몄텧
  - ?ㅼ쓬 異붿쿇 ?됰룞(?ㅻ떟/?뚮났/?댁쫰/?붽린) + ?덉긽 ?뚯슂?쒓컙 + 猷⑦떞 ?뚮┝ ?좉? ?쒓났

## 2026-02-17 留덉씠洹몃젅?댁뀡 ?덉젙??

- `20260217000000_wordbook_versioning_sync` SQL??PostgreSQL ?명솚 援щЦ?쇰줈 ?섏젙
  - ?뚯씪 BOM ?쒓굅
  - `UPDATE ... FROM` 議곗씤 李몄“ 臾몄젣瑜??곴? ?쒕툕荑쇰━ ?뺥깭濡?援먯껜
- CI(`prisma migrate deploy`) 諛??댁쁺 DB ?곸슜 ?덉젙??媛쒖꽑

## 2026-02-17 ?섎? ?뚯꽌 蹂댁젙

- `MeaningView` ?뚯꽌瑜?媛쒖꽑??`(紐?...(??...` ?뺥깭??蹂듯빀 ?덉궗 臾몄옄?댁쓣 ?덉궗蹂꾨줈 遺꾨━ ?뚮뜑留?
- `媛꾧껐` 紐⑤뱶: ?덉궗+?섎?瑜???ぉ ?⑥쐞(移?濡?遺꾨━
- `?먯꽭?? 紐⑤뱶: ?덉궗 洹몃９(紐낆궗/?숈궗 ?? 湲곗??쇰줈 以꾨컮轅?紐⑸줉 ?쒖떆

## 2026-02-17 UI ?꾩씠?붿뼱 5醫??곸슜 ?꾨즺(肄붾뱶 諛섏쁺)

- [x] ?꾩씠?붿뼱 1: ?숈뒿 ??쒕낫???ㅻ뜑 ?곸슜
  - `components/wordbooks/LearningDashboardHeader.tsx` 異붽?
  - ?쇱씠釉뚮윭由??곷떒??吏꾪뻾瑜??쒖꽦 ?⑥뼱???낅뜲?댄듃 ?꾩슂 吏??+ 異붿쿇 CTA 諛곗튂
- [x] ?꾩씠?붿뼱 2: 而щ윭/??댄룷/移대뱶 ?좏겙 湲곕컲 ?쒓컖 ?쒖뒪???곸슜
  - `app/globals.css`??`ui-*` 怨듯넻 ?좏겙/而댄룷?뚰듃 ?대옒??異붽?
  - ?ㅻ퉬/?쇱씠釉뚮윭由?留덉폆/?숈뒿 ?붾㈃??怨듯넻 ?ㅽ????곸슜
- [x] ?꾩씠?붿뼱 3: 諛??紐⑤뱶(而댄뙥???쒖?/吏묒쨷) ?곸슜
  - `components/ui/useDensityMode.ts`, `DensityModeToggle.tsx` 異붽?
  - memorize/quiz/list ?붾㈃??諛??紐⑤뱶 ?좉? 諛?濡쒖뺄 ????곕룞
- [x] ?꾩씠?붿뼱 4: ??뚯쓬 紐⑥뀡 ?뺤콉 ?곸슜
  - 移대뱶 吏꾩엯 `ui-fade-in` 諛?`prefers-reduced-motion` 媛뺥솕
  - 怨쇰룄??紐⑥뀡 ????듭떖 ?꾪솚留??좎?
- [x] ?꾩씠?붿뼱 5: ?됰룞 以묒떖 Empty State ?곸슜
  - `components/ui/EmptyStateCard.tsx` 異붽?
  - ?쇱씠釉뚮윭由?留덉폆/?숈뒿/?댁쫰/由ъ뒪?몄쓽 鍮??곹깭瑜??≪뀡?뺤쑝濡??듭씪

異붽? 諛섏쁺:
- ?덉씠?꾩썐 skip link ?쒓? 源⑥쭚 ?섏젙(`app/layout.tsx`: "蹂몃Ц?쇰줈 嫄대꼫?곌린")
- 留덉폆 ?섏씠吏 JSX ?뚯떛 ?ㅻ쪟(`->`) ?섏젙?쇰줈 ??낆껜??鍮뚮뱶 ?덉젙??

寃利?寃곌낵:
- `npm run typecheck` ?듦낵
- `npm run test` ?듦낵
- `npm run build` ?듦낵

## 2026-02-16 Memorize UX 議곗젙

- `/wordbooks` ?쇱씠釉뚮윭由ъ뿉???⑥뼱???쒕ぉ ?대┃ ???곸꽭(`/wordbooks/[id]`) ???
  諛붾줈 `/wordbooks/[id]/memorize`濡??대룞?섎룄濡?蹂寃?
- `/wordbooks/[id]/memorize` ?섎떒??怨좎젙 而⑦듃濡?諛?異붽?:
  - 寃????以?, ?섏씠吏 ?대룞(?댁쟾/?ㅼ쓬/吏곸젒 ?대룞), ?쒖떆 媛쒖닔(湲곕낯 1, 理쒕? 50).
  - ?꾩껜 ?⑥뼱瑜???踰덉뿉 ?뚮뜑留곹븯吏 ?딄퀬 ?섏씠吏 ?⑥쐞濡??쒖떆.
- `MeaningView`??`?먯꽭?? 紐⑤뱶 異쒕젰 ?뺤떇 媛쒖꽑:
  - 湲곗〈 以꾨컮轅?遺덈┸ 以묒떖?먯꽌 `紐낆궗 ?? -?? 誘몄뒪?? ?뺥깭????以?洹몃９ ?쒖떆濡?蹂寃?
- `memorize` 移대뱶?먯꽌 `Correct / Wrong / Reset` ?섎룞 踰꾪듉 ?쒓굅.
- 媛??⑥뼱 ?놁뿉 ?ㅽ뵾而??꾩씠肄?踰꾪듉 異붽?(釉뚮씪?곗? `SpeechSynthesis` 諛쒖쓬 ?ъ깮).
- ?섎? ?뚯꽌 蹂댁젙:
  - `(遺)?뺥솗(閭ｇ▶)?? 媛숈? 臾몄옄?댁뿉??`(閭ｇ▶)`瑜??덉궗 ?쒓렇濡??ㅼ씤?섏? ?딅룄濡??섏젙.
  - 寃곌낵媛 `遺???뺥솗(閭ｇ▶)?? ?뺥깭濡??덉젙?곸쑝濡??쒖떆??
- "留덉?留??⑥뼱???댁뼱?? 媛쒖꽑:
  - ?숈뒿 ?붾㈃ 吏꾩엯 ??`last_study_wordbook_id` 荑좏궎瑜????
  - `/wordbooks` ??쒕낫??異붿쿇 CTA????荑좏궎瑜??곗꽑 ?ъ슜???ㅼ젣 留덉?留됱쑝濡??숈뒿???⑥뼱?μ쑝濡??대룞.
- ?⑥뼱???앹꽦 ?뺤콉/媛?대뱶 蹂닿컯:
  - ?쒕쾭?먯꽌 FREE ?앹꽦 1???쒗븳, PRO 臾댁젣???앹꽦??媛뺤젣.
  - `/wordbooks/new`??醫뗭? ?⑥뼱???묒꽦 媛?대뱶?쇱씤(?쒕ぉ/?ㅻ챸/援ъ꽦/?덈Ц ?먯튃) 異붽?.
- ?숈뒿 ?뚰듃(part) 湲곕뒫:
  - ?댁쫰? 由ъ뒪??`list-correct`, `list-wrong`, `list-half`)?먯꽌 part ?⑥쐞 ?숈뒿 吏??
  - part 湲곗?? `1踰덉㎏ ?⑥뼱 ~ n踰덉㎏ ?⑥뼱`, `n`? ?⑥뼱?λ퀎 ?ㅼ젙(濡쒖뺄 ????쇰줈 議곗젙.
  - 湲곕낯 part ?ш린(`n`)??30.
  - part 媛쒖닔??`?꾩껜 ?⑥뼱 ??/ n`?쇰줈 怨꾩궛.
  - 由ъ뒪???붾㈃ 媛?part 踰꾪듉??`p/n` ?쒖떆(`p`: ?대떦 由ъ뒪??議곌굔??留욌뒗 ?⑥뼱 ??.
- memorize 蹂닿컯:
  - ?섎떒 怨좎젙 而⑦듃濡ㅼ뿉 `留욎텣 ?⑥뼱 ?④?` ?좉? 異붽?(?뺣떟 ?곹깭 ?⑥뼱 ?쒖쇅, 濡쒖뺄 ???.
  - 湲곕낯 ?쒖떆 ?⑥뼱 媛쒖닔??4.
  - memorize ?붾㈃???곷떒 `Back` 踰꾪듉 ?쒓굅.
- ?댁쫰 UI 蹂댁젙:
  - ?댁쫰??`Mode` ?좏깮??蹂꾨룄 移대뱶?먯꽌 ?쒓굅?섍퀬 `?덉궗/?섎? ?쒖떆` 而⑦듃濡?移대뱶???듯빀???곷떒 怨듦컙???덉빟.
- 由щ럭 湲곕뒫:
  - ?ㅼ슫濡쒕뱶???⑥뼱???먮뒗 ?뚯쑀 ?⑥뼱?????됱젏怨??볤????④퍡 ???媛??
  - 留덉폆?먯꽌 蹂꾩젏 ?곸뿭 ?대┃ ??由щ럭 紐⑸줉(?볤? + ?됱젏) ?쇱퀜蹂닿린 吏??
- 諛고룷 ?덉젙??
  - `/wordbooks/new` 媛?대뱶 臾멸뎄??JSX ?댁뒪耳?댄봽瑜?蹂댁젙??`next build` ESLint(`react/no-unescaped-entities`) ?ㅽ뙣瑜??닿껐.

## 2026-02-17 Study/List/Quiz performance refactor (1~4 + extra observations)

- [x] `GET /api/wordbooks/[id]/study` was refactored to server-side paging/filtering.
  - Added query support: `view`, `page`, `take`, `q`, `hideCorrect`, `partSize`, `partIndex`.
  - `memorize`, `list-correct`, `list-wrong`, `list-half` no longer require full wordbook payloads.
- [x] `/wordbooks/[id]/memorize` client now consumes paged API data only.
  - Removed full in-memory filtering/pagination pattern on client.
  - Uses per-item `itemState` from API instead of loading full state maps.
- [x] `/wordbooks/[id]/list-*` client now uses server-driven part pagination and stats.
  - `partStats` (`p/n`) are computed on server and rendered directly by client.
- [x] `GET /api/wordbooks/[id]/quiz` now selects question candidates in DB.
  - Tiered random pick strategy: unseen -> wrong -> fallback.
  - Avoids loading all items/states for each quiz request.
- [x] Added DB indexes for state-heavy reads.
  - `WordbookStudyItemState(userId, wordbookId, status)`
  - `WordbookStudyItemState(userId, wordbookId, everCorrect, everWrong)`
  - Migration: `20260217021000_add_study_state_indexes`

Additional observations and guardrails:
- Client simplification is safe when authority remains on server (filters, paging, permissions).
- Keep all business rules centralized in API routes and return minimal DTOs to prevent drift.
- For very large datasets, consider cursor pagination for deep page access and cache `partStats` by `(userId, wordbookId, view, q, hideCorrect, partSize)`.
- [x] Extra guardrail applied:
  - Added in-memory TTL cache (30s) for study `partStats` in `GET /api/wordbooks/[id]/study`.
  - Added cache invalidation on study mutations:
    - `POST /api/wordbooks/[id]/study/items/[itemId]`
    - `POST /api/wordbooks/[id]/quiz/submit`
    - `POST /api/wordbooks/[id]/sync-download` (when study state reset)
- [x] Client simplification follow-up:
  - `WordbookStudyClient` now resets paging through input handlers (`query/pageSize/hideCorrect`) instead of separate reset effects.
  - Removed redundant `useMemo` usage for progress and simplified page clamping flow.
  - `WordbookListClient` removed duplicated title state and uses memoized part-stat lookup map.
- [x] Loading UI stabilization:
  - Removed inline `Loading...` text blocks that pushed content down.
  - Added non-layout-shifting loading badge overlay (`absolute`) with `min-h` containers in memorize/list study views.

## 2026-02-16 Text encoding and quiz feedback fixes

- Fixed broken text rendering (mojibake) in:
  - `/wordbooks/[id]/list-correct`
  - `/wordbooks/[id]/list-wrong`
  - `/wordbooks/[id]/list-half`
  - related study/quiz/review labels in shared clients
- Updated quiz result UX:
  - Correct answer now shows a green `?뺣떟` feedback panel.
  - Wrong answer now shows a red `?ㅻ떟` feedback panel and the actual correct answer.
  - Added explicit `?ㅼ쓬 臾몄젣` action after each submission.

## 2026-02-16 Button visual polish (SaaS tone)

- Updated button color tokens:
  - `--primary: #2563EB`
  - `--accent: #F59E0B`
- Refined button hierarchy:
  - `ui-btn-primary`: solid blue, stronger contrast
  - `ui-btn-accent`: solid orange, darker hover, cleaner CTA emphasis
  - `ui-btn-secondary`: soft tinted secondary (no heavy empty outlines)
- Updated tab states to match the same hierarchy:
  - `ui-tab-active`: filled primary
  - `ui-tab-inactive`: soft secondary tint
- Applied secondary tone to memorize bottom controls to reduce outline noise.
- Pricing `Recommended` badge now uses token-based accent styling (`ui-badge-accent`).

## 2026-02-16 UX fixes (rating/quiz/memorize)

- Fixed wordbook rating star glyph rendering (`??` -> `??) in `StarRating`.
- Quiz flow improvements:
  - Removed in-panel mode selector from `/wordbooks/[id]/quiz` UI.
  - Kept explicit `?ㅼ쓬 臾몄젣` button after grading.
  - Added Enter-key progression after grading (press Enter to move to next question).
- Memorize bottom fixed bar stability:
  - Bottom control bar now stays mounted while loading (no disappear/reappear flicker).
  - Controls are disabled during loading instead of unmounting the bar.

## 2026-02-17 Daily goal dashboard update

- Added per-user daily goal setting (`User.dailyGoal`, default `30`).
- New endpoint: `POST /api/users/me/daily-goal`
  - payload: `{ "dailyGoal": number }` (`1..500`)
- Dashboard metric changed:
  - Old: cumulative accuracy (`correctCount / studiedCount`)
  - New: daily progress (`todayCorrect / dailyGoal * 100`, capped at 100)
- Daily correct count uses `WordbookStudyItemState`:
  - condition: `lastResult = CORRECT` and `updatedAt` within today.
- Added index for daily aggregation performance:
  - `WordbookStudyItemState(userId, lastResult, updatedAt)`
- Added UI control to update daily goal in Learning Dashboard.

## 2026-02-17 Wordbooks CTA deduplication

- Simplified duplicated navigation actions in `/wordbooks`:
  - Removed dashboard-level `?⑥뼱????李얘린` button (duplicate of top `Market` action).
  - Reduced lower empty-state actions to a single primary CTA each.
- Goal:
  - Keep top-level quick actions as global navigation.
  - Avoid repeating the same destination buttons in lower sections.

## 2026-02-17 Wordbook quiz SRS update

- Updated quiz interval policy for correct answers:
  - 1st correct: +1 hour
  - 2nd correct: +1 day
  - 3rd correct: +3 days
  - 4th correct: +7 days
  - 5th+ correct: +30 days
- Meaning quiz and word quiz are now scheduled independently in wordbook quiz mode.
  - Correct streak and next-review timestamps are tracked per mode.
- Wrong-answer requeue policy added for wordbook quiz:
  - Wrong item reappears after 10 quiz submissions in the same mode.
  - If fewer than 10 questions remain in cycle, wrong items are brought back at the tail.
- Added schema support for mode-specific SRS fields:
  - `WordbookStudyState.meaningQuestionCount`, `WordbookStudyState.wordQuestionCount`
  - `WordbookStudyItemState.meaningCorrectStreak`, `meaningNextReviewAt`, `meaningWrongRequeueAt`
  - `WordbookStudyItemState.wordCorrectStreak`, `wordNextReviewAt`, `wordWrongRequeueAt`
  - New indexes for mode-specific review/requeue lookups.

## 2026-02-17 Wordbook detail error fallback

- Added route-level error UI for `/wordbooks/[id]`:
  - file: `app/wordbooks/[id]/error.tsx`
  - replaces generic production `Application error` screen with a recoverable page (`?ㅼ떆 ?쒕룄`, `???⑥뼱?μ쑝濡??대룞`).

## 2026-02-17 /wordbooks/[id] server-client boundary fix

- Fixed production runtime digest `2262071249` on `/wordbooks/[id]`.
- Root cause: `WordbookStudyTabs` was a Server Component using `onClick` (client event handler) on `Link`.
- Change: marked `components/wordbooks/WordbookStudyTabs.tsx` as a Client Component (`"use client"`).
- Result: removed `Event handlers cannot be passed to Client Component props` runtime failure.

## 2026-02-17 Public preview and bot-access path split

- Added public, no-login read-only access for:
  - `/wordbooks/market`
  - `/wordbooks/[id]` (detail page only)
  - `/api/wordbooks/market`
  - `/api/wordbooks/[id]/reviews`
- Kept study/personal routes protected (memorize/quiz/list/my library APIs).
- Added temporary preview cookie flow:
  - `GET /preview-access?token=...&next=/path`
  - Validates `PREVIEW_ACCESS_TOKEN` and sets `preview_access` cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, 1h).
  - Middleware bypasses login redirect while cookie is valid.
- Market/detail pages now render guest read-only mode and show login CTA for download/rating/report actions.

## 2026-02-17 Public landing and embedded login UX

- Made `/` publicly accessible in middleware so first-time visitors are not forced into immediate redirect.
- Reworked home page into a landing layout:
  - left: product value/flow cards
  - right: embedded login panel
- Added reusable login component:
  - `components/auth/LoginPanel.tsx`
  - shared by both `/` and `/login`
- `/login` now uses the shared panel while preserving `next` redirect behavior.

## 2026-02-17 Market button hierarchy tuning

- `/wordbooks/market` action hierarchy tightened without layout changes.
- `Apply` remains primary filled button (`ui-btn-primary`).
- `Prev/Next` keep soft secondary treatment (`ui-btn-secondary`, no heavy outline style).
- Card CTA hierarchy clarified:
  - logged-in `Download`: accent filled with stronger CTA radius (`rounded-2xl`)
  - guest `Login to download`: soft secondary (`ui-btn-secondary`, `rounded-xl`)
- `DownloadButton` now supports optional `className` override for page-level CTA tuning.

## 2026-02-17 CI scheduling test alignment

- Synced `lib/scheduling.test.ts` expectations with active SRS policy:
  - streak 3 => +3 days
  - streak 4 => +7 days
  - streak 5+ => +30 days
- Fixes failing `npm run test` check in CI.

## 2026-02-17 Auth-aware home/nav and wordbook detail text/link fixes

- Home page (`/`) is now auth-aware:
  - logged-out users see the right-side login panel
  - logged-in users no longer see login form and get quick action cards instead
- Global nav auth actions are now conditional:
  - logged-in: `Logout` only
  - logged-out: `Login` only
- Fixed mojibake text on `/wordbooks/[id]` version section:
  - restored `내 버전 / 최신 버전`, `변경 요약` labels
- Updated wordbook title routing from `/wordbooks`:
  - title click now opens `/wordbooks/[id]` (detail)
  - no longer forces `/wordbooks/[id]/memorize` from title click

## 2026-02-17 Market fixed bottom pagination

- Added fixed bottom pagination bar on `/wordbooks/market` so `Prev/Next` are always reachable while scrolling.
- Uses the same query state (`q`, `sort`, `page`) as top pagination.
- Added bottom spacing (`pb-24`) to avoid content overlap with fixed controls.

## 2026-02-17 Home CTA dedup (logged-in)

- Reduced duplicate actions on `/` for logged-in users.
- Left area now exposes a single primary CTA (`내 단어장 열기`) when authenticated.
- Removed duplicated right-panel action buttons for authenticated view.

## 2026-02-17 Market block action placement

- Added creator block action directly in market card action area (`/wordbooks/market`).
- For logged-in users, `Block Creator` now appears below download/login action so blacklist flow is usable where discovery happens.
- Hidden for the current user's own wordbooks.

## 2026-02-17 Block confirmation copy update

- Updated block confirmation dialog copy to:
  - "진짜 블랙 하시겠습니까?"
  - "블랙 해제는 내 단어장의 블랙 안에서 해제할수있습니다."
- Removed unused `ownerEmail` prop from `BlockOwnerButton` and updated call sites.

## 2026-02-17 Blocked label rename to blacklist

- Renamed My Library quick link label from `Blocked` to `블랙리스트`.
- Updated blocked owners page copy to `블랙리스트` terminology.
- Updated block confirmation copy to: "블랙 해제는 내 단어장의 블랙리스트 안에서 해제할수있습니다."
- Synced e2e UI flow assertion to wait for `블랙리스트` link text.

## 2026-02-17 Fix mojibake text in wordbook review input

- Fixed broken Korean placeholder text in `/wordbooks/[id]` review textarea.
- Updated `RateBox` placeholder to: `리뷰를 입력해주세요 (선택)`.

## 2026-02-17 Review write gating by download status

- Enforced review write UX on `/wordbooks/[id]`: write form is shown only for owner or users who downloaded the wordbook.
- For non-downloaded users, detail page now shows rating summary + 안내 문구 and hides the review textarea/button.
- Market review viewing remains read-only (no write controls).
- Server-side `/api/wordbooks/[id]/rate` download check remains active.

## 2026-02-17 UI Korean localization sweep

- Translated user-facing UI text across major pages/components from English to Korean:
  - navigation, home, login/logout, pricing, market, wordbook library/detail, memorize/quiz/list, offline, admin
  - review/report/block/download/offline/import-export/edit actions and status messages
- Replaced multiple English fallback/error/action labels with Korean equivalents for clearer meaning.
- Fixed mojibake-corrupted files and text:
  - `components/wordbooks/DailyGoalSetter.tsx`
  - `app/wordbooks/[id]/error.tsx`
- Kept technical literals where appropriate (e.g., `TSV/CSV`, enum values) while localizing visible labels.

## 2026-02-17 Wordbook create UX upgrade (paste/upload/manual + preview/validation)

- Saved execution spec and checklist:
  - `docs/commands/wordbook-create-ux-final.md`
  - `docs/commands/wordbook-create-ux-checklist.md`
- Rebuilt `/wordbooks/new` create flow:
  - top format guide with TSV/CSV examples, copy buttons, CSV template download
  - 3 import tabs (붙여넣기 / 파일 업로드 / 수동 입력)
  - shared preview table + validation summary (valid/invalid/duplicate warning)
  - save guard: title required + valid rows >= 1
  - final save transform to `{ position, term, meaning }` with sequential position re-generation
- Implemented 2-step failure handling:
  - Step1(create) failure keeps input and shows error
  - Step2(items save) failure stores `pending_wordbook_items_${wordbookId}` and redirects to detail
- Added detail-page retry banner component:
  - `components/wordbooks/PendingWordbookItemsRetryBanner.tsx`
  - shows warning + `단어 다시 업로드` action when pending items exist in localStorage
  - retry success clears pending localStorage
- Wired detail page to render retry/flash banner for owner view.

## 2026-02-17 Plan downgrade warning + private lock policy (Plan B)

- Added cancellation/downgrade warning on `/pricing`:
  - PRO -> FREE does not delete private wordbooks, but locks study/edit until republish(public) or re-upgrade.
- Added admin downgrade confirmation warning in `components/admin/UserPlanEditor.tsx`.
- Enforced private-lock mutation guard for FREE owners on private wordbooks:
  - `PATCH /api/wordbooks/[id]`
  - `POST /api/wordbooks/[id]/items`
  - `PATCH|DELETE /api/wordbooks/[id]/items/[itemId]`
  - `POST /api/wordbooks/[id]/import`
- Updated `/wordbooks/[id]` owner UX:
  - lock notice banner for FREE + private owner
  - hide study/edit/import actions while locked
  - keep publish toggle visible for private owners so they can switch to public

## 2026-02-17 Free plan download limit changed to cumulative words

- Replaced FREE download policy from "lifetime number of downloads" to "cumulative downloaded word count".
- Introduced shared limit/token in `lib/planLimits.ts`:
  - `FREE_DOWNLOAD_WORD_LIMIT = 1000`
  - `getUserDownloadedWordCount(userId)` uses `snapshotItemCount` with fallback aggregation.
- Enforced in `POST /api/wordbooks/[id]/download`:
  - FREE users are blocked when `usedWords + targetWordbookItemCount > FREE_DOWNLOAD_WORD_LIMIT`.
- Updated UI/plan surfaces to show word-based usage:
  - `/wordbooks`
  - `/wordbooks/market`
  - `/wordbooks/[id]`
  - `/pricing`
- Updated auth plan payload in `/api/auth/me`:
  - `downloadWordsUsed`, `freeDownloadWordLimit`, `freeDownloadWordsRemaining`

## 2026-02-17 Encoding safety guardrails

- Added repository-level encoding guardrails to prevent non-UTF-8 source issues:
  - `AGENTS.md`: UTF-8 (no BOM) policy + required `npm run build` check after text-heavy edits.
  - `.editorconfig`: `charset = utf-8`, `end_of_line = lf`, final newline policy.
  - `.gitattributes`: text normalization and LF policy for source/config file types.
- Strengthened CI (`.github/workflows/ci.yml`) by adding `npm run build` so encoding problems are caught before deployment.

## 2026-02-17 현재 요금제 정책 정리

### FREE
- 단어장 생성: 평생 1개 제한
- 단어장 공개 범위: 공개만 가능(비공개 불가)
- 다운로드 한도: 누적 1000단어까지
  - 기준: 이미 다운로드한 단어 수(`snapshotItemCount` 기준, 필요 시 fallback 집계) + 새로 다운로드할 단어장 단어 수
  - 합계가 1000을 초과하면 다운로드 차단
- PRO에서 FREE로 내려온 경우:
  - 기존 비공개 단어장은 자동 삭제되지 않음
  - 단, 잠금 상태로 전환되어 학습/수정 불가
  - 공개 전환 또는 PRO 재구독 시 다시 사용 가능

### PRO
- 단어장 생성: 무제한
- 단어장 공개 범위: 공개/비공개 선택 가능
- 다운로드 한도: 무제한

### 서버 강제 포인트
- 다운로드 제한은 서버 API(`POST /api/wordbooks/[id]/download`)에서 강제
- FREE + 비공개(소유자) 잠금 정책은 학습/수정 API와 화면에서 함께 강제/안내
- 관련 안내 문구는 `/pricing`, 관리자 플랜 변경 UI, 단어장 상세 화면에 반영
- `/pricing` 페이지에 요금제 정책 요약 블록을 추가해 화면에서 바로 확인 가능하도록 변경
  - FREE/PRO 핵심 정책(생성 한도, 다운로드 누적 단어 한도, 공개/비공개 권한)
  - PRO -> FREE 강등 시 비공개 단어장 잠금 정책 명시
- `/pricing` 텍스트 인코딩 깨짐을 제거하고 UTF-8(무 BOM)으로 재저장

## 2026-02-17 Google OAuth login added

- Added Google OAuth start/callback routes:
  - `GET /api/auth/google`
  - `GET /api/auth/google/callback`
- Login page now provides `구글로 로그인` button and shows OAuth error messages.
- Callback route behavior:
  - verifies OAuth `state` cookie
  - exchanges code for Google token
  - fetches verified email from Google userinfo
  - links to existing user by email or creates new user automatically
  - issues existing app session cookie + csrf cookie

### Required env vars
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Optional env var
- `GOOGLE_REDIRECT_URI`
  - if omitted, defaults to `{origin}/api/auth/google/callback`

## 2026-02-17 Naver/Kakao OAuth login + account linking

- Added OAuth routes for Naver and Kakao:
  - `GET /api/auth/naver`, `GET /api/auth/naver/callback`
  - `GET /api/auth/kakao`, `GET /api/auth/kakao/callback`
- Login UI now supports 3 providers:
  - Google / Naver / Kakao buttons on `/login`
- Added provider account linking table/model:
  - `OAuthAccount` (`provider`, `providerUserId` unique)
  - user-level provider uniqueness (`userId`, `provider` unique)
- Account linking behavior:
  - If provider account already linked: login linked user
  - If not linked: link to current logged-in user (if exists), else link by email, else create user and link
- Added migration:
  - `prisma/migrations/20260217183000_add_oauth_accounts/migration.sql`

### OAuth env vars
- Google
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`(optional)
- Naver
  - `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_REDIRECT_URI`(optional)
- Kakao
  - `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`(optional)

## 2026-02-17 TODO status update

- Remaining TODOs:
  - 결제 연동(월/연 구독) + 자동 플랜 활성화/만료 처리
  - 관측성 스택 추가(구조화 로그, 에러 추적, 라우트별 4xx/5xx/지연 대시보드)
- 로그인 페이지 소셜 로그인 버튼 UX 개선:
  - `onClick` JS 이동 대신 직접 링크(`href`) 방식으로 변경해 클릭 무반응 가능성 제거
  - 구글 버튼을 일반 서비스 패턴(화이트 배경 + 구글 아이콘)으로 변경
  - 네이버/카카오 버튼도 브랜드 컬러 기반으로 직관성 강화

## 2026-02-17 Payment integration + observability stack

- Added Stripe subscription integration:
  - `POST /api/payments/checkout` (monthly/yearly checkout session)
  - `POST /api/payments/portal` (billing portal)
  - `POST /api/payments/webhook` (Stripe webhook)
- Webhook lifecycle handling:
  - `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`
  - Auto plan activation/renewal/cancel sync to `User.plan` / `User.proUntil`
- Added automatic plan expiry cron endpoint:
  - `POST /api/internal/cron/plan-expire` (Bearer `CRON_SECRET`)
- Added payment persistence fields/events:
  - `User.stripeCustomerId`, `User.stripeSubscriptionId`, `User.stripeSubscriptionStatus`
  - `PaymentEvent` table

- Added observability stack baseline:
  - Structured JSON logger (`lib/logger.ts`)
  - API metric/event capture helpers (`lib/observability.ts`)
  - `ApiRequestMetric`, `AppErrorEvent` tables
  - Admin metrics API: `GET /api/admin/metrics`
  - Admin UI panel showing route-level 4xx/5xx/latency and recent error events

### New payment env vars
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `STRIPE_PORTAL_RETURN_URL`

## 2026-02-17 TODO status (updated)

- Core TODO implementation status:
  - [x] 결제 연동(월/연 구독) + 자동 플랜 활성화/만료 처리
  - [x] OAuth 로그인(구글/네이버/카카오) + 계정 연결
  - [x] 관측성 스택 추가(구조화 로그, 에러 추적, 라우트별 4xx/5xx/지연 대시보드)
- Remaining operational work:
  - Stripe/Provider 실키 및 콘솔 설정 반영
  - `plan-expire`, `wordbook-rank` 크론 스케줄 연결
- 브랜드 자산 적용: `appicon.png`/`pabicon.png`/`logo.png`를 기반으로 `public/` 아이콘 세트 생성
  - `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`
  - `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`
  - `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`
  - `logo.png`, `og-image.png`, `site.webmanifest`
- `app/layout.tsx` metadata에 icons/openGraph/twitter/manifest 연결 및 `metadataBase` 적용
- 파비콘 색감 통일: `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`를 `appicon` 기반으로 재생성해 브랜드 블루 톤을 일치시킴
- `favicon.ico` 생성 방식을 변경(PNG-in-ICO)하여 일부 브라우저/OS에서 발생하던 색상 왜곡(초록색 틴트) 문제를 수정

## 2026-02-17 OAuth callback redirect host fix (www/railway loop)

- Fixed OAuth callback redirect host resolution for Google/Naver/Kakao:
  - Changed callback/login redirects to use eq.nextUrl.origin instead of eq.url as URL base.
  - Prevents accidental redirects to internal host like https://localhost:8080/... behind edge/proxy.
- Applied same fix to preview access redirect route.
- Impact:
  - Stops post-login redirect loops/infinite loading caused by wrong callback return host.
- Added `lib/publicOrigin.ts`:
  - resolves public origin using `NEXT_PUBLIC_APP_URL` or proxy headers (`x-forwarded-host` / `x-forwarded-proto`)
  - avoids internal host leakage in edge/proxy runtime.

### Operational notes

- In production, set NEXT_PUBLIC_APP_URL=https://www.oingapp.com so metadata URLs do not fall back to http://localhost:3000.
- Keep OAuth provider redirect URIs registered for every served host (localhost / railway / www).
