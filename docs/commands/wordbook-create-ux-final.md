# TASK: Wordbook Create UX (Paste/Upload/Manual + Preview/Validation)  FINAL

## DO NOT
- Do not change overall layout/frames.
- Do not change existing API shapes except wiring this page to them.

## DATA MODEL (MUST MATCH PROJECT)
### Input (user convenience)
- Supports:
  1) index,en,ko  (index optional)
  2) en,ko       (no index)

### Map to project fields
- en -> term
- ko -> meaning
- index -> position (temporary only)

### Save payload (ONLY this shape)
- NEVER submit index/en/ko.
- Submit items as:
  [{ position: 1, term: "...", meaning: "..." }, ...]

### Before saving
- Re-generate position sequentially 1..N in current row order.
- Filter out invalid rows (term/meaning empty).

---

## PAGE STRUCTURE

### [0] TOP PANEL (MUST be first thing on page)
Add a Format Guide panel at the very top with:
- Text:
  - "입력 포맷: index, en, ko (index는 선택이며 자동 생성됩니다)"
  - "저장 시 en->term, ko->meaning, index->position으로 매핑됩니다"
  - "엑셀/구글시트에서 복사 후 붙여넣기 가능"

Add TWO example blocks (explicit delimiters):
1) TSV (TAB-separated) example block:
index<TAB>en<TAB>ko
1<TAB>mister<TAB>(명)-님, -씨, 미스터
2<TAB>vacation<TAB>(명)휴가
3<TAB>client<TAB>(명)객, 고객, 손님, 고객님, 클라이언트

2) CSV (comma-separated) example block:
index,en,ko
1,mister,"(명)-님, -씨, 미스터"
2,vacation,"(명)휴가"
3,client,"(명)객, 고객, 손님, 고객님, 클라이언트"

Buttons in top panel:
- "TSV 예시 복사"
- "CSV 예시 복사"
- "CSV 템플릿 다운로드" (headers: index,en,ko)

TSV copy button implementation detail (MUST):
- Use real TAB characters via "\t" and navigator.clipboard.writeText(...)
Example:
const tsvExample =
`index\ten\tko
1\tmister\t(명)-님, -씨, 미스터
2\tvacation\t(명)휴가
3\tclient\t(명)객, 고객, 손님, 고객님, 클라이언트`;
await navigator.clipboard.writeText(tsvExample);

---

### [1] META FIELDS
Add fields:
- title (required)
- description (optional)
- direction (default en->ko if supported)

Disable submit until:
- title exists
- valid rows >= 1

---

### [2] IMPORT TABS (3)
Implement 3 tabs. Switching tabs must not discard parsed rows unless user clicks Reset.

#### Tab A: PASTE
- Textarea "여기에 붙여넣기"
- Accept TSV/CSV, with/without header, with/without index.

Parse rules:
1) If TAB detected => TSV else CSV.
2) Header detection (case-insensitive): index/en/ko.
3) If no header:
   - 3 cols => index,en,ko
   - 2 cols => en,ko
4) Map:
   - en -> term
   - ko -> meaning
   - index -> temporary position
5) Trim term/meaning.
6) Meaning may include commas/parentheses; quoted CSV must be supported.

Controls:
- Reset button (clears pasted data)

#### Tab B: UPLOAD
- Accept .csv, .tsv, .txt
- Parse using same rules as Paste.
- Show preview immediately.

#### Tab C: MANUAL
- Table editor with columns:
  - term (required)
  - meaning (required)
- "+ row" and optional "add 10 rows"
- position not editable (auto)

---

### [3] PREVIEW + VALIDATION (SHARED)
Always show when rows exist.

Preview table columns:
- position (auto)
- term
- meaning
- status

Row actions:
- inline edit term/meaning
- delete row

Validation rules:
- term required (after trim)
- meaning required (after trim)
- detect duplicate term (case-insensitive)
  - warn only; DO NOT block save
- empty rows -> invalid or auto-removed
- before saving -> reassign position 1..M

Summary banner above preview:
- total N
- valid V
- invalid I (filter invalid-only)
- duplicate warnings D

---

## SUBMIT FLOW (2-step, MUST respect existing API)
### Step1: Create wordbook
- If fails:
  - stay on page
  - show error toast
  - DO NOT lose user input

### Step2: Save items to created wordbook
- If fails (Step1 succeeded):
  1) navigate to detail page: /wordbooks/{wordbookId}
  2) show top warning banner:
     "단어장은 생성되었지만 단어 저장에 실패했습니다. 다시 시도해주세요."
  3) show button: "단어 다시 업로드"

Store original normalized items in localStorage for retry:
- key: pending_wordbook_items_${wordbookId}
- value: JSON.stringify(normalizedItems)

Detail page (/wordbooks/[id]) retry behavior:
- if localStorage key exists:
  - show warning banner + "단어 다시 업로드" button
  - clicking retry:
    - resend items
    - on success: remove localStorage key

### Success
- navigate to /wordbooks/{wordbookId}
- toast: "단어장 생성 완료"

---

## FINAL SAVE TRANSFORM (MUST)
Right before sending items:
- take only valid rows
- assign position sequentially

Example:
const finalItems = validRows.map((r, i) => ({
  position: i + 1,
  term: r.term.trim(),
  meaning: r.meaning.trim(),
}));

---

## ACCEPTANCE CHECKLIST
- Top guide exists with TSV+CSV examples and copy buttons.
- User can create without typing index.
- Spreadsheet paste works.
- Preview+validation works; duplicates warn only.
- Save sends {position,term,meaning}.
- Step2 fail -> /wordbooks/[id] + banner + retry using localStorage.

