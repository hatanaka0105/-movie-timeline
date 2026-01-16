import { Movie, TimelineLayout } from '../types/movie.types';

// サムネイルサイズごとの幅と高さ
const CARD_DIMENSIONS = {
  small: { width: 80, height: 120 },    // w-20
  medium: { width: 160, height: 240 },  // w-40
  large: { width: 224, height: 336 },   // w-56
};

const HORIZONTAL_SPACING = 20; // px between cards
const VERTICAL_SPACING = 60; // px between cards vertically (for year labels)
const LEFT_MARGIN = 40; // px margin from left side (to avoid year markers)
const SPAN_WIDTH = 20; // スパンの衝突判定用幅（4pxの実際の幅 + マージン）

export function calculateTimelineLayout(
  movies: Movie[],
  containerWidth: number,
  pixelsPerYear: number = 10, // 動的スケール: デフォルト10px
  thumbnailSize: 'small' | 'medium' | 'large' = 'medium'
): TimelineLayout[] {
  if (movies.length === 0) return [];

  const cardDim = CARD_DIMENSIONS[thumbnailSize];

  // ソート: 時代設定の開始年でソート
  const sorted = [...movies].sort((a, b) => {
    const yearA = a.timeline.startYear ?? 9999999;
    const yearB = b.timeline.startYear ?? 9999999;
    return yearA - yearB;
  });

  // 最小年を基準点とする
  const minYear = Math.min(
    ...sorted
      .map(m => m.timeline.startYear)
      .filter((y): y is number => y !== null)
  );

  // コンテナ幅から配置可能なカラム数を計算
  const columns = Math.max(1, Math.floor(containerWidth / (cardDim.width + HORIZONTAL_SPACING)));

  const layout: TimelineLayout[] = [];
  // 配置済みの矩形を管理（衝突検出用）
  const occupiedRects: Array<{ x: number; y: number; width: number; height: number; isSpan?: boolean }> = [];

  // 衝突検出関数
  const hasCollision = (x: number, y: number): boolean => {
    const newRect = {
      x: x - cardDim.width / 2,
      y,
      width: cardDim.width,
      isSpan: false,
      height: cardDim.height + VERTICAL_SPACING,
    };

    return occupiedRects.some((rect) => {
      return !(
        newRect.x + newRect.width < rect.x ||
        newRect.x > rect.x + rect.width ||
        newRect.y + newRect.height < rect.y ||
        newRect.y > rect.y + rect.height
      );
    });
  };

  sorted.forEach((movie) => {
    const movieYear = movie.timeline.startYear;

    if (movieYear === null) {
      // 時代不明の映画は特殊な時代設定セクションで表示されるため、
      // このレイアウト計算には含まれないはずだが、念のため無視
      return;
    }

    // Y座標を年代に比例して計算
    const yearDiff = movieYear - minYear;
    const baseY = yearDiff * pixelsPerYear;

    // スパンの高さを計算（endYearがある場合）
    let spanHeight = 0;
    if (movie.timeline.endYear && movie.timeline.endYear !== movieYear) {
      const yearSpan = movie.timeline.endYear - movieYear;
      spanHeight = yearSpan * pixelsPerYear;
    }

    // 衝突しない位置を探す
    let finalX = 0;
    let finalY = baseY;
    let columnIndex = 0;
    let found = false;

    // まず横方向に探索
    for (let col = 0; col < columns && !found; col++) {
      const testX = LEFT_MARGIN + col * (cardDim.width + HORIZONTAL_SPACING);
      if (!hasCollision(testX, baseY)) {
        finalX = testX;
        finalY = baseY;
        columnIndex = col;
        found = true;
      }
    }

    // 横に空きがなければ縦にずらす
    if (!found) {
      let offsetY = baseY;
      const maxAttempts = 10;
      for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
        offsetY = baseY + (attempt + 1) * (cardDim.height + VERTICAL_SPACING);
        for (let col = 0; col < columns && !found; col++) {
          const testX = LEFT_MARGIN + col * (cardDim.width + HORIZONTAL_SPACING);
          if (!hasCollision(testX, offsetY)) {
            finalX = testX;
            finalY = offsetY;
            columnIndex = col;
            found = true;
          }
        }
      }
    }

    // 配置を記録
    layout.push({
      movieId: movie.id,
      x: finalX,
      y: finalY,
      column: columnIndex,
    });

    // サムネイルの占有領域を記録
    occupiedRects.push({
      x: finalX - cardDim.width / 2,
      y: finalY,
      width: cardDim.width,
      isSpan: false,
      height: cardDim.height + VERTICAL_SPACING,
    });

    // スパンがある場合、スパンの占有領域も記録
    if (spanHeight > 0) {
      occupiedRects.push({
        x: finalX - SPAN_WIDTH / 2,
        y: finalY,
        width: SPAN_WIDTH,
        height: spanHeight,
        isSpan: true,
      });
    }
  });

  return layout;
}

export interface YearMarker {
  year: number;
  y: number;
  isMajor: boolean; // 主要マーカー（太字表示用）
}

export function getYearMarkers(movies: Movie[], pixelsPerYear: number = 10): YearMarker[] {
  const years = movies
    .map((m) => m.timeline.startYear)
    .filter((y): y is number => y !== null);

  if (years.length === 0) return [];

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const span = maxYear - minYear;

  // 常に10年ごとに表示、スパンに応じて主要マーカー間隔を決定
  const minorInterval = 10;
  let majorInterval: number;

  if (span > 2000) {
    majorInterval = 500;
  } else if (span > 500) {
    majorInterval = 100;
  } else {
    majorInterval = 50;
  }

  const markers: YearMarker[] = [];
  const start = Math.floor(minYear / minorInterval) * minorInterval;
  const end = Math.ceil(maxYear / minorInterval) * minorInterval;

  for (let year = start; year <= end; year += minorInterval) {
    const yearDiff = year - minYear;
    markers.push({
      year,
      y: yearDiff * pixelsPerYear,
      isMajor: year % majorInterval === 0,
    });
  }

  return markers;
}

export function formatYear(year: number): string {
  if (year < 0) {
    return `紀元前${Math.abs(year)}年`;
  }
  return `${year}年`;
}

export function getTimelineHeight(
  movies: Movie[],
  layout: TimelineLayout[],
  pixelsPerYear: number = 10,
  thumbnailSize: 'small' | 'medium' | 'large' = 'medium'
): number {
  const years = movies
    .map((m) => m.timeline.startYear)
    .filter((y): y is number => y !== null);

  if (years.length === 0) return 0;

  const cardDim = CARD_DIMENSIONS[thumbnailSize];

  // レイアウトが空の場合は、従来の計算方法を使用
  if (layout.length === 0) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const span = maxYear - minYear;
    return span * pixelsPerYear + cardDim.height + 200;
  }

  // 実際の配置位置から最大Y座標を取得
  const maxY = Math.max(...layout.map(l => l.y));

  // スパンを考慮した最大高さを計算
  const moviesWithSpans = movies.filter(m => {
    const layoutItem = layout.find(l => l.movieId === m.id);
    return layoutItem && m.timeline.endYear && m.timeline.endYear !== m.timeline.startYear;
  });

  let maxSpanEnd = maxY;
  moviesWithSpans.forEach(movie => {
    const layoutItem = layout.find(l => l.movieId === movie.id);
    if (layoutItem && movie.timeline.startYear && movie.timeline.endYear) {
      const spanHeight = (movie.timeline.endYear - movie.timeline.startYear) * pixelsPerYear;
      const spanEnd = layoutItem.y + spanHeight;
      maxSpanEnd = Math.max(maxSpanEnd, spanEnd);
    }
  });

  return Math.max(maxY, maxSpanEnd) + cardDim.height + 200; // 余白を追加
}
