/**
 * XPath 기반 텍스트 선택 위치 저장/복원 유틸리티
 * CSS Custom Highlight API와 함께 사용하여 인라인 댓글 하이라이트 구현
 */

export interface XPathRange {
  startXPath: string;
  startOffset: number;
  endXPath: string;
  endOffset: number;
  selectedText: string;
}

/**
 * 노드에서 XPath 경로 생성
 * 마크다운 렌더링 결과 기준으로 상대 경로 생성
 */
export function getXPath(node: Node, root: Element): string {
  const parts: string[] = [];
  let current: Node | null = node;

  while (current && current !== root && root.contains(current)) {
    if (current.nodeType === Node.TEXT_NODE) {
      const textParent: ParentNode | null = current.parentNode;
      if (textParent) {
        const textNodes = Array.from(textParent.childNodes).filter(
          (n) => n.nodeType === Node.TEXT_NODE
        );
        const index = textNodes.indexOf(current as ChildNode);
        parts.unshift(`text()[${index + 1}]`);
        current = textParent as Node;
      } else {
        break;
      }
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as Element;
      const elementParent: ParentNode | null = element.parentNode;
      if (elementParent && "children" in elementParent) {
        const siblings = Array.from(
          (elementParent as Element).children
        ).filter((el) => el.tagName === element.tagName);
        const index = siblings.indexOf(element);
        parts.unshift(`${element.tagName.toLowerCase()}[${index + 1}]`);
        current = elementParent as Node;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return parts.join("/");
}

/**
 * XPath 경로에서 노드 찾기
 */
export function getNodeFromXPath(xpath: string, root: Element): Node | null {
  if (!xpath) return null;

  try {
    const result = document.evaluate(
      xpath,
      root,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  } catch {
    // XPath 평가 실패 시 null 반환
    return null;
  }
}

/**
 * Selection에서 XPath 범위 추출
 */
export function getSelectionXPathRange(
  selection: Selection,
  root: Element
): XPathRange | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);

  // 선택이 root 내부에 있는지 확인
  if (!root.contains(range.commonAncestorContainer)) {
    return null;
  }

  const startXPath = getXPath(range.startContainer, root);
  const endXPath = getXPath(range.endContainer, root);

  if (!startXPath || !endXPath) {
    return null;
  }

  return {
    startXPath,
    startOffset: range.startOffset,
    endXPath,
    endOffset: range.endOffset,
    selectedText: selection.toString().trim(),
  };
}

/**
 * XPath 범위에서 Range 객체 복원
 */
export function createRangeFromXPath(
  xpathRange: Pick<
    XPathRange,
    "startXPath" | "startOffset" | "endXPath" | "endOffset"
  >,
  root: Element
): Range | null {
  const startNode = getNodeFromXPath(xpathRange.startXPath, root);
  const endNode = getNodeFromXPath(xpathRange.endXPath, root);

  if (!startNode || !endNode) {
    return null;
  }

  try {
    const range = new Range();
    range.setStart(startNode, xpathRange.startOffset);
    range.setEnd(endNode, xpathRange.endOffset);
    return range;
  } catch {
    // Range 생성 실패 (offset 범위 초과 등)
    return null;
  }
}

/**
 * 선택된 텍스트로 폴백 검색
 * XPath 복원 실패 시 텍스트 매칭으로 위치 찾기
 */
export function findTextInElement(
  text: string,
  root: Element
): Range | null {
  if (!text || !root) return null;

  const treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    null
  );

  let node: Node | null;
  while ((node = treeWalker.nextNode())) {
    const textContent = node.textContent || "";
    const index = textContent.indexOf(text);

    if (index !== -1) {
      try {
        const range = new Range();
        range.setStart(node, index);
        range.setEnd(node, index + text.length);
        return range;
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * 댓글의 Range 복원 (XPath 우선, 텍스트 폴백)
 */
export function restoreCommentRange(
  comment: XPathRange,
  root: Element
): Range | null {
  // 1차: XPath로 복원 시도
  const range = createRangeFromXPath(comment, root);
  if (range) {
    // 복원된 범위의 텍스트가 원본과 일치하는지 확인
    const restoredText = range.toString().trim();
    if (restoredText === comment.selectedText) {
      return range;
    }
  }

  // 2차: 텍스트 검색으로 폴백
  return findTextInElement(comment.selectedText, root);
}
