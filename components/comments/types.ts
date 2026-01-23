/**
 * 댓글 시스템 공통 타입 정의
 */

export interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Comment {
  id: string;
  startXPath: string;
  startOffset: number;
  endXPath: string;
  endOffset: number;
  selectedText: string;
  content: string;
  createdAt: string;
  author: CommentAuthor;
}

export interface CommentFormData {
  startXPath: string;
  startOffset: number;
  endXPath: string;
  endOffset: number;
  selectedText: string;
  content: string;
}
