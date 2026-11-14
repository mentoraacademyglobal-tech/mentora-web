/** Validate the link supplied by an academy manager; never return a URL to an unauthorised visitor. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
export function parseYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (VIDEO_ID.test(value)) return value;
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); }
  catch { return null; }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  let possible: string | null = null;
  if (host === 'youtu.be') possible = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] === 'watch') possible = url.searchParams.get('v');
    else if (['embed','shorts','live','v'].includes(segments[0])) possible = segments[1] ?? null;
  }
  return possible && VIDEO_ID.test(possible) ? possible : null;
}
