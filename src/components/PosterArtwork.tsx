import React, { useEffect, useMemo, useState } from 'react';
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

interface WikimediaPage {
  title?: string;
  index?: number;
  thumbnail?: {
    source?: string;
    width?: number;
    height?: number;
  };
}

const posterLookupCache = new Map<string, Promise<string | null>>();

function normalizeArticleTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(film|movie|series|the|a|an|of)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function lookupWikimediaPoster(title: string, year: number | string): Promise<string | null> {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return null;

  const cacheKey = cleanTitle.toLowerCase() + '|' + year;
  const cached = posterLookupCache.get(cacheKey);
  if (cached) return cached;

  const request = (async (): Promise<string | null> => {
    try {
      const params = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: cleanTitle + ' ' + year + ' film',
        gsrnamespace: '0',
        gsrlimit: '8',
        prop: 'pageimages',
        piprop: 'thumbnail',
        pithumbsize: '600',
        pilicense: 'any',
        format: 'json',
        origin: '*',
      });

      const response = await fetch('https://en.wikipedia.org/w/api.php?' + params.toString(), {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;

      const data = await response.json();
      const pages: WikimediaPage[] = Object.values(data?.query?.pages || {});
      if (pages.length === 0) return null;

      const expectedWords = normalizeArticleTitle(cleanTitle)
        .split(' ')
        .filter((word) => word.length > 1);
      if (expectedWords.length === 0) return null;

      const ranked = pages
        .filter((page) => typeof page.thumbnail?.source === 'string')
        .map((page) => {
          const articleTitle = normalizeArticleTitle(String(page.title || ''));
          const matchedWords = expectedWords.filter((word) => articleTitle.includes(word)).length;
          return {
            page,
            score: matchedWords / expectedWords.length,
            exact: articleTitle === normalizeArticleTitle(cleanTitle),
          };
        })
        .sort((a, b) => {
          if (a.exact !== b.exact) return a.exact ? -1 : 1;
          if (a.score !== b.score) return b.score - a.score;
          return Number(a.page.index || 0) - Number(b.page.index || 0);
        });

      // Reject unrelated pages rather than displaying an actor's or another film's image.
      const match = ranked.find((candidate) => candidate.exact || candidate.score >= 0.75);
      return match?.page.thumbnail?.source || null;
    } catch {
      // Poster metadata is optional; the local cinematic SVG remains available offline.
      return null;
    }
  })();

  posterLookupCache.set(cacheKey, request);
  return request;
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
  const [sourceFailed, setSourceFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [remotePoster, setRemotePoster] = useState<string | null>(null);

  const resolvedYear = year ?? releaseYear ?? 2024;
  const resolvedSrc = src || posterUrl || '';
  const isGeneratedPlaceholder =
    !resolvedSrc || resolvedSrc.startsWith('data:image/svg+xml');
  const shouldLookupRemotePoster = isGeneratedPlaceholder || sourceFailed;

  const dynamicSvgFallback = useMemo(() => {
    const [accent, secondary] = getGenrePalette(genres || []);
    const subtitle =
      genres && genres.length > 0 ? genres.slice(0, 2).join(' • ') : 'CINESHELF NEXUS';
    return buildCinematicPosterSvg(title || 'Untitled', subtitle, resolvedYear, accent, secondary);
  }, [title, resolvedYear, genres]);

  useEffect(() => {
    setSourceFailed(false);
    setFallbackFailed(false);
    setRemotePoster(null);
  }, [resolvedSrc, title]);

  useEffect(() => {
    if (!shouldLookupRemotePoster) {
      setRemotePoster(null);
      return;
    }

    let active = true;
    lookupWikimediaPoster(title, resolvedYear).then((poster) => {
      if (active && poster) setRemotePoster(poster);
    });

    return () => {
      active = false;
    };
  }, [title, resolvedYear, shouldLookupRemotePoster]);

  const effectiveSrc =
    remotePoster ||
    (isGeneratedPlaceholder || sourceFailed ? dynamicSvgFallback : resolvedSrc);

  if (fallbackFailed) {
    return (
      <div
        className={className + ' bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 text-center'}
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
    <div className={'relative overflow-hidden bg-slate-900 ' + className}>
      <img
        src={effectiveSrc}
        alt={title + ' (' + resolvedYear + ') poster'}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (remotePoster) {
            setRemotePoster(null);
            setFallbackFailed(true);
          } else if (!sourceFailed && !isGeneratedPlaceholder) {
            setSourceFailed(true);
          } else {
            setFallbackFailed(true);
          }
        }}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-60" />
    </div>
  );
};
