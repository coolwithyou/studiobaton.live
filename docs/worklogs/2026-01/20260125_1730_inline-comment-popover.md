# 인라인 댓글 팝오버 개선

**날짜**: 2026-01-25
**작업자**: Claude (AI Assistant)
**관련 기능**: 인라인 댓글 시스템

---

## 작업 요약

ContentType 페이지에 댓글 기능 통합 및 호버 팝오버 UX 개선

---

## 변경 사항

### 1. ContentType 페이지 댓글 통합

**문제**: `/stories/ai-native` 등 ContentType 기반 페이지에서 댓글 기능이 작동하지 않음

**원인**: 댓글 시스템이 `/post/[slug]` 페이지에만 통합되어 있었고, `/[pluralSlug]/[postSlug]` 페이지에는 미적용

**해결**:
- `app/(public)/[pluralSlug]/[postSlug]/page.tsx`에 댓글 시스템 통합
- 권한 확인 및 데이터 조회 병렬화 (`Promise.all`)
- MANUAL/COMMIT_BASED 두 섹션 모두 `PostWithComments`로 래핑

**수정 파일**: [page.tsx](app/(public)/[pluralSlug]/[postSlug]/page.tsx)

---

### 2. 팝오버 미니멀 디자인 적용

**변경 전**: 선택된 텍스트 인용 블록 + 복잡한 레이아웃

**변경 후**:
- 아바타 + 작성자명 + 시간 + 댓글 내용만 표시
- 컴팩트한 레이아웃 (width: 280px)
- 배경 블러 효과 적용

**수정 파일**: [comment-hover-popover.tsx](components/comments/comment-hover-popover.tsx)

---

### 3. 팝오버 위치 및 접근성 개선

**문제**: 팝오버가 하이라이트 텍스트와 140px 떨어져 있어 삭제 버튼에 접근 불가

**해결**:
- 팝오버 위치: 하이라이트 **위** → 하이라이트 **아래** (8px 간격)
- 호버 타임아웃: 150ms → 300ms (팝오버 접근 시간 확보)

**수정 파일**:
- [comment-hover-popover.tsx](components/comments/comment-hover-popover.tsx)
- [use-highlight-comments.ts](hooks/use-highlight-comments.ts)

---

### 4. 클릭 시 팝오버 고정 기능

**문제**: 마우스가 하이라이트 영역을 벗어나면 팝오버가 사라져 삭제 버튼 클릭 불가

**해결**:
- 하이라이트 클릭 시 팝오버 "고정" (locked) 상태로 전환
- 고정 상태에서는 마우스가 벗어나도 팝오버 유지
- 팝오버 외부 클릭 시 닫힘 (AlertDialog 제외)
- `forwardRef`로 외부 클릭 감지 구현

**수정 파일**:
- [comment-hover-popover.tsx](components/comments/comment-hover-popover.tsx) - `isLocked` prop, `forwardRef` 추가
- [post-with-comments.tsx](components/post/post-with-comments.tsx) - 클릭 핸들링 로직

---

## 기술 상세

### 팝오버 위치 계산 로직

```typescript
const getPopoverStyle = useCallback(() => {
  const POPOVER_WIDTH = 280;
  const OFFSET = 8; // 하이라이트와의 간격

  let x = position.x - POPOVER_WIDTH / 2;
  // 하이라이트 바로 아래에 표시
  let y = position.y + 24 + OFFSET;

  // 화면 경계 처리
  if (x < 8) x = 8;
  if (x + POPOVER_WIDTH > window.innerWidth - 8) {
    x = window.innerWidth - POPOVER_WIDTH - 8;
  }
  // 하단 경계 초과 시 위쪽에 표시
  if (y + 100 > window.innerHeight) {
    y = position.y - 100 - OFFSET;
  }

  return { position: "fixed", left: `${x}px`, top: `${y}px` };
}, [position]);
```

### 외부 클릭 감지 패턴

```typescript
useEffect(() => {
  if (!activeCommentId) return;

  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    // 팝오버 내부 클릭은 무시
    if (popoverRef.current?.contains(target)) return;
    // AlertDialog는 portal로 렌더링되므로 별도 체크
    const alertDialog = document.querySelector('[role="alertdialog"]');
    if (alertDialog?.contains(target)) return;

    handleClosePopover();
  };

  const timer = setTimeout(() => {
    document.addEventListener("click", handleClickOutside);
  }, 100);

  return () => {
    clearTimeout(timer);
    document.removeEventListener("click", handleClickOutside);
  };
}, [activeCommentId, handleClosePopover]);
```

---

## 테스트 체크리스트

- [x] ContentType 페이지 (`/stories/*`)에서 댓글 하이라이트 표시
- [x] 하이라이트 호버 시 팝오버 표시 (하이라이트 아래)
- [x] 팝오버에서 마우스 벗어나도 300ms 딜레이
- [x] 하이라이트 클릭 시 팝오버 고정
- [x] 팝오버 외부 클릭 시 닫힘
- [x] 삭제 확인 다이얼로그 작동
- [x] 작성자/관리자만 삭제 버튼 표시

---

## 커밋 이력

- `style: 댓글 호버 팝업 미니멀 디자인 및 위치 고정`
- `fix: 페이지 새로고침 시 댓글 하이라이트 미표시 버그 수정`
- `style: 댓글 입력 폼 미니멀 디자인으로 개선`
