/**
 * GIPHY API 관련 타입 정의
 * @see https://developers.giphy.com/docs/api/schema
 */

export interface GiphyImageVariant {
  url: string;
  width: string;
  height: string;
  size?: string;
  mp4?: string;
  webp?: string;
}

export interface GiphyImages {
  /** 고정 높이 (200px) */
  fixed_height: GiphyImageVariant;
  /** 고정 너비 (200px) */
  fixed_width: GiphyImageVariant;
  /** 작은 고정 높이 (100px) */
  fixed_height_small: GiphyImageVariant;
  /** 원본 */
  original: GiphyImageVariant;
  /** 미리보기용 작은 GIF */
  preview_gif: {
    url: string;
    width: string;
    height: string;
  };
  /** 다운샘플된 버전 */
  downsized: GiphyImageVariant;
}

export interface GiphyGif {
  id: string;
  slug: string;
  url: string;
  title: string;
  rating: string;
  images: GiphyImages;
  username?: string;
  source?: string;
  import_datetime?: string;
  trending_datetime?: string;
}

export interface GiphyPagination {
  total_count: number;
  count: number;
  offset: number;
}

export interface GiphyMeta {
  status: number;
  msg: string;
  response_id: string;
}

export interface GiphySearchResponse {
  data: GiphyGif[];
  pagination: GiphyPagination;
  meta: GiphyMeta;
}
