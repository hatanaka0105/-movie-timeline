export type Movie = {
  id: string;
  title: string;
  year: number; // 公開年
  posterUrl: string;
  timeline: {
    startYear: number | null;
    endYear: number | null;
    period: string;
    isEstimated?: boolean; // 推定値フラグ（公開年をフォールバックとして使用した場合）
    additionalYears?: number[]; // タイムトラベル映画用の追加の年代
    isPending?: boolean; // 年代判定処理中フラグ
  };
  genre: string[];
  synopsis: string;
}

export type TimelineLayout = {
  movieId: string;
  x: number;
  y: number;
  column: number;
}

export type FilterOptions = {
  genres: string[];
  yearRange: {
    min: number;
    max: number;
  };
  sortBy: 'timeline' | 'releaseDate' | 'title';
  showFuture: boolean;
  showPast: boolean;
}
