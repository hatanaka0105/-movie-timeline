import { YearMarker, formatYear } from '../utils/layoutCalculator';

interface TimelineRulerProps {
  markers: YearMarker[];
  height: number;
}

export default function TimelineRuler({ markers, height }: TimelineRulerProps) {
  if (markers.length === 0) return null;

  return (
    <div className="relative w-16 md:w-24 flex-shrink-0 border-r border-amber-500/30">
      {/* 定規の背景 */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/50 to-transparent" />

      {/* 年代マーカー */}
      <div className="relative" style={{ height: `${height}px` }}>
        {markers.map((marker) => (
          <div
            key={marker.year}
            className="absolute left-0 right-0 flex items-center"
            style={{ top: `${marker.y}px` }}
          >
            {/* マーカー線 */}
            <div
              className={`${
                marker.isMajor
                  ? 'w-8 h-0.5 bg-amber-500'
                  : 'w-6 h-px bg-amber-500/50'
              }`}
            />

            {/* 年代テキスト（全マーカーに表示） */}
            <div className={`ml-1 md:ml-2 whitespace-nowrap ${
              marker.isMajor
                ? 'text-[10px] md:text-xs font-semibold text-amber-400'
                : 'text-[8px] md:text-[10px] text-amber-400/70'
            }`}>
              {formatYear(marker.year)}
            </div>
          </div>
        ))}

        {/* 縦線 */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-amber-500/20" />
      </div>
    </div>
  );
}
