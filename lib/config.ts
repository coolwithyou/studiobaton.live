/**
 * 사이트 설정
 * 환경변수로 관리하여 배포 환경별 설정 가능
 */

// 사이트 URL (환경변수 또는 기본값)
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://log.ba-ton.kr";

// 사이트 메타데이터
export const SITE_NAME = "스튜디오 바톤 개발 로그";
export const SITE_TITLE = "스튜디오 바톤 개발 로그";
export const SITE_DESCRIPTION =
  "스튜디오 바톤 개발팀의 일상과 기술 이야기";
