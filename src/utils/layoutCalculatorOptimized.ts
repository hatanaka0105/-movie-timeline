// Optimized layout calculator with Spatial Hashing
// O(n) collision detection instead of O(n²)

import { Movie } from '../types/movie.types';

export interface TimelineLayout {
  movieId: string;
  x: number;
  y: number;
  column: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  isSpan: boolean;
}

interface CardDimensions {
  width: number;
  height: number;
}

const CARD_DIMENSIONS: Record<'small' | 'medium' | 'large', CardDimensions> = {
  small: { width: 150, height: 225 },
  medium: { width: 200, height: 300 },
  large: { width: 250, height: 375 },
};

const HORIZONTAL_SPACING = 30;
const VERTICAL_SPACING = 20;
const LEFT_MARGIN = 150;
const SPAN_WIDTH = 4;

/**
 * Spatial Hash Grid for O(1) collision detection per cell
 */
class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, Rect[]>;

  constructor(cellSize = 200) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getCellsForRect(rect: Rect): string[] {
    const minCellX = Math.floor(rect.x / this.cellSize);
    const minCellY = Math.floor(rect.y / this.cellSize);
    const maxCellX = Math.floor((rect.x + rect.width) / this.cellSize);
    const maxCellY = Math.floor((rect.y + rect.height) / this.cellSize);

    const cells: string[] = [];
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        cells.push(`${cx},${cy}`);
      }
    }
    return cells;
  }

  insert(rect: Rect): void {
    const cells = this.getCellsForRect(rect);
    cells.forEach(cell => {
      if (!this.grid.has(cell)) {
        this.grid.set(cell, []);
      }
      this.grid.get(cell)!.push(rect);
    });
  }

  queryCollision(rect: Rect): boolean {
    const cells = this.getCellsForRect(rect);

    for (const cell of cells) {
      const rects = this.grid.get(cell);
      if (!rects) continue;

      for (const other of rects) {
        if (this.rectsIntersect(rect, other)) {
          return true;
        }
      }
    }
    return false;
  }

  private rectsIntersect(a: Rect, b: Rect): boolean {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }
}

/**
 * Optimized timeline layout calculation with Spatial Hashing
 * Complexity: O(n) instead of O(n²)
 */
export function calculateTimelineLayout(
  movies: Movie[],
  timelineWidth: number,
  pixelsPerYear: number = 10,
  thumbnailSize: 'small' | 'medium' | 'large' = 'medium'
): TimelineLayout[] {
  const layout: TimelineLayout[] = [];
  const cardDim = CARD_DIMENSIONS[thumbnailSize];

  // Calculate available columns
  const availableWidth = timelineWidth - LEFT_MARGIN - cardDim.width;
  const columns = Math.max(
    1,
    Math.floor(availableWidth / (cardDim.width + HORIZONTAL_SPACING))
  );

  // Initialize spatial hash grid
  const spatialGrid = new SpatialHashGrid(cardDim.height);

  // Filter movies with valid startYear
  const validMovies = movies.filter((m) => m.timeline.startYear !== null);

  if (validMovies.length === 0) return [];

  const minYear = Math.min(
    ...validMovies.map((m) => m.timeline.startYear as number)
  );

  // Helper function using spatial hash grid
  const hasCollision = (x: number, y: number): boolean => {
    const newRect: Rect = {
      x: x - cardDim.width / 2,
      y,
      width: cardDim.width,
      height: cardDim.height + VERTICAL_SPACING,
      isSpan: false,
    };

    return spatialGrid.queryCollision(newRect);
  };

  validMovies.forEach((movie) => {
    const startYear = movie.timeline.startYear as number;
    const yearDiff = startYear - minYear;
    const baseY = yearDiff * pixelsPerYear;

    // Calculate span height if applicable
    let spanHeight = 0;
    if (movie.timeline.endYear && movie.timeline.endYear !== startYear) {
      spanHeight = (movie.timeline.endYear - startYear) * pixelsPerYear;
    }

    let finalX = LEFT_MARGIN;
    let finalY = baseY;
    let columnIndex = 0;
    let found = false;

    // Try to find position in current row
    for (let col = 0; col < columns && !found; col++) {
      const testX = LEFT_MARGIN + col * (cardDim.width + HORIZONTAL_SPACING);
      if (!hasCollision(testX, baseY)) {
        finalX = testX;
        finalY = baseY;
        columnIndex = col;
        found = true;
      }
    }

    // If no space in current row, try rows below
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

    // Record layout
    layout.push({
      movieId: movie.id,
      x: finalX,
      y: finalY,
      column: columnIndex,
    });

    // Insert thumbnail occupied area into spatial grid
    const thumbnailRect: Rect = {
      x: finalX - cardDim.width / 2,
      y: finalY,
      width: cardDim.width,
      height: cardDim.height + VERTICAL_SPACING,
      isSpan: false,
    };
    spatialGrid.insert(thumbnailRect);

    // Insert span occupied area if applicable
    if (spanHeight > 0) {
      const spanRect: Rect = {
        x: finalX - SPAN_WIDTH / 2,
        y: finalY,
        width: SPAN_WIDTH,
        height: spanHeight,
        isSpan: true,
      };
      spatialGrid.insert(spanRect);
    }
  });

  return layout;
}

// Re-export utility functions from original layoutCalculator
export { getYearMarkers, formatYear, getTimelineHeight } from './layoutCalculator';
