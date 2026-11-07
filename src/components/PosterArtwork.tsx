import React, { useMemo, useState } from 'react';
import { Film } from 'lucide-react';
import { buildCinematicPosterSvg, getGenrePalette } from '../utils/catalog';

interface PosterArtworkProps {
  src?: string;
  posterUrl?: string;
  title: string;
  year?: number | string;
  releaseYear?: number | string;
  genres?: string[];
  className?: string;
}

export const PosterArtwork: React.FC<PosterArtworkProps> = ({
  src,
  posterUrl,
  title,
  year,
  releaseYear,
  genres,
  className = 'w-full aspect-[2/3] rounded-xl object-cover',
}) => {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  const resolvedYear = year ?? releaseYear ?? 2024;
  const resolvedSrc = src || posterUrl || '';

  const dynamicSvgFallback = useMemo(() => {
    const [accent, secondary] = getGenrePalette(genres || []);
    const subtitle = genres && genres.length > 0 ? genres.slice(0, 2).join(' • ') : 'CINESHELF NEXUS';
    return buildCinematicPosterSvg(title || 'Untitled', subtitle, resolvedYear, accent, secondary);
  }, [title, resolvedYear, genres]);

  const effectiveSrc = !resolvedSrc || failed ? dynamicSvgFallback : resolvedSrc;

  if (fallbackFailed) {
    return (
      <div
        className={`${className} bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 text-center`}
      >
        <Film className="w-8 h-8 text-blue-500 mb-2" />
        <span className="text-xs font-semibold text-slate-200 line-clamp-2">{title}</span>
        {resolvedYear && (
          <span className="text-[11px] font-mono text-slate-400 mt-1">{resolvedYear}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-slate-900 ${className}`}>
      <img
        src={effectiveSrc}
        alt={`${title} poster`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          if (!failed) setFailed(true);
          else setFallbackFailed(true);
        }}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-60" />
    </div>
  );
};
