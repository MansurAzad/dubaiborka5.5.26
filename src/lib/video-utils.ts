/**
 * Utility functions for handling video URLs (YouTube, Vimeo, Facebook, direct MP4/WebM)
 */

export type VideoType = 'youtube' | 'vimeo' | 'facebook' | 'direct';

export function getVideoType(url: string): VideoType {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
  return 'direct';
}

export function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}

export function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] || null;
}

export function getEmbedUrl(url: string): string | null {
  const type = getVideoType(url);
  if (type === 'youtube') {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` : null;
  }
  if (type === 'vimeo') {
    const id = getVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
  }
  if (type === 'facebook') {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true`;
  }
  return null;
}

export function isEmbedVideo(url: string): boolean {
  return getVideoType(url) !== 'direct';
}
