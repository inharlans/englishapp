# Wordbook Create UX Checklist

- [x] 상단 포맷 가이드 패널 추가 (TSV/CSV 예시, 복사, 템플릿 다운로드)
- [x] 생성 메타(title/description/direction) + 제출 조건(title && valid>=1)
- [x] Paste 탭 구현 (TSV/CSV, 헤더 자동 인식, index 선택)
- [x] Upload 탭 구현 (.csv/.tsv/.txt 파싱)
- [x] Manual 탭 구현 (행 추가, 직접 입력)
- [x] Preview/Validation 공통 구현 (total/valid/invalid/duplicate, invalid 필터)
- [x] 저장 직전 finalItems 변환 ({position,term,meaning} 순번 재생성)
- [x] 2-step 생성 플로우 적용 (create wordbook -> add items)
- [x] Step1 실패 시 입력 유지 + 오류 표시
- [x] Step2 실패 시 localStorage(pending_wordbook_items_${wordbookId}) 저장 + 상세로 이동
- [x] 상세 페이지 상단 재시도 배너 + "단어 다시 업로드" 동작
- [x] 성공 시 상세 페이지 이동 + 완료 메시지 표시
- [x] 타입체크 통과
- [x] README 변경 이력 업데이트
