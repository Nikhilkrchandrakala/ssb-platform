/**
 * Extracts the 11-character YouTube video ID from various YouTube URL formats.
 * Supports standard watch URLs, short URLs (youtu.be), embeds, and shorts.
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const clean = url.trim();

  // Pattern matches:
  // - youtube.com/watch?v=ID
  // - youtu.be/ID
  // - youtube.com/embed/ID
  // - youtube.com/v/ID
  // - youtube.com/shorts/ID
  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = clean.match(regExp);

  if (match && match[1]) {
    return match[1];
  }

  // If the user pasted just the 11-character ID directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Returns a privacy-enhanced YouTube embed URL (youtube-nocookie.com).
 */
export function getYouTubeEmbedUrl(videoId: string | null | undefined): string | null {
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}
