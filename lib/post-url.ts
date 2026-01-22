/**
 * 포스트 URL 생성 유틸리티
 *
 * ContentType이 있는 포스트는 /{pluralSlug}/{postSlug} 형식
 * ContentType이 없는 포스트는 /post/{postSlug} 형식
 */

interface PostWithContentType {
  slug: string | null;
  type?: "COMMIT_BASED" | "MANUAL";
  contentType?: {
    slug?: string;
    pluralSlug?: string;
  } | null;
}

/**
 * 포스트의 공개 URL을 생성합니다.
 *
 * @param post - slug, type, contentType을 포함한 포스트 객체
 * @returns 포스트의 공개 URL
 *
 * @example
 * // COMMIT_BASED 타입 (개발 로그)
 * getPostUrl({ slug: 'my-log', type: 'COMMIT_BASED' })
 * // => '/log/my-log'
 *
 * // ContentType이 있는 경우
 * getPostUrl({ slug: 'my-post', contentType: { pluralSlug: 'stories' } })
 * // => '/stories/my-post'
 *
 * // ContentType이 없는 경우
 * getPostUrl({ slug: 'my-post', contentType: null })
 * // => '/post/my-post'
 */
export function getPostUrl(post: PostWithContentType): string {
  // slug가 없으면 루트로 이동
  if (!post.slug) {
    return "/";
  }

  // COMMIT_BASED 타입은 /log/ 경로
  if (post.type === "COMMIT_BASED") {
    return `/log/${post.slug}`;
  }

  // pluralSlug가 있으면 우선 사용 (목록 URL용)
  if (post.contentType?.pluralSlug) {
    return `/${post.contentType.pluralSlug}/${post.slug}`;
  }

  // slug만 있는 경우 (단수형)
  if (post.contentType?.slug) {
    return `/${post.contentType.slug}/${post.slug}`;
  }

  // ContentType이 없으면 기본 /post/ 경로
  return `/post/${post.slug}`;
}

/**
 * 포스트 목록 URL을 생성합니다.
 *
 * @param contentType - pluralSlug를 포함한 콘텐츠 타입 객체
 * @returns 포스트 목록 URL
 */
export function getContentTypeListUrl(contentType: {
  pluralSlug: string;
}): string {
  return `/${contentType.pluralSlug}`;
}
